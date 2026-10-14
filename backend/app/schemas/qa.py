from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=2000)
    category: str = Field(..., description="Учеба, Стресс, Отношения, Профориентация, Буллинг")
    student_id: Optional[str] = None


class QuestionAnswer(BaseModel):
    answer: str = Field(..., min_length=5, max_length=3000)
    is_published: bool = True
    psychologist_id: Optional[str] = None


class QAQuestionOut(BaseModel):
    id: str
    student_id: str
    title: str
    content: str
    category: str
    answer: Optional[str] = None
    psychologist_id: Optional[str] = None
    is_published: bool = False
    likes_count: int = 0
    created_at: datetime
    answered_at: Optional[datetime] = None


class QAListResponse(BaseModel):
    items: List[QAQuestionOut]
    total: int
