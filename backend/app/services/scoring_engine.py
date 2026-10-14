"""
Scoring Engine — Deterministic mathematical test scoring without external AI.

Supports:
- Binary key-based questionnaires: Eysenck EPI, Phillips School Anxiety, Klimov DDO
- Weighted option scoring: Luskanova School Motivation
- Multiscale profile calculations and dominant orientation detection
- Risk level assignment and gamified reward points
"""
import json
import os
from typing import Dict, List, Any

from app.schemas.assessment import RiskLevel, ScaleResult, AnswerItem

TESTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "tests")


def load_test_config(test_id: str) -> Dict[str, Any]:
    path = os.path.join(TESTS_DIR, f"{test_id}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Test config not found: {test_id}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _score_binary_scale(answers: Dict[int, int], scale: Dict[str, Any]) -> int:
    """Score a binary / key-based scale using a key list."""
    score = 0
    for item in scale.get("keys", []):
        q_id = item["q"]
        expected = item["a"]
        actual = answers.get(q_id, -1)
        if actual == expected:
            score += 1
    return score


def _determine_risk(scales: List[ScaleResult], thresholds: Dict[str, Any], scoring_type: str) -> RiskLevel:
    """
    Determine overall risk based on scale scores or thresholds.
    """
    if scoring_type == "weighted":
        # For Luskanova motivation: lower scores = higher risk
        if scales:
            raw_score = scales[0].raw_score
            crit_below = thresholds.get("critical_below", 10)
            med_below = thresholds.get("medium_below", 15)
            if raw_score < crit_below:
                return RiskLevel.HIGH
            elif raw_score < med_below:
                return RiskLevel.MEDIUM
            else:
                return RiskLevel.LOW
        return RiskLevel.LOW

    max_pct = max((s.percentage for s in scales), default=0)

    critical_t = thresholds.get("critical", 80)
    high_t = thresholds.get("high", 65)
    medium_t = thresholds.get("medium", 45)

    if max_pct >= critical_t:
        return RiskLevel.CRITICAL
    elif max_pct >= high_t:
        return RiskLevel.HIGH
    elif max_pct >= medium_t:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW


def _calc_reward_points(risk: RiskLevel, completed: bool = True) -> int:
    """Award points for completing an assessment."""
    base = 50 if completed else 0
    bonuses = {
        RiskLevel.LOW: 30,
        RiskLevel.MEDIUM: 20,
        RiskLevel.HIGH: 10,
        RiskLevel.CRITICAL: 10,
    }
    return base + bonuses.get(risk, 0)


def score_assessment(test_id: str, answers: List[AnswerItem]) -> Dict[str, Any]:
    """
    Main scoring function.
    Returns: dict with test_name, scales, overall_risk, reward_points, message, answers_json.
    """
    config = load_test_config(test_id)
    scoring_type = config.get("scoring_type", "binary")

    # Build answer dict {question_id: answer_value}
    answers_dict: Dict[int, int] = {a.question_id: a.answer for a in answers}

    scale_results: List[ScaleResult] = []

    if scoring_type == "weighted":
        # Weighted options test (e.g. Luskanova Motivation)
        total_score = sum(answers_dict.get(q["id"], 0) for q in config.get("questions", []))
        for scale in config.get("scales", []):
            max_s = scale.get("max_score", 30)
            pct = round((total_score / max_s * 100), 1) if max_s > 0 else 0

            interpretation = "Норма"
            for interp in scale.get("interpretations", []):
                if total_score >= interp["min"]:
                    interpretation = interp["text"]
                    break

            scale_results.append(
                ScaleResult(
                    scale_name=scale["name"],
                    raw_score=total_score,
                    max_score=max_s,
                    percentage=pct,
                    interpretation=interpretation,
                )
            )
    else:
        # Key-based tests (EPI-A, Phillips, Klimov DDO)
        for scale in config["scales"]:
            raw = _score_binary_scale(answers_dict, scale)
            max_s = len(scale.get("keys", []))
            pct = round((raw / max_s * 100), 1) if max_s > 0 else 0

            interpretation = "Норма"
            for interp in scale.get("interpretations", []):
                if raw >= interp["min"]:
                    interpretation = interp["text"]
                    break

            scale_results.append(
                ScaleResult(
                    scale_name=scale["name"],
                    raw_score=raw,
                    max_score=max_s,
                    percentage=pct,
                    interpretation=interpretation,
                )
            )

    thresholds = config.get("risk_thresholds", {})
    risk = _determine_risk(scale_results, thresholds, scoring_type)
    points = _calc_reward_points(risk)

    def _extract_str(val):
        if isinstance(val, dict):
            return val.get("ru", "")
        return str(val)

    # Contextual result messages
    if test_id == "klimov_ddo":
        # Find dominant vocational sphere
        top_scale = max(scale_results, key=lambda s: s.raw_score, default=None)
        if top_scale:
            name_str = _extract_str(top_scale.scale_name)
            message = f"Ведущая профессиональная направленность: {name_str}. Рекомендуем развивать навыки в этой сфере!"
        else:
            message = "Тестирование профессиональной направленности успешно завершено."
    elif test_id == "luskanova_motivation":
        if risk == RiskLevel.LOW:
            message = "Отличный уровень школьной мотивации! Высокая учебная активность и интерес к знаниям. 🎉"
        elif risk == RiskLevel.MEDIUM:
            message = "Средний уровень мотивации. Рекомендуем развивать интерес к любимым предметам."
        else:
            message = "Выявлены признаки снижения учебной мотивации и адаптационные затруднения. Рекомендуется консультация психолога."
    else:
        risk_messages = {
            RiskLevel.LOW: "Отличный результат! Показатели эмоционального состояния в пределах нормы. 🎉",
            RiskLevel.MEDIUM: "Обнаружен умеренный уровень тревожности. Рекомендуем практики релаксации.",
            RiskLevel.HIGH: "Выявлен повышенный уровень стресса. Рекомендуем консультацию с психологом.",
            RiskLevel.CRITICAL: "Обнаружен критический уровень. Пожалуйста, свяжитесь с психологом как можно скорее.",
        }
        message = risk_messages.get(risk, risk_messages[RiskLevel.LOW])

    # Build detailed question responses list for teachers and psychologists
    questions_map = {q["id"]: q for q in config.get("questions", [])}
    question_responses = []
    for q_id, ans_val in answers_dict.items():
        q_info = questions_map.get(q_id)
        selected_text = str(ans_val)
        score_val = int(ans_val) if isinstance(ans_val, (int, float)) else 0
        if q_info and "options" in q_info:
            for opt in q_info["options"]:
                if opt.get("value") == ans_val:
                    selected_text = _extract_str(opt.get("label", ans_val))
                    break
        elif q_info:
            selected_text = "Да" if ans_val == 1 else "Нет"

        question_responses.append({
            "question_id": str(q_id),
            "selected_option": selected_text,
            "score": score_val,
        })

    return {
        "test_name": config["title"],
        "scales": scale_results,
        "overall_risk": risk,
        "reward_points": points,
        "message": message,
        "answers_json": {str(k): v for k, v in answers_dict.items()},
        "question_responses": question_responses,
    }

