import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Depends

from app.core.security import get_current_user, get_current_psychologist
from app.core.database import get_database
from app.schemas.qa import QuestionCreate, QuestionAnswer, QAQuestionOut, QAListResponse

router = APIRouter(prefix="/qa", tags=["Q&A Anonymous Board"])

# In-memory resilient store for Q&A questions (fallback when remote table doesn't exist)
_IN_MEMORY_QA: List[Dict[str, Any]] = [
    {
        "id": "qa-1",
        "student_id": "anon_101",
        "title": "Как справиться со страхом перед ЕНТ / экзаменами?",
        "content": "Очень сильно переживаю перед тестированием, не могу уснуть перед контрольными. Что делать?",
        "category": "Учеба и стресс",
        "answer": "Используйте дыхательные техники (например, квадратное дыхание 4-4-4-4 в нашем приложении) и составляйте реалистичный план подготовки с обязательными перерывами на отдых.",
        "psychologist_id": "psychologist-1",
        "is_published": True,
        "likes_count": 14,
        "created_at": "2026-02-10T10:00:00Z",
        "answered_at": "2026-02-10T14:00:00Z",
    },
    {
        "id": "qa-2",
        "student_id": "anon_102",
        "title": "Сложно сконцентрироваться на уроках, постоянная усталость",
        "content": "К середине дня теряю внимание, ничего не запоминается. Как повысить продуктивность?",
        "category": "Эмоциональное состояние",
        "answer": "Обратите внимание на режим сна (минимум 8 часов) и уровень экранного времени за час до сна. Также рекомендуем дневник настроения для отслеживания пиков усталости.",
        "psychologist_id": "psychologist-1",
        "is_published": True,
        "likes_count": 8,
        "created_at": "2026-02-15T11:00:00Z",
        "answered_at": "2026-02-15T16:00:00Z",
    },
]


# ─── 1. Ask anonymous question (Student) ──────────────────────────────────────
@router.post("/ask", response_model=QAQuestionOut)
async def ask_question(
    payload: QuestionCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("student", "guest"):
        raise HTTPException(status_code=403, detail="Задавать вопросы могут только ученики")
    # Identity comes from the verified session, never from a caller-controlled body field.
    student_id = current_user["sub"]

    question_id = str(uuid.uuid4())
    now = datetime.utcnow()

    item = {
        "id": question_id,
        "student_id": student_id,
        "title": payload.title,
        "content": payload.content,
        "category": payload.category,
        "is_published": False,
        "likes_count": 0,
        "created_at": now.isoformat(),
        "answer": None,
        "psychologist_id": None,
        "answered_at": None,
    }

    sb = get_database()
    try:
        sb.table("qa_questions").insert(item).execute()
    except Exception:
        pass

    _IN_MEMORY_QA.insert(0, item)
    return QAQuestionOut(**item)


# ─── 2. Public feed of answered & published questions ────────────────────────
@router.get("/feed", response_model=QAListResponse)
async def get_public_feed(
    category: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    lim = limit if isinstance(limit, int) else 30
    off = offset if isinstance(offset, int) else 0

    sb = get_database()
    try:
        query = (
            sb.table("qa_questions")
            .select("*")
            .eq("is_published", True)
            .order("answered_at", desc=True)
            .range(off, off + lim - 1)
        )
        if category and category != "Все":
            query = query.eq("category", category)

        res = query.execute()
        if res.data is not None and len(res.data) > 0:
            items = [QAQuestionOut(**item) for item in res.data]
            return QAListResponse(items=items, total=len(items))
    except Exception:
        pass

    # Resilient fallback
    filtered = [q for q in _IN_MEMORY_QA if q.get("is_published")]
    if category and category != "Все":
        filtered = [q for q in filtered if q.get("category") == category]
    sliced = filtered[off : off + lim]
    return QAListResponse(items=[QAQuestionOut(**item) for item in sliced], total=len(filtered))


# ─── 3. All questions for psychologist moderation ─────────────────────────────
@router.get("/moderation", response_model=QAListResponse)
async def get_moderation_queue(
    status: Optional[str] = Query(None, description="all | pending | answered"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _auth: dict = Depends(get_current_psychologist),
):
    lim = limit if isinstance(limit, int) else 50
    off = offset if isinstance(offset, int) else 0

    sb = get_database()
    try:
        query = sb.table("qa_questions").select("*").order("created_at", desc=True).range(off, off + lim - 1)
        if status == "pending":
            query = query.is_("answer", "null")
        elif status == "answered":
            query = query.not_.is_("answer", "null")

        res = query.execute()
        if res.data is not None and len(res.data) > 0:
            items = [QAQuestionOut(**item) for item in res.data]
            return QAListResponse(items=items, total=len(items))
    except Exception:
        pass

    # Resilient fallback
    filtered = list(_IN_MEMORY_QA)
    if status == "pending":
        filtered = [q for q in filtered if not q.get("answer")]
    elif status == "answered":
        filtered = [q for q in filtered if q.get("answer")]
    sliced = filtered[off : off + lim]
    return QAListResponse(items=[QAQuestionOut(**item) for item in sliced], total=len(filtered))


# ─── 4. Answer question (Psychologist) ────────────────────────────────────────
@router.post("/answer/{question_id}", response_model=QAQuestionOut)
async def answer_question(
    question_id: str,
    payload: QuestionAnswer,
    psychologist: dict = Depends(get_current_psychologist),
):
    psychologist_id = psychologist["sub"]

    now = datetime.utcnow()
    sb = get_database()

    try:
        res = (
            sb.table("qa_questions")
            .update({
                "answer": payload.answer,
                "psychologist_id": psychologist_id,
                "is_published": payload.is_published,
                "answered_at": now.isoformat(),
            })
            .eq("id", question_id)
            .execute()
        )
        if res.data:
            return QAQuestionOut(**res.data[0])
    except Exception:
        pass

    for q in _IN_MEMORY_QA:
        if q["id"] == question_id:
            q["answer"] = payload.answer
            q["psychologist_id"] = psychologist_id
            q["is_published"] = payload.is_published
            q["answered_at"] = now.isoformat()
            return QAQuestionOut(**q)

    raise HTTPException(status_code=404, detail="Вопрос не найден")


# ─── 5. Like question ─────────────────────────────────────────────────────────
@router.post("/like/{question_id}")
async def like_question(question_id: str):
    sb = get_database()
    try:
        res = sb.table("qa_questions").select("likes_count").eq("id", question_id).execute()
        if res.data:
            current_likes = res.data[0].get("likes_count") or 0
            new_likes = current_likes + 1
            sb.table("qa_questions").update({"likes_count": new_likes}).eq("id", question_id).execute()
            return {"likes_count": new_likes}
    except Exception:
        pass

    for q in _IN_MEMORY_QA:
        if q["id"] == question_id:
            q["likes_count"] = (q.get("likes_count") or 0) + 1
            return {"likes_count": q["likes_count"]}

    return {"likes_count": 1}
