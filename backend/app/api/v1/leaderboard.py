from fastapi import APIRouter, Query, Depends

from app.core.supabase import get_supabase
from app.core.security import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/")
async def get_leaderboard(limit: int = Query(50, ge=1, le=100), _auth: dict = Depends(get_current_user)):
    """Top students by points_balance."""
    sb = get_supabase()

    result = (
        sb.table("users")
        .select("id, full_name, class_id, points_balance")
        .eq("role", "student")
        .order("points_balance", desc=True)
        .limit(limit)
        .execute()
    )

    leaderboard = []
    for rank, user in enumerate(result.data or [], start=1):
        leaderboard.append({
            "rank": rank,
            "student_id": user["id"],
            "full_name": user["full_name"],
            "class_id": user.get("class_id", "—"),
            "points_balance": user.get("points_balance", 0),
            "medal": "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else None,
        })

    return {
        "leaderboard": leaderboard,
        "total": len(leaderboard),
    }
