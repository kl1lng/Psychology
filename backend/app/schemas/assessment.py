from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnswerItem(BaseModel):
    question_id: int
    answer: int  # 0 or 1 for yes/no tests, 1-5 for Likert


class AssessmentSubmit(BaseModel):
    test_id: str = Field(..., description="Test identifier, e.g. 'eysenck_epi_a'")
    answers: List[AnswerItem]
    student_id: Optional[str] = None  # None for guest


class ScaleResult(BaseModel):
    scale_name: Any
    raw_score: int
    max_score: int
    percentage: float
    interpretation: Any


class QuestionResponseBase(BaseModel):
    question_id: str = Field(..., description="Идентификатор вопроса")
    selected_option: str = Field(..., description="Выбранный вариант ответа: 'A', 'B', 'Да', 'Нет' или текст")
    score: int = Field(0, description="Количество баллов за данный ответ")


class QuestionResponseCreate(QuestionResponseBase):
    test_result_id: Optional[str] = None


class QuestionResponseOut(QuestionResponseBase):
    id: str
    test_result_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssessmentResult(BaseModel):
    id: str
    test_id: str
    test_name: Any
    student_id: Optional[str]
    scales: List[ScaleResult]
    overall_risk: RiskLevel
    reward_points: int
    created_at: datetime
    message: Any
    question_responses: Optional[List[QuestionResponseOut]] = None


class TestQuestion(BaseModel):
    id: int
    text: str
    options: List[Dict[str, Any]]


class TestInfo(BaseModel):
    id: str
    title: str
    description: str
    estimated_minutes: int
    question_count: int
    questions: Optional[List[TestQuestion]] = None


class AssessmentListItem(BaseModel):
    id: str
    title: str
    description: str
    estimated_minutes: int
    question_count: int
