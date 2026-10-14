from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    student_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    preferred_time: Optional[str] = None
    source: Optional[str] = "chat"
    lang: Optional[str] = "ru"


class AppointmentResponse(BaseModel):
    success: bool = True
    appointment_id: str
    message: str
    status: str = "pending"
    created_at: datetime
