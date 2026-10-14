import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Cookie, status

from app.core.security import decode_token
from app.core.supabase import get_supabase
from app.schemas.mood import MoodEntry, MoodEntryOut, MoodStats
from app.services.mood_analytics import compute_mood_stats

logger = logging.getLogger("aisezim.mood")
router = APIRouter(prefix="/mood", tags=["Mood"])

# Fallback anonymous user UUID for unauthenticated/guest entries
ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# ─── Save mood entry ──────────────────────────────────────────────────────────
@router.post("/entry", response_model=MoodEntryOut, status_code=status.HTTP_201_CREATED)
async def create_mood_entry(
    payload: MoodEntry,
    access_token: Optional[str] = Cookie(None),
):
    # Validate payload stress level
    if payload.stress_level is None or not (1 <= payload.stress_level <= 10):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Уровень стресса должен быть числом от 1 до 10",
        )

    # Determine student_id from payload or JWT cookie
    student_id = payload.student_id
    if not student_id and access_token:
        token_data = decode_token(access_token)
        if token_data:
            student_id = token_data.get("sub")

    # If student_id is missing or not a valid UUID (e.g. 'guest_...' or 'anonymous'), use anonymous UUID
    if not student_id or not _is_valid_uuid(student_id):
        student_id = ANONYMOUS_USER_ID

    entry_id = str(uuid.uuid4())
    now = datetime.utcnow()

    sb = get_supabase()
    try:
        sb.table("mood_entries").insert({
            "id": entry_id,
            "student_id": student_id,
            "stress_level": int(payload.stress_level),
            "note": payload.note.strip() if payload.note else None,
            "created_at": now.isoformat(),
        }).execute()
    except Exception as e:
        err_msg = str(e)
        logger.warning(f"Error saving mood entry for {student_id}: {err_msg}")
        
        # Handle foreign key violation if user was deleted or not found
        if "foreign key" in err_msg.lower() or "23503" in err_msg:
            try:
                sb.table("mood_entries").insert({
                    "id": entry_id,
                    "student_id": ANONYMOUS_USER_ID,
                    "stress_level": int(payload.stress_level),
                    "note": payload.note.strip() if payload.note else None,
                    "created_at": now.isoformat(),
                }).execute()
                student_id = ANONYMOUS_USER_ID
            except Exception as e2:
                logger.error(f"Fallback insert failed: {str(e2)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Не удалось связать запись настроения с профилем пользователя.",
                )
        elif "22p02" in err_msg.lower() or "invalid input syntax" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Некорректный формат данных для сохранения записи настроения.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка базы данных при сохранении: {err_msg}",
            )

    return MoodEntryOut(
        id=entry_id,
        student_id=student_id,
        stress_level=payload.stress_level,
        note=payload.note,
        created_at=now,
    )


# ─── Get mood stats ───────────────────────────────────────────────────────────
@router.get("/stats", response_model=MoodStats)
async def get_mood_stats(
    student_id: Optional[str] = None,
    days: int = 30,
    access_token: Optional[str] = Cookie(None),
):
    if not student_id and access_token:
        token_data = decode_token(access_token)
        if token_data:
            student_id = token_data.get("sub")

    # If student is unauthenticated or has invalid UUID, return safe empty stats
    if not student_id or not _is_valid_uuid(student_id):
        return compute_mood_stats([])

    sb = get_supabase()
    try:
        result = (
            sb.table("mood_entries")
            .select("stress_level, created_at")
            .eq("student_id", student_id)
            .order("created_at", desc=False)
            .limit(max(days * 3, 100))
            .execute()
        )
        entries = result.data or []
    except Exception as e:
        logger.warning(f"Error fetching mood stats for {student_id}: {str(e)}")
        return compute_mood_stats([])

    return compute_mood_stats(entries)

