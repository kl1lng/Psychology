"""
AISezim Bot Operator — Multi-tiered Psychological Assistant & Router.

Architecture:
1. Level 1 Interception (Regex Red Flags): Critical crisis/self-harm triggers bypass LLM and immediately return safety scripts offering psychologist appointment.
2. Level 2 & 3 Soft Escalation: Detects exams anxiety, bullying, family conflicts, or loneliness and softly guides to booking an appointment.
3. Base Support & Active Listening: Empathic responses validated against the strict AISezim system prompt, offering Box Breathing and emotional support.
"""

import json
import os
import re
from typing import Optional, Tuple, List, Dict, Any

FAQ_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "faq_knowledge.json")

# ─── System Prompt for LLM Integration ─────────────────────────────────────────
AI_SEZIM_SYSTEM_PROMPT = """Ты — AISezim, эмпатичный психологический ассистент для школьников. 
Твоя задача: оказывать первичную эмоциональную поддержку методом активного слушания.

СТРОГИЕ ПРАВИЛА:
1. НИКАКИХ ДИАГНОЗОВ: Ты не врач. Не ставь диагнозы (депрессия, РЛ и т.д.) и не назначай лечение.
2. КОРОТКИЕ ОТВЕТЫ: Пиши максимум 2-3 коротких предложения. Школьники не читают длинные тексты.
3. ВАЛИДАЦИЯ ЧУВСТВ: Всегда начинай с признания эмоций (например, "Это нормально, что ты злишься", "Мне жаль, что ты с этим столкнулся").
4. ПРАКТИКА: При тревоге или стрессе предложи технику "Квадратное дыхание (Box Breathing)".
5. ЭСКАЛАЦИЯ: Если ученик пишет о проблеме более 2 раз подряд или прямо просит помощи, ты ОБЯЗАН предложить ему запись к школьному психологу. Для этого вызови функцию (Tool Call) `suggest_psychologist_appointment`.
6. ЯЗЫК: Отвечай на том же языке, на котором пишет пользователь (Казахский или Русский)."""

# ─── Level 1: Red Flags / Crisis Trigger Regex Patterns ────────────────────────
# RU: смысл жизни, не хочу жить, убить, покончить, резать, бьют, ненавижу себя, нет выхода, больно
# KZ: өлгім, өмір сүргім, мағынасыз, өлу, ұрды, қинады, жек көрем, шаршадым, шыдамым қалмады
CRISIS_PATTERNS_RU = [
    r"смысл\s+жизни",
    r"не\s+хочу\s+жить",
    r"уста(л|ла)\s+жить",
    r"убит(ь|ься)",
    r"покончит(ь|ься)",
    r"резат(ь|ься|ь\s+вены)",
    r"вскрыт(ь|ься)\s+вены",
    r"спрыгнут(ь)",
    r"бьют(\s+меня)?",
    r"избива(ют|ет)",
    r"ненавижу\s+себя",
    r"нет\s+выхода",
    r"невыносимо\s+больно",
    r"суицид",
    r"умерет(ь)",
    r"хочу\s+сдохнут(ь)",
]

CRISIS_PATTERNS_KZ = [
    r"өлгім(\s+келеді)?",
    r"өмір\s+сүргім\s+келмейді",
    r"мағынасыз",
    r"өлу(\s+туралы)?",
    r"өзіме\s+қол\s+жұмса(у|дым)?",
    r"ұрды(\s+мені)?",
    r"соққыға\s+жықты",
    r"қина(ды|лып\s+кеттім)",
    r"жек\s+көрем(\s+өзімді)?",
    r"шаршадым(\s+өмірден)?",
    r"шыдамым\s+қалмады",
    r"тамыр\s+кесу",
]

# ─── Level 2 & 3: Soft Escalation Patterns ─────────────────────────────────────
SOFT_ESCALATION_PATTERNS_RU = [
    r"ент|ент-ке|экзамен|экзамены|сесси(я|и)|завал(ил|ила|ю)|боюсь\s+не\s+сдам",
    r"буллинг|булли(ть|нга)|травл(я|ят)|гноб(ят|ят\s+в\s+школе)|издева(ются|ется)|дразн(ят)",
    r"ссора\s+с\s+родителями|скандал\s+дома|родители\s+орут|мама\s+ругает|папа\s+не\s+понимает",
    r"одинок(о|чество)|никому\s+не\s+нужен|нет\s+друзей|все\s+отвернулись|апати(я)",
    r"записаться\s+к\s+психологу|нужен\s+психолог|помощь\s+психолога|хочу\s+поговорить\s+с\s+психологом",
]

