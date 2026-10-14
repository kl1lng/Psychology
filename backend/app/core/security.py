from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from jose import jwt, JWTError
import bcrypt

from app.core.config import settings

# ─── Password hashing ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False


# ─── JWT tokens ────────────────────────────────────────────────────────────────
def create_access_token(
    subject: str,
    role: str = "student",
    extra: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return {}


# ─── Guest / Anonymous tokens ──────────────────────────────────────────────────
def generate_guest_token() -> str:
    """Generate a UUID-based token for anonymous users."""
    guest_id = f"guest_{uuid.uuid4().hex}"
    return create_access_token(subject=guest_id, role="guest")


def get_token_subject(token: str) -> Optional[str]:
    payload = decode_token(token)
    return payload.get("sub")


def get_token_role(token: str) -> Optional[str]:
    payload = decode_token(token)
    return payload.get("role")


# ─── FastAPI Dependencies (RBAC Guards) ────────────────────────────────────────
from fastapi import Cookie, Header, HTTPException


async def get_current_user(
    access_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    Universal JWT authentication dependency.
    Extracts and validates JWT from cookie or Authorization header.
    Returns decoded payload dict with 'sub' and 'role' keys.
    Raises 401 if token is missing or invalid.
    """
    token = access_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

    return payload


async def get_current_admin(
    access_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    Admin-only RBAC guard.
    Verifies JWT and checks that the role is 'admin' or 'psychologist'.
    Raises 401 for missing token, 403 for insufficient permissions.
    """
    token = access_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

    if payload.get("role") not in ("admin", "psychologist"):
        raise HTTPException(status_code=403, detail="Доступ только для администраторов")

    return payload


async def get_current_psychologist(
    access_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    Psychologist-only RBAC guard.
    Verifies JWT and checks that the role is 'psychologist' or 'admin'.
    Teachers and students receive 403 Forbidden.
    """
    token = access_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

    if payload.get("role") not in ("psychologist", "admin"):
        raise HTTPException(status_code=403, detail="Доступ только для психологов и администраторов")

    return payload

