from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MoodEntry(BaseModel):
    stress_level: int = Field(..., ge=1, le=10, description="Stress level from 1 (very low) to 10 (very high)")
    student_id: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)


class MoodEntryOut(BaseModel):
    id: str
    student_id: str
    stress_level: int
    note: Optional[str]
    created_at: datetime


class DailyStress(BaseModel):
    date: str  # ISO date string
    avg_stress: float
    entries_count: int


class WeekdayStats(BaseModel):
    weekday: str  # Monday, Tuesday, ...
    weekday_num: int  # 0=Mon, 6=Sun
    avg_stress: float
    entries_count: int


class MoodStats(BaseModel):
    daily_trend: List[DailyStress]
    weekday_stats: List[WeekdayStats]
    easiest_day: str
    easiest_day_avg: float
    overall_avg: float
    total_entries: int
