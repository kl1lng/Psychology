import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Cookie

from app.core.security import decode_token
from app.core.supabase import get_supabase
from app.schemas.podcast import PodcastItem, PodcastListResponse

router = APIRouter(prefix="/podcasts", tags=["Podcasts"])

ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ─── List podcasts ────────────────────────────────────────────────────────────
@router.get("/", response_model=PodcastListResponse)
async def list_podcasts(limit: int = 20, offset: int = 0):
    sb = get_supabase()
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
    file_ext = file.filename.rsplit(".", 1)[-1] if file.filename else "mp3"
    storage_path = f"podcasts/{podcast_id}.{file_ext}"

    sb = get_supabase()

    # Upload to Supabase Storage
    try:
        sb.storage.from_("audio").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type},
        )
        file_url = sb.storage.from_("audio").get_public_url(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки файла: {str(e)}")

    now = datetime.utcnow()

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения метаданных: {str(e)}")

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
async def delete_podcast(podcast_id: str):
    sb = get_supabase()
    result = sb.table("podcasts").select("*").eq("id", podcast_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Подкаст не найден")

    podcast = result.data[0]
    try:
        sb.storage.from_("audio").remove([podcast["storage_path"]])
    except Exception:
        pass

    sb.table("podcasts").delete().eq("id", podcast_id).execute()
    return {"message": "Подкаст удалён"}
