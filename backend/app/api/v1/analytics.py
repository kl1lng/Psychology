from datetime import datetime, time, timedelta, timezone
import uuid
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Depends

from app.core.database import get_database
from app.core.security import get_current_psychologist
from app.schemas.assessment import RiskLevel, AnswerItem
from app.services.scoring_engine import score_assessment

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _uuid_values(values: List[str]) -> List[str]:
    valid = []
    for value in values:
        try:
            valid.append(str(uuid.UUID(str(value))))
        except (ValueError, TypeError, AttributeError):
            continue
    return valid


@router.get("/activity")
async def get_activity_history(
    days: int = Query(30, ge=1, le=90),
    _auth: dict = Depends(get_current_psychologist),
):
    """Return daily aggregate counts without exposing raw records to the browser."""
    sb = get_database()
    today = datetime.now(timezone.utc).date()
    first_day = today - timedelta(days=days - 1)
    cutoff = datetime.combine(first_day, time.min, tzinfo=timezone.utc).isoformat()

    sources = {
        "tests": "assessment_results",
        "moods": "mood_entries",
        "dialogs": "dialogs",
    }
    counts = {
        key: { (first_day + timedelta(days=offset)).isoformat(): 0 for offset in range(days) }
        for key in sources
    }

    for key, table in sources.items():
        offset = 0
        while True:
            result = (
                sb.table(table)
                .select("created_at")
                .gte("created_at", cutoff)
                .order("created_at")
                .range(offset, offset + 999)
                .execute()
            )
            rows = result.data or []
            for row in rows:
                raw_created_at = row.get("created_at")
                if not raw_created_at:
                    continue
                try:
                    created_at = datetime.fromisoformat(str(raw_created_at).replace("Z", "+00:00"))
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    day = created_at.astimezone(timezone.utc).date().isoformat()
                    if day in counts[key]:
                        counts[key][day] += 1
                except (TypeError, ValueError):
                    continue
            if len(rows) < 1000:
                break
            offset += len(rows)

    return {
        "items": [
            {
                "date": day,
                "tests": counts["tests"][day],
                "moods": counts["moods"][day],
                "dialogs": counts["dialogs"][day],
            }
            for day in counts["tests"]
        ]
    }


# ─── Get results with filters ─────────────────────────────────────────────────
@router.get("/results")
async def get_results(
    class_id: Optional[str] = Query(None, description="Filter by class, e.g. '10A'"),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _auth: dict = Depends(get_current_psychologist),
):
    sb = get_database()

    query = sb.table("assessment_results").select(
        "id, student_id, test_id, test_name, risk_level, reward_points, created_at"
    ).order("created_at", desc=True)

    if risk_level:
        query = query.eq("risk_level", risk_level.value)

    if class_id:
        class_students = sb.table("users").select("id").eq("role", "student").eq("class_id", class_id).execute().data or []
        student_ids = [row["id"] for row in class_students]
        if not student_ids:
            return {"items": [], "total": 0, "offset": offset, "limit": limit}
        query = query.in_("student_id", student_ids)

    result = query.range(offset, offset + limit - 1).execute()
    items = result.data or []
    ids = _uuid_values(list({item.get("student_id") for item in items if item.get("student_id")}))
    users = sb.table("users").select("id, full_name, class_id, email").in_("id", ids).execute().data if ids else []
    user_map = {user["id"]: user for user in (users or [])}
    for item in items:
        item["users"] = user_map.get(item.get("student_id"))

    return {
        "items": items,
        "total": len(items),
        "offset": offset,
        "limit": limit,
    }


@router.get("/monthly-comparison")
async def get_monthly_comparison(
    class_id: Optional[str] = Query(None),
    _auth: dict = Depends(get_current_psychologist),
):
    """Compare repeated assessments for the same student and method across two 30-day periods."""
    sb = get_database()
    now = datetime.now(timezone.utc)
    current_start = now - timedelta(days=30)
    previous_start = now - timedelta(days=60)
    rows = (
        sb.table("assessment_results")
        .select("id, student_id, test_id, test_name, risk_level, answers_json, created_at")
        .gte("created_at", previous_start.isoformat())
        .order("created_at", desc=True)
        .limit(2000)
        .execute()
        .data or []
    )
    student_ids = _uuid_values(list({row.get("student_id") for row in rows if row.get("student_id")}))
    users = sb.table("users").select("id, full_name, class_id").in_("id", student_ids).execute().data if student_ids else []
    user_map = {user["id"]: user for user in (users or [])}
    grouped: Dict[tuple, Dict[str, Any]] = {}
    for row in rows:
        user = user_map.get(row.get("student_id")) or {}
        if class_id and user.get("class_id") != class_id:
            continue
        test_id = row.get("test_id")
        answers = row.get("answers_json") or {}
        if not test_id or not answers:
            continue
        try:
            created = datetime.fromisoformat(str(row.get("created_at", "")).replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            scored = score_assessment(test_id, [AnswerItem(question_id=int(k), answer=int(v)) for k, v in answers.items() if str(k).isdigit()])
        except Exception:
            continue
        period = "current" if created >= current_start else "previous"
        key = (row.get("student_id"), test_id)
        group = grouped.setdefault(key, {"student_id": row.get("student_id"), "student_name": user.get("full_name") or "—", "class_id": user.get("class_id") or "—", "test_id": test_id, "test_name": row.get("test_name") or test_id})
        if period not in group:
            group[period] = {"date": row.get("created_at"), "risk_level": row.get("risk_level"), "scales": [{"name": s.scale_name, "score": s.raw_score, "max_score": s.max_score} for s in scored["scales"]]}
    items = [g for g in grouped.values() if "current" in g and "previous" in g]
    return {"current_from": current_start.date().isoformat(), "previous_from": previous_start.date().isoformat(), "items": items}


# ─── Get single assessment detail report with scale breakdown ────────────────
@router.get("/assessment/{assessment_id}")
async def get_assessment_detail(assessment_id: str, _auth: dict = Depends(get_current_psychologist)):
    """Retrieve full assessment record with recalculated scale scores for official PDF report."""
    sb = get_database()

    res = (
        sb.table("assessment_results")
        .select("*")
        .eq("id", assessment_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Результат теста не найден")

    item = res.data[0]
    student_id = item.get("student_id")
    user = sb.table("users").select("full_name, class_id, email").eq("id", student_id).limit(1).execute().data if _uuid_values([student_id]) else []
    item["users"] = user[0] if user else None
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

    sb = get_database()

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
    sb = get_database()

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
    sb = get_database()
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

    sb = get_database()
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
    sb = get_database()

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
