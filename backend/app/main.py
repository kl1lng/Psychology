import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

# ─── Logging ─────────────────────────────────────────────────────────────────
logger = logging.getLogger("aisezim")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(
    title="AISezim API",
    description="Backend for AISezim Educational & Psychological Platform",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (Strict Whitelist — NO wildcards) ──────────────────────────────────
from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie", "Accept"],
    expose_headers=["Set-Cookie"],
)

# ─── Global Exception Handler (Prevents StackTrace Leaks) ───────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled exceptions and return a sanitized JSON response.
    Internal details are logged server-side but NEVER exposed to the client.
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "code": 500,
            "message": "Произошла внутренняя ошибка сервера. Обратитесь к администратору.",
        },
    )


from app.api.router import api_router

# ─── Static files (audio, uploads) ───────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "service": "AISezim API",
        "version": "2.1.0",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "AISezim API",
        "docs": "/docs",
        "health": "/health",
    }
