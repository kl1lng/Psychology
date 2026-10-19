import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Cookie, Depends, Query

from app.core.security import decode_token, get_current_psychologist, get_current_user
from app.core.config import settings
from app.core.database import get_database
from app.schemas.podcast import PodcastItem, PodcastListResponse

router = APIRouter(prefix="/podcasts", tags=["Podcasts"])

ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ─── List podcasts ────────────────────────────────────────────────────────────
@router.get("/", response_model=PodcastListResponse)
async def list_podcasts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _auth: dict = Depends(get_current_user),
):
    sb = get_database()
    result = (
        sb.table("podcasts")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    items = [
        PodcastItem(
            id=p["id"],
            title=p["title"],
            description=p.get("description"),
            category=p.get("category"),
            file_url=p["file_url"],
            duration_seconds=p.get("duration_seconds"),
            uploaded_by=p.get("uploaded_by"),
            created_at=p["created_at"],
        )
        for p in (result.data or [])
    ]

    return PodcastListResponse(items=items, total=len(items))


# ─── Upload podcast ───────────────────────────────────────────────────────────
@router.post("/upload", response_model=PodcastItem)
async def upload_podcast(
    title: str = Form(..., min_length=2, max_length=200),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    file: UploadFile = File(...),
    access_token: Optional[str] = Cookie(None),
    _auth: dict = Depends(get_current_psychologist),
):
    # Validate content type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый тип файла: {file.content_type}. Разрешены: MP3, MP4, OGG, WAV",
        )

    # Read file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Файл слишком большой. Максимум 50 МБ")

    # Get uploader
    uploader_id = None
    if access_token:
        token_data = decode_token(access_token)
        uploader_id = token_data.get("sub")

    podcast_id = str(uuid.uuid4())
    extension_by_type = {"audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/webm": "webm"}
    file_ext = extension_by_type[file.content_type]
    storage_path = f"podcasts/{podcast_id}.{file_ext}"
    storage_root = Path(settings.local_storage_path).resolve()
    file_path = (storage_root / storage_path).resolve()
    if not file_path.is_relative_to(storage_root):
        raise HTTPException(status_code=400, detail="Некорректный путь аудиофайла")
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(contents)
    file_url = f"/static/{storage_path}"

    now = datetime.utcnow()
    sb = get_database()

    # Save metadata to DB
    try:
        sb.table("podcasts").insert({
            "id": podcast_id,
            "title": title,
            "description": description,
            "category": category,
            "file_url": file_url,
            "storage_path": storage_path,
            "uploaded_by": uploader_id,
            "created_at": now.isoformat(),
        }).execute()
    except Exception:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail="Не удалось сохранить сведения о подкасте")

    return PodcastItem(
        id=podcast_id,
        title=title,
        description=description,
        category=category,
        file_url=file_url,
        duration_seconds=None,
        uploaded_by=uploader_id,
        created_at=now,
    )


# ─── Delete podcast ───────────────────────────────────────────────────────────
@router.delete("/{podcast_id}")
async def delete_podcast(podcast_id: str, _auth: dict = Depends(get_current_psychologist)):
    sb = get_database()
    result = sb.table("podcasts").select("*").eq("id", podcast_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Подкаст не найден")

    podcast = result.data[0]
    sb.table("podcasts").delete().eq("id", podcast_id).execute()
    storage_root = Path(settings.local_storage_path).resolve()
    file_path = (storage_root / podcast.get("storage_path", "")).resolve()
    if file_path.is_relative_to(storage_root) and file_path.is_file():
        file_path.unlink()
    return {"message": "Подкаст удалён"}
