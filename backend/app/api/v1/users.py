import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase

router = APIRouter(prefix="/users", tags=["Users"])

ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


@router.get("/{user_id}")
async def get_user_profile(user_id: str):
    """
    Get user profile by ID.
    If user_id is the anonymous user (00000000-0000-0000-0000-000000000000 or 'anonymous'),
    bypasses DB query and directly returns a 200 OK mock anonymous profile.
    """
    if user_id == ANONYMOUS_USER_ID or user_id == "anonymous":
        return {
            "id": ANONYMOUS_USER_ID,
            "full_name": "Анонимді оқушы",
            "email": "anonymous@school.local",
            "role": "student",
            "class_id": "—",
            "department_id": None,
            "points_balance": 0,
            "is_anonymous": True,
        }

    sb = get_supabase()
    try:
        res = (
            sb.table("users")
            .select("id, email, full_name, role, class_id, department_id, points_balance, created_at")
            .eq("id", user_id)
            .execute()
        )
        if res.data:
            user = res.data[0]
            user["is_anonymous"] = False
            return user
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Пользователь не найден")
