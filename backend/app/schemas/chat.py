from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class DialogStatus(str, Enum):
    BOT = "BOT"
    WAITING_PSYCHOLOGIST = "WAITING_PSYCHOLOGIST"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class SenderRole(str, Enum):
    STUDENT = "STUDENT"
    BOT = "BOT"
    PSYCHOLOGIST = "PSYCHOLOGIST"


class SendMessage(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    student_id: Optional[str] = None


class ChatMessage(BaseModel):
    id: str
    dialog_id: str
    sender_role: SenderRole
    content: str
    created_at: datetime


class DialogOut(BaseModel):
    id: str
    student_id: str
    status: DialogStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    student_name: Optional[str] = None
    is_anonymous: Optional[bool] = False
    messages: Optional[List[ChatMessage]] = None



class CallPsychologistRequest(BaseModel):
    student_id: Optional[str] = None


class CallPsychologistResponse(BaseModel):
    dialog_id: str
    status: DialogStatus
    message: str = "Запрос психологу отправлен. Ожидайте ответа."


class ReplyMessage(BaseModel):
    dialog_id: str
    content: str = Field(..., min_length=1, max_length=2000)

