import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, status

from app.core.security import get_current_user, get_current_psychologist
from app.core.database import get_database
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.schemas.chat import DialogStatus, SenderRole
from app.services.alerts import notify_emergency

logger = logging.getLogger("aisezim.appointments")
router = APIRouter(prefix="/appointments", tags=["Appointments"])

# In-memory fallback in case the database table hasn't been migrated yet
_IN_MEMORY_APPOINTMENTS: List[dict] = []


@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    payload: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Book an appointment with the school psychologist.
    Creates an appointment record and updates the active chat dialog to WAITING_PSYCHOLOGIST.
    """
    # 1. Resolve student_id
    if current_user.get("role") not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Записаться к психологу могут только ученики")
    # Keep guest session IDs intact so this appointment can link to that guest's
    # chat dialog. The column is TEXT and must not collapse guests to one sentinel.
    student_id = current_user["sub"]
    if payload.student_id and payload.student_id != student_id:
        raise HTTPException(status_code=403, detail="Нельзя создать запись от имени другого пользователя")

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

    sb = get_database()

    # 3. Save to the local appointments table, with graceful process-memory fallback.
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
        logger.warning("Local appointments insert failed; storing in process memory")
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
    _auth: dict = Depends(get_current_psychologist),
):
    """List appointments for psychologist dashboard."""
    sb = get_database()
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
