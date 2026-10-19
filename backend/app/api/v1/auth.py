import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, Cookie
from fastapi.security import HTTPBearer

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_guest_token,
    decode_token,
)
from app.core.database import get_database
from app.core.departments_store import DepartmentStore
from app.schemas.user import UserCreate, UserLogin, Token, UserOut, GuestToken, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Register ─────────────────────────────────────────────────────────────────
@router.post("/register", response_model=Token)
async def register(payload: UserCreate, response: Response):
    # Public signup must not grant staff access to student records.
    if payload.role in (UserRole.ADMIN, UserRole.PSYCHOLOGIST):
        raise HTTPException(
            status_code=403,
            detail="Учётные записи сотрудников создаёт администратор школы",
        )

    sb = get_database()

    # Check if email already exists
    existing = sb.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже зарегистрирован")

    department_id = None

    # Handle Teacher role validation
    if payload.role == UserRole.TEACHER:
        if not payload.department_code or not payload.department_code.strip():
            raise HTTPException(
                status_code=400,
                detail="Для регистрации учителя требуется указать код кафедры",
            )
        
        clean_code = payload.department_code.strip().upper()
        dept_data = DepartmentStore.get_by_code(clean_code)
        if not dept_data:
            raise HTTPException(
                status_code=400,
                detail=f"Неверный код кафедры '{clean_code}'. Обратитесь к администратору школы.",
            )
        
        department_id = dept_data["id"]
        assigned_role = UserRole.TEACHER.value
    elif payload.role == UserRole.PSYCHOLOGIST:
        assigned_role = UserRole.PSYCHOLOGIST.value
    else:
        assigned_role = UserRole.STUDENT.value

    user_id = str(uuid.uuid4())
    hashed = hash_password(payload.password)

    new_user = {
        "id": user_id,
        "email": payload.email,
        "full_name": payload.full_name,
        "password_hash": hashed,
        "role": assigned_role,
        "class_id": payload.class_id if assigned_role == UserRole.STUDENT.value else None,
        "department_id": department_id,
        "points_balance": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        result = sb.table("users").insert(new_user).execute()
    except Exception as e:
        err_msg = str(e)
        if "department_id" in err_msg.lower() and "department_id" in new_user:
            new_user.pop("department_id", None)
            try:
                result = sb.table("users").insert(new_user).execute()
            except Exception as e2:
                err_msg2 = str(e2)
                if "users_role_check" in err_msg2.lower() or "23514" in err_msg2:
                    new_user["role"] = "psychologist"
                    new_user["class_id"] = f"TEACHER:{department_id or ''}"
                    result = sb.table("users").insert(new_user).execute()
                else:
                    raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {err_msg2}")
        elif "users_role_check" in err_msg.lower() or "23514" in err_msg:
            new_user.pop("department_id", None)
            new_user["role"] = "psychologist"
            new_user["class_id"] = f"TEACHER:{department_id or ''}"
            result = sb.table("users").insert(new_user).execute()
        elif "row-level security" in err_msg.lower() or "42501" in err_msg:
            raise HTTPException(
                status_code=500,
                detail="Ошибка доступа к локальной базе данных. Проверьте запуск PostgreSQL/PostgREST и права роли приложения.",
            )
        else:
            raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {err_msg}")

    if not result.data:
        raise HTTPException(status_code=500, detail="Не удалось создать пользователя")

    user_data = result.data[0]
    token = create_access_token(subject=user_id, role=assigned_role)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=86400,
        samesite="lax",
    )

    return Token(
        access_token=token,
        user=UserOut(
            id=user_id,
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=UserRole(assigned_role),
            class_id=payload.class_id if assigned_role == UserRole.STUDENT.value else None,
            department_id=department_id,
            points_balance=0,
        ),
    )



# ─── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
async def login(payload: UserLogin, response: Response):
    sb = get_database()

    result = sb.table("users").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    user = result.data[0]
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    # Detect teacher role from class_id or department_id
    role_str = user.get("role", "student")
    class_id_val = user.get("class_id")
    dept_id_val = user.get("department_id")

    if class_id_val and str(class_id_val).startswith("TEACHER:"):
        role_str = "teacher"
        dept_id_val = str(class_id_val).split(":", 1)[1] or dept_id_val
        class_id_val = None
    elif role_str == "teacher":
        role_str = "teacher"

    token = create_access_token(subject=user["id"], role=role_str)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=86400,
        samesite="lax",
    )

    return Token(
        access_token=token,
        user=UserOut(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=UserRole(role_str),
            class_id=class_id_val,
            department_id=dept_id_val,
            points_balance=user.get("points_balance", 0),
        ),
    )


# ─── Guest / Anonymous login ──────────────────────────────────────────────────
@router.post("/guest", response_model=GuestToken)
async def guest_login(response: Response):
    """Generate an anonymous UUID token stored in cookie."""
    guest_id = f"guest_{uuid.uuid4().hex}"
    token = create_access_token(subject=guest_id, role="guest")

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=86400 * 30,  # 30 days
        samesite="lax",
    )

    return GuestToken(access_token=token, guest_id=guest_id)


# ─── Logout ──────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Успешный выход из системы"}


# ─── Me ──────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
async def get_me(access_token: Optional[str] = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Не авторизован")

    payload = decode_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Токен недействителен")

    user_id = payload.get("sub", "")
    role = payload.get("role", "guest")

    if role == "guest":
        return UserOut(
            id=user_id,
            email="",
            full_name="Анонимный пользователь",
            role=UserRole.GUEST,
            class_id=None,
            department_id=None,
            points_balance=0,
        )

    sb = get_database()
    result = sb.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user = result.data[0]
    return UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        class_id=user.get("class_id"),
        department_id=user.get("department_id"),
        points_balance=user.get("points_balance", 0),
    )

