from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    PSYCHOLOGIST = "psychologist"
    TEACHER = "teacher"
    STUDENT = "student"
    GUEST = "guest"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.STUDENT
    class_id: Optional[str] = None  # e.g. "10A", "9B"
    department_id: Optional[str] = None  # populated for TEACHER role
    department_code: Optional[str] = Field(None, description="Код кафедры для регистрации учителя, например: 'MIPH2026'")


class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    class_id: Optional[str] = None
    department_id: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    class_id: Optional[str] = None
    department_id: Optional[str] = None
    points_balance: int = 0

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class GuestToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    guest_id: str
    message: str = "Вы вошли анонимно. Ваш прогресс сохранится в этом устройстве."
