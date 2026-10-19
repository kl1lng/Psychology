import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional, List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_psychologist, get_current_user
from app.core.database import get_database
from app.schemas.chat import (
    SendMessage,
    ChatMessage,
    DialogOut,
    DialogStatus,
    SenderRole,
    CallPsychologistRequest,
    CallPsychologistResponse,
    ReplyMessage,
)
from app.services.bot_operator import process_chat_message
from app.services.alerts import notify_emergency

router = APIRouter(prefix="/chat", tags=["Chat"])


ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000"


def _is_valid_uuid(val: Optional[str]) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _get_or_create_dialog(sb, student_id: str) -> dict:
    """Get active dialog or create a new one."""
    try:
        existing = (
            sb.table("dialogs")
            .select("*")
            .eq("student_id", student_id)
            .neq("status", DialogStatus.CLOSED.value)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось загрузить историю чата. Повторите попытку.") from exc

    dialog_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    new_dialog = {
        "id": dialog_id,
        "student_id": student_id,
        "status": DialogStatus.BOT.value,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    try:
        result = sb.table("dialogs").insert(new_dialog).execute()
        if result.data:
            return result.data[0]
        return new_dialog
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось создать историю чата. Повторите попытку.") from exc


def _save_message(sb, dialog_id: str, sender_role: SenderRole, content: str) -> dict:
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    msg = {
        "id": msg_id,
        "dialog_id": dialog_id,
        "sender_role": sender_role.value,
        "content": content,
        "created_at": now,
    }
    try:
        sb.table("chat_messages").insert(msg).execute()
        sb.table("dialogs").update({"updated_at": now}).eq("id", dialog_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось сохранить сообщение. Повторите попытку.") from exc
    return msg


# ─── Send message ─────────────────────────────────────────────────────────────
@router.post("/message")
async def send_message(
    payload: SendMessage,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Чат доступен ученикам")
    student_id = current_user["sub"]

    sb = get_database()
    dialog = _get_or_create_dialog(sb, student_id)
    dialog_id = dialog["id"]
    current_status = dialog["status"]

    # Save student message
    _save_message(sb, dialog_id, SenderRole.STUDENT, payload.content)

    # Process message through AISezim router (Level 1 Red Flags, Level 2/3 Soft Escalation, Box Breathing, FAQ)
    bot_result = process_chat_message(payload.content)
    bot_reply = bot_result["reply"]
    is_crisis = bot_result.get("is_crisis", False)
    suggest_appointment = bot_result.get("suggest_appointment", False)
    quick_actions = bot_result.get("quick_actions", [])

    if is_crisis:
        current_status = DialogStatus.WAITING_PSYCHOLOGIST.value
        try:
            sb.table("dialogs").update(
                {"status": DialogStatus.WAITING_PSYCHOLOGIST.value, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", dialog_id).execute()
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Не удалось сохранить запрос психологу. Повторите попытку.") from exc

        # Trigger emergency alert for school psychologist
        await notify_emergency(
            "CRISIS_RED_FLAG_DETECTED",
            {
                "dialog_id": dialog_id,
                "student_id": student_id,
                "content": payload.content,
            },
        )

    # Save bot response
    _save_message(sb, dialog_id, SenderRole.BOT, bot_reply)

    return {
        "dialog_id": dialog_id,
        "status": current_status,
        "reply": bot_reply,
        "is_crisis": is_crisis,
        "suggest_appointment": suggest_appointment,
        "quick_actions": quick_actions,
    }


# ─── Psychologist reply to student ───────────────────────────────────────────
@router.post("/reply", response_model=ChatMessage)
async def reply_message(
    payload: ReplyMessage,
    _: dict = Depends(get_current_psychologist),
):
    """Psychologist responds to an open student dialog."""
    sb = get_database()

    dialog_result = (
        sb.table("dialogs")
        .select("id")
        .eq("id", payload.dialog_id)
        .limit(1)
        .execute()
    )
    if not dialog_result.data:
        raise HTTPException(status_code=404, detail="Диалог не найден")

    # Save message as PSYCHOLOGIST
    saved_msg = _save_message(sb, payload.dialog_id, SenderRole.PSYCHOLOGIST, payload.content)

    # Update dialog status to ACTIVE
    try:
        sb.table("dialogs").update(
            {"status": DialogStatus.ACTIVE.value, "updated_at": datetime.utcnow().isoformat()}
        ).eq("id", payload.dialog_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось обновить статус чата. Повторите попытку.") from exc

    return ChatMessage(
        id=saved_msg["id"],
        dialog_id=saved_msg["dialog_id"],
        sender_role=SenderRole(saved_msg["sender_role"]),
        content=saved_msg["content"],
        created_at=saved_msg["created_at"],
    )


# ─── Call psychologist ────────────────────────────────────────────────────────
@router.post("/call-psychologist", response_model=CallPsychologistResponse)
async def call_psychologist(
    payload: CallPsychologistRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Запрос психологу доступен ученикам")
    student_id = current_user["sub"]

    sb = get_database()
    dialog = _get_or_create_dialog(sb, student_id)
    dialog_id = dialog["id"]

    # Update dialog status
    try:
        sb.table("dialogs").update(
            {"status": DialogStatus.WAITING_PSYCHOLOGIST.value, "updated_at": datetime.utcnow().isoformat()}
        ).eq("id", dialog_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось сохранить запрос психологу. Повторите попытку.") from exc

    # Trigger emergency notification
    await notify_emergency(
        "WAITING_PSYCHOLOGIST",
        {
            "dialog_id": dialog_id,
            "student_id": student_id,
        },
    )

    # Save system message
    _save_message(
        sb,
        dialog_id,
        SenderRole.BOT,
        "Запрос психологу отправлен. Специалист подключится в ближайшее время. Пожалуйста, ожидайте.",
    )

    return CallPsychologistResponse(
        dialog_id=dialog_id,
        status=DialogStatus.WAITING_PSYCHOLOGIST,
    )


# ─── Get messages by dialog_id (strictly by dialog_id without users join) ──────
@router.get("/dialog/{dialog_id}/messages", response_model=List[ChatMessage])
@router.get("/messages/{dialog_id}", response_model=List[ChatMessage])
async def get_dialog_messages(
    dialog_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get all messages for a specific dialog strictly by dialog_id.
    Checks JWT ownership without requiring a users-table join.
    """
    sb = get_database()
    role = current_user.get("role")
    if role not in ("psychologist", "admin"):
        dialog_result = (
            sb.table("dialogs")
            .select("student_id")
            .eq("id", dialog_id)
            .limit(1)
            .execute()
        )
        if not dialog_result.data:
            return []
        if dialog_result.data[0].get("student_id") != current_user.get("sub"):
            raise HTTPException(status_code=403, detail="Нет доступа к этому диалогу")

    try:
        messages_result = (
            sb.table("chat_messages")
            .select("*")
            .eq("dialog_id", dialog_id)
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось загрузить сообщения. Повторите попытку.") from exc

    return [
        ChatMessage(
            id=m["id"],
            dialog_id=m["dialog_id"],
            sender_role=SenderRole(m["sender_role"]),
            content=m["content"],
            created_at=m["created_at"],
        )
        for m in (messages_result.data or [])
    ]


# ─── Get chat history ─────────────────────────────────────────────────────────
@router.get("/history/{identifier}", response_model=DialogOut)
async def get_chat_history(
    identifier: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get chat history by either student_id or dialog_id.
    Always returns the complete array of messages.
    """
    sb = get_database()
    dialog = None
    role = current_user.get("role")
    is_psychologist = role in ("psychologist", "admin")
    subject = current_user["sub"]

    if not is_psychologist and identifier != subject and not _is_valid_uuid(identifier):
        raise HTTPException(status_code=403, detail="Нет доступа к этой переписке")

    # Students and guests can look up only their own student_id or dialog id.
    if not is_psychologist and identifier == subject:
        try:
            d_res = (
                sb.table("dialogs")
                .select("*")
                .eq("student_id", subject)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if d_res.data:
                dialog = d_res.data[0]
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Не удалось загрузить историю чата. Повторите попытку.") from exc
    else:
        # Psychologists/admins may look up any dialog; students may supply a dialog id
        # only, which is checked against their token subject below.
        try:
            d_res = sb.table("dialogs").select("*").eq("id", identifier).limit(1).execute()
            if d_res.data:
                dialog = d_res.data[0]
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Не удалось загрузить историю чата. Повторите попытку.") from exc

        if dialog and not is_psychologist and dialog.get("student_id") != subject:
            raise HTTPException(status_code=403, detail="Нет доступа к этой переписке")

        if not dialog and is_psychologist:
            try:
                d_res = (
                    sb.table("dialogs")
                    .select("*")
                    .eq("student_id", identifier if _is_valid_uuid(identifier) else ANONYMOUS_USER_ID)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                if d_res.data:
                    dialog = d_res.data[0]
            except Exception as exc:
                raise HTTPException(status_code=503, detail="Не удалось загрузить историю чата. Повторите попытку.") from exc

    if not dialog:
        # Fallback dummy dialog if none found
        dialog_id = identifier if _is_valid_uuid(identifier) else str(uuid.uuid4())
        return DialogOut(
            id=dialog_id,
            student_id=subject if not is_psychologist else ANONYMOUS_USER_ID,
            status=DialogStatus.BOT,
            student_name="Анонимді оқушы" if not is_psychologist or subject == ANONYMOUS_USER_ID else None,
            is_anonymous=role == "guest" or (is_psychologist and subject == ANONYMOUS_USER_ID),
            created_at=datetime.utcnow(),
            messages=[],
        )

    try:
        messages_result = (
            sb.table("chat_messages")
            .select("*")
            .eq("dialog_id", dialog["id"])
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось загрузить сообщения. Повторите попытку.") from exc

    messages = [
        ChatMessage(
            id=m["id"],
            dialog_id=m["dialog_id"],
            sender_role=SenderRole(m["sender_role"]),
            content=m["content"],
            created_at=m["created_at"],
        )
        for m in (messages_result.data or [])
    ]

    is_anon = dialog["student_id"] == ANONYMOUS_USER_ID
    student_name = "Анонимді оқушы" if is_anon else None
    if not is_anon and not student_name:
        try:
            u_res = sb.table("users").select("full_name").eq("id", dialog["student_id"]).execute()
            if u_res.data:
                student_name = u_res.data[0].get("full_name")
        except Exception:
            pass

    return DialogOut(
        id=dialog["id"],
        student_id=dialog["student_id"],
        status=DialogStatus(dialog["status"]),
        student_name=student_name or ("Анонимді оқушы" if is_anon else dialog["student_id"]),
        is_anonymous=is_anon,
        created_at=dialog["created_at"],
        messages=messages,
    )


# ─── List dialogs waiting for psychologist ────────────────────────────────────
@router.get("/waiting", response_model=List[DialogOut])
async def get_waiting_dialogs(
    _: dict = Depends(get_current_psychologist),
):
    sb = get_database()
    result = (
        sb.table("dialogs")
        .select("*")
        .eq("status", DialogStatus.WAITING_PSYCHOLOGIST.value)
        .order("updated_at", desc=True)
        .execute()
    )
    dialog_list = result.data or []

    # Batch lookup user names
    student_ids = [d["student_id"] for d in dialog_list if d["student_id"] != ANONYMOUS_USER_ID]
    user_names = {}
    if student_ids:
        try:
            u_res = sb.table("users").select("id, full_name").in_("id", student_ids).execute()
            for u in (u_res.data or []):
                user_names[u["id"]] = u["full_name"]
        except Exception:
            pass

    return [
        DialogOut(
            id=d["id"],
            student_id=d["student_id"],
            status=DialogStatus(d["status"]),
            student_name=(
                "Анонимді оқушы"
                if d["student_id"] == ANONYMOUS_USER_ID
                else user_names.get(d["student_id"], d["student_id"])
            ),
            is_anonymous=(d["student_id"] == ANONYMOUS_USER_ID),
            created_at=d["created_at"],
        )
        for d in dialog_list
    ]


@router.get("/archive", response_model=List[DialogOut])
async def search_chat_archive(
    from_date: Optional[date] = Query(default=None, alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    student_id: Optional[str] = None,
    status: Optional[DialogStatus] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_psychologist),
):
    """Search saved chat records by date, student identifier, and status."""
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=422, detail="Начальная дата не может быть позже конечной")

    sb = get_database()
    query = sb.table("dialogs").select("*").order("updated_at", desc=True).range(offset, offset + limit - 1)
    oral_tz = ZoneInfo("Asia/Oral")
    if from_date:
        lower_bound = datetime.combine(from_date, time.min, tzinfo=oral_tz).astimezone(timezone.utc)
        query = query.gte("updated_at", lower_bound.isoformat())
    if to_date:
        upper_bound = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=oral_tz).astimezone(timezone.utc)
        query = query.lt(
            "updated_at",
            upper_bound.isoformat(),
        )
    if student_id:
        query = query.eq("student_id", student_id.strip())
    if status:
        query = query.eq("status", status.value)

    try:
        dialogs = query.execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Не удалось загрузить архив чатов. Повторите попытку.") from exc

    student_ids = list({dialog["student_id"] for dialog in dialogs if dialog.get("student_id") != ANONYMOUS_USER_ID})
    user_names = {}
    if student_ids:
        try:
            users = sb.table("users").select("id, full_name").in_("id", student_ids).execute()
            user_names = {user["id"]: user.get("full_name") for user in (users.data or [])}
        except Exception:
            # The archived conversation remains available by its student identifier.
            pass

    return [
        DialogOut(
            id=dialog["id"],
            student_id=dialog["student_id"],
            status=DialogStatus(dialog["status"]),
            created_at=dialog["created_at"],
            updated_at=dialog.get("updated_at"),
            student_name=("Анонимді оқушы" if dialog["student_id"] == ANONYMOUS_USER_ID else user_names.get(dialog["student_id"], dialog["student_id"])),
            is_anonymous=dialog["student_id"] == ANONYMOUS_USER_ID,
        )
        for dialog in dialogs
    ]

