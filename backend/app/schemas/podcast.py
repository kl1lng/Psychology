from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PodcastUpload(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=100)
    uploaded_by: Optional[str] = None  # psychologist user ID


class PodcastItem(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: Optional[str] = None
    file_url: str
    duration_seconds: Optional[int]
    uploaded_by: Optional[str]
    created_at: datetime


class PodcastListResponse(BaseModel):
    items: list[PodcastItem]
    total: int