SOFT_ESCALATION_PATTERNS_KZ = [
    r"ұбт|ұбт-дан|емтихан|емтихандар|тесттен\s+құла(у|дым)",
    r"буллинг|мазақ(тайды)?|кемсіт(у|еді)|шеттет(у|еді)|мазақ\s+қылады",
    r"ата-ана(ммен)?\s+ұрыс|үйдегі\s+ұрыс|анам\s+ұрысады|әкем\s+түсінбейді",
    r"жалғыз(бын|дық)|ешкім\s+түсінбейді|достарым\s+жоқ|көңіл-күйім\s+жоқ",
    r"психологқа\s+жазыл(у|ғым)|психолог\s+керек|маманмен\s+сөйлес(кім)",
]

# Breathing practice triggers
BREATHING_PATTERNS = [
    r"паник(а|ую)|тревог(а|и|у|но)|страшн(о|а)|колотится\s+сердце|не\s+могу\s+дышать|стресс",
    r"мазасыз(дық)?|қобалж(у|ып)|үрей|жүрегім\s+дүрсілдеп|тыныс\s+ала\s+алмай",
]

_faq_data: Optional[list] = None


def _load_faq() -> list:
    global _faq_data
    if _faq_data is None:
        try:
            with open(FAQ_PATH, "r", encoding="utf-8") as f:
                _faq_data = json.load(f)["entries"]
        except Exception:
            _faq_data = []
    return _faq_data


def detect_language(text: str) -> str:
    """Detect whether user text is Kazakh or Russian."""
    kz_specific_chars = set("әіңғүұқөһӘІҢҒҮҰҚӨҺ")
    if any(c in kz_specific_chars for c in text):
        return "kk"

    # Check common Kazakh word stems
    kz_words = {"сәлем", "қалай", "рақмет", "маған", "сенің", "бірақ", "емес", "неге", "жақсы", "өмір", "мектеп"}
    words = set(re.findall(r"\b\w+\b", text.lower()))
    if len(words & kz_words) > 0:
        return "kk"

    return "ru"


def check_level_1_crisis(text: str) -> Tuple[bool, str]:
    """Check for Level 1 Red Flag triggers."""
    norm = text.lower()
    for pattern in CRISIS_PATTERNS_KZ:
        if re.search(pattern, norm):
            return True, "kk"
    for pattern in CRISIS_PATTERNS_RU:
        if re.search(pattern, norm):
            return True, "ru"
    return False, "ru"


def check_level_2_soft_escalation(text: str) -> Tuple[bool, str]:
    """Check for Level 2/3 Soft Escalation triggers (exams, bullying, family, loneliness)."""
    norm = text.lower()
    for pattern in SOFT_ESCALATION_PATTERNS_KZ:
        if re.search(pattern, norm):
            return True, "kk"
    for pattern in SOFT_ESCALATION_PATTERNS_RU:
        if re.search(pattern, norm):
            return True, "ru"
    return False, "ru"


def is_breathing_request(text: str) -> bool:
    norm = text.lower()
    for pattern in BREATHING_PATTERNS:
        if re.search(pattern, norm):
            return True
    return False


def get_level_1_script(lang: str) -> Dict[str, Any]:
    """Return Level 1 Immediate Crisis Script."""
    if lang == "kk":
        return {
            "reply": "Маған сенің қауіпсіздігің өте маңызды. Сенің қазір қиын жағдайда екеніңді көріп тұрмын және бұл жағдайда саған нағыз маманның көмегі қажет. Мен дәл қазір мектеп психологына кездесуге жазуға көмектесейін. Уақытты таңдаймыз ба?",
            "is_crisis": True,
            "suggest_appointment": True,
            "quick_actions": ["Иә, жазылу"],
        }
    return {
        "reply": "Мне очень важна твоя безопасность. Я вижу, что тебе сейчас тяжело, и в такой ситуации нужна помощь настоящего специалиста. Давай я прямо сейчас помогу тебе записаться к школьному психологу. Выберем время?",
        "is_crisis": True,
        "suggest_appointment": True,
        "quick_actions": ["Да, записаться"],
    }


def get_level_2_soft_script(lang: str) -> Dict[str, Any]:
    """Return Level 2 Soft Escalation Script."""
    if lang == "kk":
        return {
            "reply": "Бұл жағдайды жалғыз жеңу қиын болуы мүмкін. Мұндай кезде маманмен сөйлескен өте жақсы көмектеседі. Мектеп психологы саған көмектесуге дайын, бұл толықтай құпия өтеді. Кездесуге жазып қояйын ба?",
            "is_crisis": False,
            "suggest_appointment": True,
            "quick_actions": ["Иә, жазылу"],
        }
    return {
        "reply": "С такими вещами бывает очень сложно справиться в одиночку. В такие моменты разговор со специалистом может сильно помочь. Наш школьный психолог готов тебя выслушать, это полностью конфиденциально. Записать тебя на прием?",
        "is_crisis": False,
        "suggest_appointment": True,
        "quick_actions": ["Да, записаться"],
    }


