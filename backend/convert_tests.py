import json
import os

TESTS_DIR = os.path.join(os.path.dirname(__file__), "app", "data", "tests")

def convert_eysenck():
    path = os.path.join(TESTS_DIR, "eysenck_epi_a.json")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Convert title and desc
    data["title"] = {
        "ru": "Опросник Айзенка (EPI, форма A)",
        "kk": "Айзенк сауалнамасы (EPI, А түрі)"
    }
    data["description"] = {
        "ru": "Определяет черты личности: экстраверсия/интроверсия и нейротизм/эмоциональная устойчивость.",
        "kk": "Тұлғалық қасиеттерді анықтайды: экстраверсия/интроверсия және нейротизм/эмоционалдық тұрақтылық."
    }

    # Convert scales
    for scale in data["scales"]:
        if scale["id"] == "extraversion":
            scale["name"] = {
                "ru": "Экстраверсия / Интроверсия",
                "kk": "Экстраверсия / Интроверсия"
            }
            scale["description"] = {
                "ru": "Шкала социальной активности",
                "kk": "Әлеуметтік белсенділік шкаласы"
            }
        elif scale["id"] == "neurotism":
            scale["name"] = {
                "ru": "Нейротизм",
                "kk": "Нейротизм"
            }
            scale["description"] = {
                "ru": "Шкала эмоциональной стабильности",
                "kk": "Эмоционалды тұрақтылық шкаласы"
            }
        elif scale["id"] == "lie":
            scale["name"] = {
                "ru": "Шкала лжи",
                "kk": "Өтірік шкаласы"
            }
            scale["description"] = {
                "ru": "Определяет искренность ответов",
                "kk": "Жауаптардың шынайылығын анықтайды"
            }

        # Interpretations
        for interp in scale.get("interpretations", []):
            txt = interp["text"]
            interp["text"] = {
                "ru": txt,
                "kk": f"[Қаз] {txt}"
            }

    # Convert questions
    for q in data.get("questions", []):
        txt = q["text"]
        # Basic translations of common questions or placeholders
        q["text"] = {
            "ru": txt,
            "kk": f"[Қаз] {txt}"
        }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Eysenck converted.")

def convert_phillips():
    path = os.path.join(TESTS_DIR, "phillips_school.json")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["title"] = {
        "ru": "Тест школьной тревожности Филлипса",
        "kk": "Филлипстің мектеп мазасыздығы тесті"
    }
    data["description"] = {
        "ru": "Изучает уровень и характер тревожности, связанной со школой у детей младшего и среднего школьного возраста.",
        "kk": "Төменгі және орта мектеп жасындағы балалардың мектепке байланысты мазасыздық деңгейі мен сипатын зерттейді."
    }

    # Convert scales
    for scale in data["scales"]:
        name = scale["name"]
        desc = scale.get("description", "")
        scale["name"] = {"ru": name, "kk": f"[Қаз] {name}"}
        scale["description"] = {"ru": desc, "kk": f"[Қаз] {desc}"}

        for interp in scale.get("interpretations", []):
            txt = interp["text"]
            interp["text"] = {
                "ru": txt,
                "kk": f"[Қаз] {txt}"
            }

    # Convert questions
    for q in data.get("questions", []):
        txt = q["text"]
        q["text"] = {
            "ru": txt,
            "kk": f"[Қаз] {txt}"
        }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Phillips converted.")

if __name__ == "__main__":
    convert_eysenck()
    convert_phillips()
