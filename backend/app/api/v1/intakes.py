"""Psychologist visit register with reminders for missing paper signatures."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import get_current_psychologist
from app.core.database import get_database

logger = logging.getLogger("aisezim.intakes")
router = APIRouter(prefix="/intakes", tags=["Intakes"])


class IntakeCreate(BaseModel):
    student_id: str
    curator_name: str = Field(min_length=2, max_length=160)
    paper_signed: bool = False
    note: str = Field(default="", max_length=1000)


@router.get("/students")
async def students(_: dict = Depends(get_current_psychologist)):
    try:
        result = get_database().table("users").select("id, full_name, class_id").eq("role", "student").order("full_name").limit(1000).execute()
        return result.data or []
    except Exception as exc:
        logger.warning("Could not load students for visit register: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Не удалось загрузить список учеников")


@router.get("/")
async def list_intakes(_: dict = Depends(get_current_psychologist)):
    try:
        result = get_database().table("psychologist_intakes").select("*, users!psychologist_intakes_student_id_fkey(full_name, class_id)").order("created_at", desc=True).limit(500).execute()
        return result.data or []
    except Exception as exc:
        logger.warning("Could not load visit register: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Не удалось загрузить журнал приёмов")


@router.post("/", status_code=201)
async def create_intake(payload: IntakeCreate, auth: dict = Depends(get_current_psychologist)):
    try:
        student = get_database().table("users").select("id").eq("id", payload.student_id).eq("role", "student").limit(1).execute()
    except Exception as exc:
        logger.warning("Could not validate visit student: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Не удалось проверить ученика")
    if not student.data:
        raise HTTPException(status_code=404, detail="Ученик не найден")
    record = {"id": str(uuid.uuid4()), "student_id": payload.student_id, "curator_name": payload.curator_name.strip(), "paper_signed": payload.paper_signed, "note": payload.note.strip() or None, "created_by": auth["sub"], "created_at": datetime.now(timezone.utc).isoformat(), "signed_at": datetime.now(timezone.utc).isoformat() if payload.paper_signed else None}
    try:
        result = get_database().table("psychologist_intakes").insert(record).execute()
        return (result.data or [record])[0]
    except Exception as exc:
        logger.warning("Could not save visit record: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Не удалось сохранить запись. Проверьте, применена ли локальная схема базы данных.")


@router.patch("/{intake_id}/signature")
async def update_signature(intake_id: str, payload: Dict[str, Any], _: dict = Depends(get_current_psychologist)):
    signed = bool(payload.get("paper_signed"))
    try:
        result = get_database().table("psychologist_intakes").update({"paper_signed": signed, "signed_at": datetime.now(timezone.utc).isoformat() if signed else None}).eq("id", intake_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Запись приёма не найдена")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Could not update visit signature: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Не удалось обновить отметку о подписи")