def get_breathing_script(lang: str) -> Dict[str, Any]:
    """Return Box Breathing practice script."""
    if lang == "kk":
        return {
            "reply": "Сенің сезіміңді түсінемін, қобалжу немесе алаңдау — бұл қалыпты жағдай. «Шаршы тыныс алу» әдісін жасап көрейік: 4 секунд ішке тыныс ал, 4 секунд деміңді ұста, 4 секунд баяу шығар және 4 секунд кідір. Бұл денені тез тыныштандыруға көмектеседі.",
            "is_crisis": False,
            "suggest_appointment": False,
            "quick_actions": ["Тыныс алу жаттығуы", "Психологпен сөйлесу"],
        }
    return {
        "reply": "Я слышу тебя, и это совершенно нормально — чувствовать тревогу. Давай попробуем простое упражнение: сделай глубокий вдох на 4 счёта, задержи дыхание на 4 счёта, выдохни на 4 и снова задержи. Повтори это 3-4 раза, это поможет успокоить тело.",
        "is_crisis": False,
        "suggest_appointment": False,
        "quick_actions": ["Дыхательное упражнение", "Поговорить с психологом"],
    }


def find_faq_answer(user_message: str, lang: str = "ru") -> Optional[str]:
    """Search FAQ entries by keyword matching."""
    faq = _load_faq()
    normalized_msg = user_message.lower().strip()

    best_match = None
    best_score = 0

    for entry in faq:
        score = 0
        for keyword in entry.get("keywords", []):
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, normalized_msg):
                score += 1

        if score > best_score:
            best_score = score
            best_match = entry

    if best_match and best_score > 0:
        return best_match.get("answer")

    return None


def get_general_empathic_response(user_message: str, lang: str = "ru") -> str:
    """Generate a brief 2-sentence empathic response following AISezim guidelines."""
    if lang == "kk":
        return (
            "Сенің сезімдерің маңызды және кез келген жағдайдан шығудың жолы бар. "
            "Өзіңді қалай сезініп жатқаның туралы көбірек айтқың келе ме, әлде психологтан кеңес алғың келе ме?"
        )
    return (
        "Мне очень жаль, что ты проходишь через это, твои эмоции абсолютно понятны. "
        "Хочешь рассказать подробнее о том, что произошло, или мы можем сразу связаться с психологом?"
    )


# ─── Main Router Pipeline ─────────────────────────────────────────────────────
def process_chat_message(user_message: str, forced_lang: Optional[str] = None) -> Dict[str, Any]:
    """
    Main routing pipeline:
    1. Detect Language
    2. Check Level 1 Red Flags (Hardcoded Safety Script & Immediate appointment offer)
    3. Check Level 2/3 Soft Escalation (Exams, Bullying, Parents, Loneliness)
    4. Check Box Breathing Trigger
    5. FAQ Knowledge Base Matching
    6. General Empathic Active Listening
    """
    lang = forced_lang or detect_language(user_message)

    # 1. Level 1: Crisis Red Flags
    is_crisis, crisis_lang = check_level_1_crisis(user_message)
    if is_crisis:
        return get_level_1_script(crisis_lang or lang)

    # 2. Level 2 & 3: Soft Escalation
    is_soft, soft_lang = check_level_2_soft_escalation(user_message)
    if is_soft:
        return get_level_2_soft_script(soft_lang or lang)

    # 3. Practice: Box Breathing
    if is_breathing_request(user_message):
        return get_breathing_script(lang)

    # 4. FAQ Knowledge Base
    faq_ans = find_faq_answer(user_message, lang)
    if faq_ans:
        return {
            "reply": faq_ans,
            "is_crisis": False,
            "suggest_appointment": False,
            "quick_actions": [],
        }

    # 5. Empathic Active Listening Fallback
    empathic_reply = get_general_empathic_response(user_message, lang)
    return {
        "reply": empathic_reply,
        "is_crisis": False,
        "suggest_appointment": False,
        "quick_actions": ["Психологпен сөйлесу" if lang == "kk" else "Поговорить с психологом"],
    }


# Backwards-compatible wrappers
def process_message_with_emergency_check(user_message: str, lang: str = "ru") -> Tuple[str, bool]:
    res = process_chat_message(user_message, lang)
    return res["reply"], res["is_crisis"]


def process_message(user_message: str) -> str:
    res = process_chat_message(user_message)
    return res["reply"]
