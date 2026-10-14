import uuid
import os
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Cookie

from app.core.security import decode_token
from app.core.supabase import get_supabase
from app.schemas.assessment import (
    AssessmentSubmit,
    AssessmentResult,
    AssessmentListItem,
    TestInfo,
    TestQuestion,
    RiskLevel,
    ScaleResult,
)
from app.services.scoring_engine import load_test_config, score_assessment
from app.services.alerts import notify_emergency

router = APIRouter(prefix="/assessments", tags=["Assessments"])

TESTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "tests"
)


def _localize_field(field, lang: str = "ru") -> str:
    if isinstance(field, dict):
        return field.get(lang, field.get("ru", ""))
    return str(field)


def _list_available_tests(lang: str = "ru") -> List[dict]:
    tests = []
    for fname in os.listdir(TESTS_DIR):
        if fname.endswith(".json"):
            test_id = fname.replace(".json", "")
            try:
                config = load_test_config(test_id)
                tests.append({
                    "id": config["id"],
                    "title": _localize_field(config["title"], lang),
                    "description": _localize_field(config["description"], lang),
                    "estimated_minutes": config["estimated_minutes"],
                    "question_count": len(config.get("questions", [])),
                })
            except Exception:
                continue
    return tests


# ─── List available tests ─────────────────────────────────────────────────────
@router.get("/", response_model=List[AssessmentListItem])
async def list_tests(lang: str = "ru"):
    tests = _list_available_tests(lang)
    return [AssessmentListItem(**t) for t in tests]


# ─── Get test by ID ───────────────────────────────────────────────────────────
@router.get("/{test_id}", response_model=TestInfo)
async def get_test(test_id: str, lang: str = "ru"):
    try:
        config = load_test_config(test_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Тест '{test_id}' не найден")

    questions = []
    for q in config.get("questions", []):
        if "options" in q:
            opts = [
                {
                    "value": opt["value"],
                    "label": _localize_field(opt["label"], lang),
                }
                for opt in q["options"]
            ]
        else:
            opts = [
                {"value": 1, "label": "Да" if lang == "ru" else "Иә"},
                {"value": 0, "label": "Нет" if lang == "ru" else "Жоқ"},
            ]
        questions.append(
            TestQuestion(
                id=q["id"],
                text=_localize_field(q["text"], lang),
                options=opts,
            )
        )

    return TestInfo(
        id=config["id"],
        title=_localize_field(config["title"], lang),
        description=_localize_field(config["description"], lang),
        estimated_minutes=config["estimated_minutes"],
        question_count=len(questions),
        questions=questions,
    )


@router.post("/submit", response_model=AssessmentResult)
async def submit_assessment(
    payload: AssessmentSubmit,
    lang: str = "ru",
    access_token: Optional[str] = Cookie(None),
):
    # Identify student
    student_id = payload.student_id
    if not student_id and access_token:
        token_data = decode_token(access_token)
        student_id = token_data.get("sub")

    if not student_id:
        student_id = f"guest_anonymous"

    # Score the assessment
    try:
        result = score_assessment(payload.test_id, payload.answers)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Тест '{payload.test_id}' не найден")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при подсчёте баллов: {str(e)}")

    result_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Localize names and messages
    localized_test_name = _localize_field(result["test_name"], lang)
    
    risk_messages = {
        "LOW": {
            "ru": "Отличный результат! Уровень стресса в норме. Так держать! 🎉",
            "kk": "Тамаша нәтиже! Стресс деңгейі қалыпты. Осылай жалғастыра беріңіз! 🎉"
        },
        "MEDIUM": {
            "ru": "Обнаружен умеренный уровень тревожности. Рекомендуем практики релаксации.",
            "kk": "Орташа мазасыздық деңгейі анықталды. Релаксация жаттығуларын ұсынамыз."
        },
        "HIGH": {
            "ru": "Выявлен повышенный уровень стресса. Рекомендуем консультацию с психологом.",
            "kk": "Жоғары стресс деңгейі анықталды. Психологпен кеңесуді ұсынамыз."
        },
        "CRITICAL": {
            "ru": "Обнаружен критический уровень. Пожалуйста, свяжитесь с психологом как можно скорее.",
            "kk": "Қауіпті деңгей анықталды. Тез арада психологпен хабарласыңыз."
        }
    }
    risk_val = result["overall_risk"].value
    localized_message = risk_messages.get(risk_val, {}).get(lang, risk_messages[risk_val]["ru"])

    localized_scales = []
    for scale in result["scales"]:
        localized_scales.append(
            ScaleResult(
                scale_name=_localize_field(scale.scale_name, lang),
                raw_score=scale.raw_score,
                max_score=scale.max_score,
                percentage=scale.percentage,
                interpretation=_localize_field(scale.interpretation, lang)
            )
        )

    # Save to Supabase
    sb = get_supabase()
    try:
        sb.table("assessment_results").insert({
            "id": result_id,
            "student_id": student_id,
            "test_id": payload.test_id,
            "test_name": localized_test_name,
            "risk_level": result["overall_risk"].value,
            "reward_points": result["reward_points"],
            "answers_json": result["answers_json"],
            "created_at": now.isoformat(),
        }).execute()

        # Save detailed question responses if available
        if result.get("question_responses"):
            try:
                q_rows = [
                    {
                        "id": str(uuid.uuid4()),
                        "test_result_id": result_id,
                        "question_id": str(qr.get("question_id", "")),
                        "selected_option": str(qr.get("selected_option", "")),
                        "score": int(qr.get("score", 0)),
                        "created_at": now.isoformat(),
                    }
                    for qr in result["question_responses"]
                ]
                sb.table("question_responses").insert(q_rows).execute()
            except Exception:
                pass

        # Add reward points to student's balance (skip for guests)
        if not student_id.startswith("guest"):
            sb.rpc(
                "increment_points",
                {"user_id": student_id, "points": result["reward_points"]},
            ).execute()
    except Exception:
        # Don't fail if DB is not configured yet
        pass

    # Dispatch critical risk emergency notification if risk is CRITICAL
    if result["overall_risk"] == RiskLevel.CRITICAL:
        await notify_emergency(
            "CRITICAL_ASSESSMENT",
            {
                "student_id": student_id,
                "test_id": payload.test_id,
                "test_name": localized_test_name,
                "risk_level": "CRITICAL",
                "scales": [
                    {
                        "scale_name": s.scale_name,
                        "raw_score": s.raw_score,
                        "max_score": s.max_score,
                        "percentage": s.percentage,
                    }
                    for s in localized_scales
                ],
            },
        )

    qr_out = None
    if result.get("question_responses"):
        from app.schemas.assessment import QuestionResponseOut
        qr_out = [
            QuestionResponseOut(
                id=str(uuid.uuid4()),
                test_result_id=result_id,
                question_id=qr["question_id"],
                selected_option=qr["selected_option"],
                score=qr["score"],
                created_at=now,
            )
            for qr in result["question_responses"]
        ]

    return AssessmentResult(
        id=result_id,
        test_id=payload.test_id,
        test_name=localized_test_name,
        student_id=student_id,
        scales=localized_scales,
        overall_risk=result["overall_risk"],
        reward_points=result["reward_points"],
        created_at=now,
        message=localized_message,
        question_responses=qr_out,
    )

