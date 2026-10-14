from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Depends

from app.core.supabase import get_supabase
from app.core.security import get_current_psychologist
from app.schemas.assessment import RiskLevel, AnswerItem
from app.services.scoring_engine import score_assessment

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ─── Get results with filters ─────────────────────────────────────────────────
@router.get("/results")
async def get_results(
    class_id: Optional[str] = Query(None, description="Filter by class, e.g. '10A'"),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _auth: dict = Depends(get_current_psychologist),
):
    sb = get_supabase()

    query = (
        sb.table("assessment_results")
        .select(
            "id, student_id, test_id, test_name, risk_level, reward_points, created_at, "
            "users!inner(full_name, class_id, email)"
        )
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if risk_level:
        query = query.eq("risk_level", risk_level.value)

    if class_id:
        query = query.eq("users.class_id", class_id)

    result = query.execute()

    return {
        "items": result.data or [],
        "total": len(result.data or []),
        "offset": offset,
        "limit": limit,
    }


# ─── Get single assessment detail report with scale breakdown ────────────────
@router.get("/assessment/{assessment_id}")
async def get_assessment_detail(assessment_id: str, _auth: dict = Depends(get_current_psychologist)):
    """Retrieve full assessment record with recalculated scale scores for official PDF report."""
    sb = get_supabase()

    res = (
        sb.table("assessment_results")
        .select("*, users(full_name, class_id, email)")
        .eq("id", assessment_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Результат теста не найден")

    item = res.data[0]
    test_id = item.get("test_id")
    answers_json = item.get("answers_json") or {}

    scales: List[Dict[str, Any]] = []
    message = ""

    if test_id and answers_json:
        try:
            answers_list = [
                AnswerItem(question_id=int(k), answer=int(v))
                for k, v in answers_json.items()
                if str(k).isdigit()
            ]
            scored = score_assessment(test_id, answers_list)
            scales = [
                {
                    "scale_name": s.scale_name,
                    "raw_score": s.raw_score,
                    "max_score": s.max_score,
                    "percentage": s.percentage,
                    "interpretation": s.interpretation,
                }
                for s in scored["scales"]
            ]
            message = scored.get("message", "")
        except Exception:
            pass

    user_info = item.get("users") or {}
    student_name = user_info.get("full_name") or item["student_id"]
    class_id = user_info.get("class_id") or "—"

    return {
        "id": item["id"],
        "student_id": item["student_id"],
        "student_name": student_name,
        "class_id": class_id,
        "test_id": test_id,
        "test_name": item.get("test_name", test_id),
        "risk_level": item.get("risk_level", "LOW"),
        "reward_points": item.get("reward_points", 0),
        "created_at": item.get("created_at"),
        "scales": scales,
        "answers_json": answers_json,
        "message": message,
    }


# ─── Get student detail ───────────────────────────────────────────────────────
@router.get("/results/{student_id}")
async def get_student_results(student_id: str, _auth: dict = Depends(get_current_psychologist)):
    if student_id == "00000000-0000-0000-0000-000000000000" or student_id == "anonymous":
        return {
            "student": {
                "id": "00000000-0000-0000-0000-000000000000",
                "full_name": "Анонимді оқушы",
                "email": "anonymous@school.local",
                "class_id": "—",
                "points_balance": 0,
                "is_anonymous": True,
            },
            "assessments": [],
            "mood_entries": [],
            "risk_summary": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "is_anonymous": True,
        }

    sb = get_supabase()

    # Student info
    user_result = (
        sb.table("users")
        .select("id, full_name, email, class_id, points_balance")
        .eq("id", student_id)
        .execute()
    )

    if not user_result.data:
        raise HTTPException(status_code=404, detail="Ученик не найден")

    student = user_result.data[0]
    student["is_anonymous"] = False

    # Assessment results
    assessments = (
        sb.table("assessment_results")
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .execute()
    )

    # Mood history
    mood = (
        sb.table("mood_entries")
        .select("stress_level, created_at, note")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )

    # Risk summary
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for a in (assessments.data or []):
        lvl = a.get("risk_level", "LOW")
        risk_counts[lvl] = risk_counts.get(lvl, 0) + 1

    return {
        "student": student,
        "assessments": assessments.data or [],
        "mood_entries": mood.data or [],
        "risk_summary": risk_counts,
    }


# ─── Class Comparison Group Analytics ─────────────────────────────────────────
@router.get("/class-comparison")
async def get_class_comparison(_auth: dict = Depends(get_current_psychologist)):
    """Group analytics: aggregate stress & risk distribution across classes/parallels."""
    sb = get_supabase()

    # 1. Fetch all students with their class_id
    users_res = sb.table("users").select("id, class_id, full_name").eq("role", "student").execute()
    users_map = {u["id"]: u for u in (users_res.data or [])}

    # Group students by class_id
    classes_students: Dict[str, List[str]] = {}
    for uid, u in users_map.items():
        cid = u.get("class_id") or "Без класса"
        classes_students.setdefault(cid, []).append(uid)

    # 2. Fetch assessment results
    assessments_res = sb.table("assessment_results").select("student_id, risk_level").execute()
    assessments_by_class: Dict[str, List[str]] = {}
    for a in (assessments_res.data or []):
        sid = a["student_id"]
        cid = users_map.get(sid, {}).get("class_id") or "Без класса"
        lvl = a.get("risk_level", "LOW")
        assessments_by_class.setdefault(cid, []).append(lvl)

    # 3. Fetch mood entries
    mood_res = sb.table("mood_entries").select("student_id, stress_level").execute()
    mood_by_class: Dict[str, List[int]] = {}
    for m in (mood_res.data or []):
        sid = m["student_id"]
        cid = users_map.get(sid, {}).get("class_id") or "Без класса"
        stress = m.get("stress_level")
        if stress is not None:
            mood_by_class.setdefault(cid, []).append(stress)

    # 4. Build combined class comparisons
    all_classes = sorted(
        list(
            set(
                list(classes_students.keys())
                + list(assessments_by_class.keys())
                + list(mood_by_class.keys())
            )
        )
    )

    comparison_data = []
    for cid in all_classes:
        students_count = len(classes_students.get(cid, []))
        class_risks = assessments_by_class.get(cid, [])
        total_tests = len(class_risks)

        risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for lvl in class_risks:
            if lvl in risk_counts:
                risk_counts[lvl] += 1

        critical_pct = round((risk_counts["CRITICAL"] / total_tests * 100), 1) if total_tests > 0 else 0.0
        high_pct = round((risk_counts["HIGH"] / total_tests * 100), 1) if total_tests > 0 else 0.0

        class_stresses = mood_by_class.get(cid, [])
        avg_stress = round(sum(class_stresses) / len(class_stresses), 1) if class_stresses else 0.0

        comparison_data.append(
            {
                "class_id": cid,
                "total_students": students_count,
                "total_assessments": total_tests,
                "avg_stress": avg_stress,
                "risk_counts": risk_counts,
                "critical_pct": critical_pct,
                "high_pct": high_pct,
            }
        )

    return comparison_data


# In-memory resilient store for psychologist notes (fallback if table doesn't exist)
_IN_MEMORY_NOTES: List[Dict[str, Any]] = []

# ─── Psychologist Notes ────────────────────────────────────────────────────────
@router.get("/student/{student_id}/notes")
async def get_student_notes(student_id: str, _auth: dict = Depends(get_current_psychologist)):
    """Fetch confidential psychologist notes for a student."""
    sb = get_supabase()
    try:
        res = (
            sb.table("psychologist_notes")
            .select("*")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .execute()
        )
        if res.data is not None:
            return res.data
    except Exception:
        pass
    return [n for n in _IN_MEMORY_NOTES if n.get("student_id") == student_id]


@router.post("/student/{student_id}/notes")
async def add_student_note(
    student_id: str,
    payload: Dict[str, Any],
    _auth: dict = Depends(get_current_psychologist),
):
    """Add a new confidential psychologist note."""
    note_text = payload.get("note", "").strip()
    if not note_text:
        raise HTTPException(status_code=400, detail="Текст заметки не может быть пустым")

    psychologist_id = payload.get("psychologist_id") or "psychologist_default"
    import uuid
    from datetime import datetime

    note_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    note_item = {
        "id": note_id,
        "student_id": student_id,
        "psychologist_id": psychologist_id,
        "note": note_text,
        "created_at": now_iso,
    }

    sb = get_supabase()
    try:
        res = (
            sb.table("psychologist_notes")
            .insert(note_item)
            .execute()
        )
        if res.data:
            return res.data[0]
    except Exception:
        pass

    _IN_MEMORY_NOTES.insert(0, note_item)
    return note_item


# ─── Dashboard stats with Smart Early Warning ─────────────────────────────────
@router.get("/dashboard")
async def get_dashboard(_auth: dict = Depends(get_current_psychologist)):
    """Summary stats and early warning risks for psychologist dashboard."""
    sb = get_supabase()

    # 1. Risk level counts
    results = sb.table("assessment_results").select("student_id, test_id, test_name, risk_level, created_at").execute()
    all_assessments = results.data or []

    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for r in all_assessments:
        lvl = r.get("risk_level", "LOW")
        risk_counts[lvl] = risk_counts.get(lvl, 0) + 1

    # 2. Total students & users map
    students_res = sb.table("users").select("id, full_name, class_id, email").eq("role", "student").execute()
    students_data = students_res.data or []
    total_students = len(students_data)
    users_map = {u["id"]: u for u in students_data}

    # 3. Waiting dialogs
    waiting = (
        sb.table("dialogs")
        .select("id", count="exact")
        .eq("status", "WAITING_PSYCHOLOGIST")
        .execute()
    )
    waiting_count = waiting.count or 0

    # 4. Smart Early Warning Algorithm:
    # Criteria:
    # a) Any test with CRITICAL or HIGH risk level
    # b) Average stress >= 7.0 across recent mood entries
    mood_res = sb.table("mood_entries").select("student_id, stress_level, created_at").order("created_at", desc=True).execute()
    student_moods: Dict[str, List[int]] = {}
    for m in (mood_res.data or []):
        sid = m["student_id"]
        if len(student_moods.get(sid, [])) < 3:
            student_moods.setdefault(sid, []).append(m["stress_level"])

    early_warnings = []
    for sid, u in users_map.items():
        user_tests = [a for a in all_assessments if a["student_id"] == sid]
        has_critical_test = any(a["risk_level"] == "CRITICAL" for a in user_tests)
        has_high_test = any(a["risk_level"] == "HIGH" for a in user_tests)

        recent_stresses = student_moods.get(sid, [])
        avg_recent_stress = round(sum(recent_stresses) / len(recent_stresses), 1) if recent_stresses else None
        high_stress_flag = avg_recent_stress is not None and avg_recent_stress >= 7.0

        if has_critical_test or has_high_test or high_stress_flag:
            reasons = []
            if has_critical_test:
                reasons.append("Критический риск в диагностике")
            if has_high_test and not has_critical_test:
                reasons.append("Высокий уровень тревожности/риска")
            if high_stress_flag:
                reasons.append(f"Высокий средний стресс ({avg_recent_stress}/10)")

            severity = "CRITICAL" if has_critical_test or (avg_recent_stress and avg_recent_stress >= 8.5) else "HIGH"

            early_warnings.append({
                "student_id": sid,
                "student_name": u.get("full_name") or sid,
                "class_id": u.get("class_id") or "—",
                "severity": severity,
                "reasons": reasons,
                "avg_stress": avg_recent_stress,
                "tests_count": len(user_tests),
            })

    # Sort critical first, then high
    early_warnings.sort(key=lambda x: (0 if x["severity"] == "CRITICAL" else 1, -(x["avg_stress"] or 0)))

    return {
        "total_students": total_students,
        "waiting_psychologist": waiting_count,
        "risk_distribution": risk_counts,
        "critical_count": risk_counts["CRITICAL"],
        "high_count": risk_counts["HIGH"],
        "early_warnings": early_warnings,
    }
