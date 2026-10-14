from fastapi import APIRouter

from app.api.v1 import (
    auth,
    users,
    assessments,
    mood,
    chat,
    appointments,
    analytics,
    podcasts,
    leaderboard,
    admin,
    qa,
    departments,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(admin.router)
api_router.include_router(departments.router)
api_router.include_router(assessments.router)
api_router.include_router(mood.router)
api_router.include_router(chat.router)
api_router.include_router(appointments.router)
api_router.include_router(analytics.router)
api_router.include_router(podcasts.router)
api_router.include_router(leaderboard.router)
api_router.include_router(qa.router)


