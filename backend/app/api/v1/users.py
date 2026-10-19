import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends

from app.core.database import get_database
from app.core.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


@router.get("/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get user profile by ID.
    If user_id is the anonymous user (00000000-0000-0000-0000-000000000000 or 'anonymous'),
    bypasses DB query and directly returns a 200 OK mock anonymous profile.
    """
    role = current_user.get("role")
    is_staff = role in ("admin", "psychologist")
    if user_id not in (current_user.get("sub"), ANONYMOUS_USER_ID, "anonymous") and not is_staff:
        raise HTTPException(status_code=403, detail="Недостаточно прав для просмотра профиля")

    if user_id in (ANONYMOUS_USER_ID, "anonymous"):
        if role not in ("guest", "admin", "psychologist"):
            raise HTTPException(status_code=403, detail="Недостаточно прав для просмотра профиля")
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

    sb = get_database()
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
