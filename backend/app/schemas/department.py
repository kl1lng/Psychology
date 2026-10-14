from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Название кафедры, например: 'Математика, Информатика, Физика'")
    code: str = Field(..., min_length=2, max_length=50, description="Уникальный код кафедры, например: 'MIPH2026'")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    code: Optional[str] = Field(None, min_length=2, max_length=50)


class DepartmentOut(DepartmentBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepartmentWithTeachers(DepartmentOut):
    teachers: List[dict] = []
