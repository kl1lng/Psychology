import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Cookie, status

from app.core.security import decode_token
from app.core.supabase import get_supabase
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.schemas.chat import DialogStatus, SenderRole
from app.services.alerts import notify_emergency

logger = logging.getLogger("aisezim.appointments")
router = APIRouter(prefix="/appointments", tags=["Appointments"])

ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# In-memory fallback in case the database table hasn't been migrated yet
_IN_MEMORY_APPOINTMENTS: List[dict] = []


@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: AppointmentCreate,
    access_token: Optional[str] = Cookie(None),
):
    """
    Book an appointment with the school psychologist.
    Creates an appointment record and updates the active chat dialog to WAITING_PSYCHOLOGIST.
    """
    # 1. Resolve student_id
    student_id = payload.student_id
    if not student_id and access_token:
        token_data = decode_token(access_token)
        if token_data:
            student_id = token_data.get("sub")

    if not student_id or not _is_valid_uuid(student_id):
        student_id = ANONYMOUS_USER_ID

    appointment_id = str(uuid.uuid4())
    now = datetime.utcnow()
    now_iso = now.isoformat()

    # 2. Choose localized confirmation message
    lang = payload.lang or "ru"
    if lang == "kk":
        confirmation_msg = (
            "Керемет! Кездесу сұранысы жіберілді. "
            "Психолог жақында саған уақыт пен кабинет нөмірін хабарлайды. "
            "Оған дейін өзіңе күтім жасауды ұмытпа 🤍"
        )
    else:
        confirmation_msg = (
            "Отлично! Заявка отправлена. "
            "Психолог скоро подтвердит время и номер кабинета. "
            "До тех пор постарайся позаботиться о себе 🤍"
        )

    sb = get_supabase()

    # 3. Save into Supabase 'appointments' table if available, with graceful fallback
    try:
        sb.table("appointments").insert({
            "id": appointment_id,
            "student_id": student_id,
            "notes": payload.notes or "Запись через чат AISezim",
            "preferred_time": payload.preferred_time or "Как можно скорее",
            "status": "pending",
            "source": payload.source or "chat",
            "created_at": now_iso,
            "updated_at": now_iso,
        }).execute()
    except Exception as e:
        logger.info(f"Supabase appointments insert notice: {str(e)}. Storing in fallback.")
        _IN_MEMORY_APPOINTMENTS.append({
            "id": appointment_id,
            "student_id": student_id,
            "notes": payload.notes,
            "preferred_time": payload.preferred_time,
            "status": "pending",
            "source": payload.source,
            "created_at": now_iso,
        })

    # 4. Connect with dialogs & notify psychologist in real time
    try:
        dialog_res = (
            sb.table("dialogs")
            .select("*")
            .eq("student_id", student_id)
            .neq("status", DialogStatus.CLOSED.value)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if dialog_res.data:
            dialog_id = dialog_res.data[0]["id"]
            sb.table("dialogs").update({
                "status": DialogStatus.WAITING_PSYCHOLOGIST.value,
                "updated_at": now_iso,
            }).eq("id", dialog_id).execute()

            # Save confirmation message in chat history
            msg_id = str(uuid.uuid4())
            sb.table("chat_messages").insert({
                "id": msg_id,
                "dialog_id": dialog_id,
                "sender_role": SenderRole.BOT.value,
                "content": confirmation_msg,
                "created_at": now_iso,
            }).execute()

        # Trigger emergency / psychologist notification
        await notify_emergency(
            "APPOINTMENT_REQUESTED",
            {
                "appointment_id": appointment_id,
                "student_id": student_id,
                "notes": payload.notes,
            },
        )
    except Exception as e:
        logger.warning(f"Dialog linkage notice: {str(e)}")

    return AppointmentResponse(
        success=True,
        appointment_id=appointment_id,
        message=confirmation_msg,
        status="pending",
        created_at=now,
    )


@router.get("/", response_model=List[dict])
async def list_appointments(
    status_filter: Optional[str] = None,
    access_token: Optional[str] = Cookie(None),
):
    """List appointments for psychologist dashboard."""
    sb = get_supabase()
    try:
        query = sb.table("appointments").select("*").order("created_at", desc=True)
        if status_filter:
            query = query.eq("status", status_filter)
        res = query.execute()
        return res.data or []
    except Exception:
        if status_filter:
            return [a for a in _IN_MEMORY_APPOINTMENTS if a["status"] == status_filter]
        return _IN_MEMORY_APPOINTMENTS
