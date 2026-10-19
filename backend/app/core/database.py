"""Client for the private, self-hosted PostgREST API over local PostgreSQL."""
from datetime import datetime, timedelta, timezone
from threading import Lock
import time

from jose import jwt
from postgrest import SyncPostgrestClient

from app.core.config import settings

_client: SyncPostgrestClient | None = None
_token_expires_at = 0.0
_client_lock = Lock()


def get_database() -> SyncPostgrestClient:
    """Return the in-network database API client using a short-lived service JWT."""
    global _client, _token_expires_at
    if not settings.internal_database_jwt_secret or len(settings.internal_database_jwt_secret) < 32:
        raise RuntimeError("INTERNAL_DATABASE_JWT_SECRET must contain at least 32 characters")
    with _client_lock:
        if _client is None:
            _client = SyncPostgrestClient(settings.database_api_url)
        if _token_expires_at < time.time() + 60:
            expires = datetime.now(timezone.utc) + timedelta(minutes=10)
            token = jwt.encode(
                {
                    "role": "aisezim_api",
                    "iat": datetime.now(timezone.utc),
                    "exp": expires,
                },
                settings.internal_database_jwt_secret,
                algorithm="HS256",
            )
            _client.auth(token)
            _token_expires_at = expires.timestamp()
        return _client
