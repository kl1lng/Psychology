import logging
import uuid
from datetime import datetime, timedelta, time, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status, Depends

from app.core.security import get_current_user
from app.core.database import get_database
from app.schemas.mood import MoodEntry, MoodEntryOut, MoodStats
from app.services.mood_analytics import compute_mood_stats

logger = logging.getLogger("aisezim.mood")
router = APIRouter(prefix="/mood", tags=["Mood"])

# ─── Save mood entry ──────────────────────────────────────────────────────────
@router.post("/entry", response_model=MoodEntryOut, status_code=status.HTTP_201_CREATED)
async def create_mood_entry(
    payload: MoodEntry,
    current_user: dict = Depends(get_current_user),
):
    # Validate payload stress level
    if payload.stress_level is None or not (1 <= payload.stress_level <= 10):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Уровень стресса должен быть числом от 1 до 10",
        )

    role = current_user.get("role")
    if role not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Отмечать стресс могут только ученик или гость")
    student_id = current_user["sub"]
    if payload.student_id and payload.student_id != student_id:
        raise HTTPException(status_code=403, detail="Нельзя сохранить отметку для другого пользователя")

    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    sb = get_database()
    try:
        mood_record = {
            "id": entry_id,
            "student_id": student_id,
            "stress_level": int(payload.stress_level),
            "note": payload.note.strip() if payload.note else None,
            "created_at": now.isoformat(),
        }
        if payload.emotion:
            mood_record["emotion"] = payload.emotion
        sb.table("mood_entries").insert(mood_record).execute()
    except Exception as e:
        err_msg = str(e)
        logger.warning("Mood entry write failed")
        
        if "22p02" in err_msg.lower() or "invalid input syntax" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Некорректный формат данных для сохранения записи настроения.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Не удалось сохранить отметку. Повторите попытку позже.",
            )

    return MoodEntryOut(
        id=entry_id,
        student_id=student_id,
        stress_level=payload.stress_level,
        note=payload.note,
        emotion=payload.emotion,
        created_at=now,
    )


# ─── Get mood stats ───────────────────────────────────────────────────────────
@router.get("/stats", response_model=MoodStats)
async def get_mood_stats(
    student_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role")
    if role not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Статистика настроения доступна ученику или гостю")
    subject = current_user["sub"]
    if student_id and student_id != subject:
        raise HTTPException(status_code=403, detail="Нельзя просматривать статистику другого пользователя")

    first_day = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    cutoff = datetime.combine(first_day, time.min, tzinfo=timezone.utc).isoformat()

    sb = get_database()
    try:
        entries = []
        try:
            mood_columns = "stress_level, emotion, created_at"
            sb.table("mood_entries").select("emotion").limit(1).execute()
        except Exception:
            mood_columns = "stress_level, created_at"
        offset = 0
        while True:
            result = (
                sb.table("mood_entries")
                .select(mood_columns)
                .eq("student_id", subject)
                .gte("created_at", cutoff)
                .order("created_at", desc=False)
                .range(offset, offset + 999)
                .execute()
            )
            rows = result.data or []
            entries.extend(rows)
            if len(rows) < 1000:
                break
            offset += len(rows)
    except Exception:
        logger.warning("Mood statistics read failed")
        raise HTTPException(status_code=503, detail="Не удалось загрузить статистику. Повторите попытку позже.")

    return compute_mood_stats(entries)

