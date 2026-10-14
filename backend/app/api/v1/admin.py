import os
import uuid
import math
import logging
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Cookie, Header
from app.core.security import hash_password, decode_token, get_current_admin
from app.core.supabase import get_supabase
from app.schemas.user import UserCreateAdmin, UserOut, UserRole
from app.core.departments_store import DepartmentStore

router = APIRouter(prefix="/admin", tags=["Admin"])

logger = logging.getLogger("aisezim.admin")

from app.core.config import settings

def check_dev_tools_enabled():
    """Verify that DEV tools are explicitly allowed via ENABLE_DEV_TOOLS configuration."""
    enabled = settings.enable_dev_tools or os.getenv("ENABLE_DEV_TOOLS", "false").lower() in ("true", "1", "yes")
    if not enabled:
        raise HTTPException(
            status_code=403,
            detail="Dev-инструменты отключены в данной среде (ENABLE_DEV_TOOLS=false)"
        )


@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(get_current_admin)):
    """Get high-level KPI metrics for Admin Dashboard (optimized query)."""
    sb = get_supabase()
    try:
        users_res = sb.table("users").select("id, role").execute()
        users_data = users_res.data or []

        students_count = sum(1 for u in users_data if u.get("role") == "student")
        teachers_count = sum(1 for u in users_data if u.get("role") == "teacher")
        psychologists_count = sum(1 for u in users_data if u.get("role") == "psychologist")

        departments = DepartmentStore.list_all()
        depts_count = len(departments)

        return {
            "total_students": students_count,
            "total_teachers": teachers_count,
            "total_psychologists": psychologists_count,
            "total_departments": depts_count,
        }
    except Exception as e:
        logger.error("Failed to fetch admin stats: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка загрузки статистики")


@router.get("/users")
async def get_users_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    role: Optional[str] = None,
    department_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin),
):
    """
    Optimized endpoint for Admin User Directory:
    1. Selects only needed UI fields (eliminates password hash and heavy bloat).
    2. Single batch join/lookup for departments (eliminates N+1).
    3. Server-side SQL pagination (Limit / Offset) and search filter.
    """
    sb = get_supabase()
    try:
        page = max(1, page)
        limit = min(100, max(1, limit))
        start = (page - 1) * limit
        end = start + limit - 1

        # 1. Base query with specific columns
        query = sb.table("users").select(
            "id, email, full_name, role, class_id, points_balance, created_at",
            count="exact"
        )

        # 2. Search filter at database level
        if search and search.strip():
            s = search.strip()
            query = query.or_(f"full_name.ilike.%{s}%,email.ilike.%{s}%,class_id.ilike.%{s}%")

        # 3. Role filter
        if role and role.upper() != "ALL":
            query = query.eq("role", role.lower())

        # 4. Department filter
        if department_id and department_id.upper() != "ALL":
            try:
                query = query.eq("department_id", department_id)
            except Exception:
                pass

        # 5. Order and Range (Pagination)
        res = query.order("created_at", desc=True).range(start, end).execute()
        users = res.data or []
        total_count = res.count if res.count is not None else len(users)

        # 6. Single batch query for departments lookup (Eliminates N+1 query problem)
        departments = DepartmentStore.list_all()
        dept_map = {d["id"]: d for d in departments}

        for u in users:
            d_id = u.get("department_id")
            if d_id and d_id in dept_map:
                u["department"] = dept_map[d_id]
            else:
                u["department"] = None

        return {
            "items": users,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": math.ceil(total_count / limit) if limit > 0 else 1,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch users list: %s", e, exc_info=True)
        return {
            "items": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 1,
        }


@router.post("/users", response_model=UserOut)
async def create_user_by_admin(
    payload: UserCreateAdmin,
    admin: dict = Depends(get_current_admin),
):
    """Endpoint for admins to create teacher, psychologist or student users."""
    sb = get_supabase()

    # Check if email exists
    existing = sb.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    user_id = str(uuid.uuid4())
    hashed = hash_password(payload.password)

    new_user = {
        "id": user_id,
        "email": payload.email,
        "full_name": payload.full_name,
        "password_hash": hashed,
        "role": payload.role.value,
        "class_id": payload.class_id if payload.role == UserRole.STUDENT else None,
        "points_balance": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    if payload.department_id and payload.role == UserRole.TEACHER:
        new_user["department_id"] = payload.department_id

    try:
        sb.table("users").insert(new_user).execute()
    except Exception as e:
        logger.error("Failed to create user: %s", e, exc_info=True)
        if "department_id" in str(e).lower() and "department_id" in new_user:
            new_user.pop("department_id", None)
            sb.table("users").insert(new_user).execute()
        else:
            raise HTTPException(status_code=500, detail="Ошибка создания пользователя")

    return UserOut(
        id=user_id,
        email=new_user["email"],
        full_name=new_user["full_name"],
        role=UserRole(new_user["role"]),
        class_id=new_user.get("class_id"),
        department_id=new_user.get("department_id"),
        points_balance=0,
    )


@router.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Delete a user account from database."""
    sb = get_supabase()

    # 1. Clean up associated user records if any
    for table in ["assessment_results", "mood_entries", "psychologist_notes", "qa_questions"]:
        try:
            sb.table(table).delete().eq("student_id", user_id).execute()
        except Exception:
            pass

    # 2. Delete user from users table
    try:
        sb.table("users").delete().eq("id", user_id).execute()
        return {
            "status": "ok",
            "message": f"Пользователь успешно удален из системы",
            "deleted_id": user_id,
        }
    except Exception as e:
        logger.error("Failed to delete user %s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при удалении пользователя")




# ─── 1. Clear All Demo Data ───────────────────────────────────────────────────
@router.post("/clear-demo-data")
async def clear_demo_data(admin: dict = Depends(get_current_admin)):
    """
    Safely and irreversibly deletes only demo records (matching demo_% IDs or emails).
    Leaves real users and real data completely untouched.
    """
    check_dev_tools_enabled()
    sb = get_supabase()

    deleted_counts = {
        "users": 0,
        "assessments": 0,
        "mood": 0,
        "qa": 0,
        "dialogs": 0,
        "notes": 0,
    }

    try:
        # Fetch all demo users
        users_res = sb.table("users").select("id").like("email", "demo_%").execute()
        demo_user_ids = [str(u["id"]) for u in (users_res.data or [])]

        if demo_user_ids:
            for uid in demo_user_ids:
                # 1. Assessment results
                try:
                    res_a = sb.table("assessment_results").delete().eq("student_id", uid).execute()
                    deleted_counts["assessments"] += len(res_a.data or [])
                except Exception:
                    pass

                # 2. Mood entries
                try:
                    res_m = sb.table("mood_entries").delete().eq("student_id", uid).execute()
                    deleted_counts["mood"] += len(res_m.data or [])
                except Exception:
                    pass

                # 3. QA questions (if table created)
                try:
                    res_q = sb.table("qa_questions").delete().eq("student_id", uid).execute()
                    deleted_counts["qa"] += len(res_q.data or [])
                except Exception:
                    pass

                # 4. Psychologist notes (if table created)
                try:
                    res_n = sb.table("psychologist_notes").delete().eq("student_id", uid).execute()
                    deleted_counts["notes"] += len(res_n.data or [])
                except Exception:
                    pass

                # 5. Dialogs & Chat messages
                try:
                    d_res = sb.table("dialogs").select("id").eq("student_id", uid).execute()
                    for d in (d_res.data or []):
                        sb.table("chat_messages").delete().eq("dialog_id", d["id"]).execute()
                    res_d = sb.table("dialogs").delete().eq("student_id", uid).execute()
                    deleted_counts["dialogs"] += len(res_d.data or [])
                except Exception:
                    pass

                # 6. Delete user
                try:
                    res_u = sb.table("users").delete().eq("id", uid).execute()
                    deleted_counts["users"] += len(res_u.data or [])
                except Exception:
                    pass

        # Additional wildcard cleanup
        try:
            sb.table("users").delete().like("email", "demo_%").execute()
        except Exception:
            pass

    except Exception as e:
        logger.error("Failed to clear demo data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при очистке демо-данных")

    return {
        "status": "ok",
        "message": "Все демо-данные успешно удалены без влияния на реальных пользователей.",
        "deleted": deleted_counts,
    }


# ─── 2. Seed / Recreate Demo Data ─────────────────────────────────────────────
@router.post("/seed-demo-data")
async def seed_demo_data(admin: dict = Depends(get_current_admin)):
    """
    Seeds 12 realistic assessment results, mood logs, QA questions for classes 8A, 9B, 10A, 11A.
    Uses valid UUIDs for all user and child foreign key relationships.
    """
    check_dev_tools_enabled()
    sb = get_supabase()
    now = datetime.utcnow()

    try:
        # Step 1: Clean prior demo data
        await clear_demo_data(admin)

        # Step 2: 12 Demo students definitions with generated UUIDs
        demo_profiles = [
            {"email": "demo_aibar.8a@school.kz", "full_name": "Айбар Серікұлы", "role": "student", "class_id": "8A", "points_balance": 180},
            {"email": "demo_diana.8a@school.kz", "full_name": "Диана Ахметова", "role": "student", "class_id": "8A", "points_balance": 150},
            {"email": "demo_danial.8a@school.kz", "full_name": "Даниал Жұмабек", "role": "student", "class_id": "8A", "points_balance": 90},
            {"email": "demo_alina.9b@school.kz", "full_name": "Алина Ким", "role": "student", "class_id": "9B", "points_balance": 220},
            {"email": "demo_arman.9b@school.kz", "full_name": "Арман Маратов", "role": "student", "class_id": "9B", "points_balance": 70},
            {"email": "demo_kamila.9b@school.kz", "full_name": "Камила Сағындықова", "role": "student", "class_id": "9B", "points_balance": 130},
            {"email": "demo_sanzhar.10a@school.kz", "full_name": "Санжар Болатов", "role": "student", "class_id": "10A", "points_balance": 310},
            {"email": "demo_madina.10a@school.kz", "full_name": "Мадина Төлегенова", "role": "student", "class_id": "10A", "points_balance": 160},
            {"email": "demo_nursultan.10a@school.kz", "full_name": "Нұрсұлтан Ержанов", "role": "student", "class_id": "10A", "points_balance": 110},
            {"email": "demo_sofia.11a@school.kz", "full_name": "София Васильева", "role": "student", "class_id": "11A", "points_balance": 280},
            {"email": "demo_eldar.11a@school.kz", "full_name": "Эльдар Ибрагимов", "role": "student", "class_id": "11A", "points_balance": 190},
            {"email": "demo_asel.11a@school.kz", "full_name": "Әсел Қасымова", "role": "student", "class_id": "11A", "points_balance": 80},
        ]

        created_users = []
        for p in demo_profiles:
            uid = str(uuid.uuid4())
            user_data = {
                "id": uid,
                "email": p["email"],
                "full_name": p["full_name"],
                "password_hash": hash_password(secrets.token_urlsafe(32)),
                "role": p["role"],
                "class_id": p["class_id"],
                "points_balance": p["points_balance"],
                "created_at": now.isoformat(),
            }
            sb.table("users").insert(user_data).execute()
            created_users.append(user_data)

        u = created_users

        # Step 3: Realistic assessment records
        assessments_data = [
            {"test_id": "luskanova_motivation", "test_name": "Методика изучения школьной мотивации (Н.Г. Лусканова)", "student_id": u[0]["id"], "risk": "LOW", "points": 80},
            {"test_id": "phillips_school", "test_name": "Тест школьной тревожности Филлипса", "student_id": u[1]["id"], "risk": "MEDIUM", "points": 70},
            {"test_id": "luskanova_motivation", "test_name": "Методика изучения школьной мотивации (Н.Г. Лусканова)", "student_id": u[2]["id"], "risk": "CRITICAL", "points": 60},
            {"test_id": "klimov_ddo", "test_name": "Дифференциально-диагностический опросник (ДДО Е.А. Климов)", "student_id": u[3]["id"], "risk": "LOW", "points": 80},
            {"test_id": "phillips_school", "test_name": "Тест школьной тревожности Филлипса", "student_id": u[4]["id"], "risk": "HIGH", "points": 60},
            {"test_id": "eysenck_epi_a", "test_name": "Опросник Айзенка (EPI, форма A)", "student_id": u[5]["id"], "risk": "LOW", "points": 80},
            {"test_id": "klimov_ddo", "test_name": "Дифференциально-диагностический опросник (ДДО Е.А. Климов)", "student_id": u[6]["id"], "risk": "LOW", "points": 80},
            {"test_id": "luskanova_motivation", "test_name": "Методика изучения школьной мотивации (Н.Г. Лусканова)", "student_id": u[7]["id"], "risk": "LOW", "points": 80},
            {"test_id": "phillips_school", "test_name": "Тест школьной тревожности Филлипса", "student_id": u[8]["id"], "risk": "MEDIUM", "points": 70},
            {"test_id": "klimov_ddo", "test_name": "Дифференциально-диагностический опросник (ДДО Е.А. Климов)", "student_id": u[9]["id"], "risk": "LOW", "points": 80},
            {"test_id": "eysenck_epi_a", "test_name": "Опросник Айзенка (EPI, форма A)", "student_id": u[10]["id"], "risk": "MEDIUM", "points": 70},
            {"test_id": "luskanova_motivation", "test_name": "Методика изучения школьной мотивации (Н.Г. Лусканова)", "student_id": u[11]["id"], "risk": "HIGH", "points": 60},
            {"test_id": "phillips_school", "test_name": "Тест школьной тревожности Филлипса", "student_id": u[0]["id"], "risk": "LOW", "points": 80},
            {"test_id": "klimov_ddo", "test_name": "Дифференциально-диагностический опросник (ДДО Е.А. Климов)", "student_id": u[2]["id"], "risk": "LOW", "points": 80},
        ]

        inserted_tests = 0
        for item in assessments_data:
            try:
                sb.table("assessment_results").insert({
                    "id": str(uuid.uuid4()),
                    "test_id": item["test_id"],
                    "test_name": item["test_name"],
                    "student_id": item["student_id"],
                    "risk_level": item["risk"],
                    "reward_points": item["points"],
                    "created_at": now.isoformat(),
                }).execute()
                inserted_tests += 1
            except Exception as e_a:
                logger.warning("Error inserting assessment: %s", e_a)

        # Step 4: Mood entries
        mood_data = [
            {"student_id": u[0]["id"], "stress": 3, "note": "Хороший спокойный день"},
            {"student_id": u[1]["id"], "stress": 6, "note": "Переживаю перед контрольной по алгебре"},
            {"student_id": u[2]["id"], "stress": 9, "note": "Сильная усталость и дезадаптация"},
            {"student_id": u[3]["id"], "stress": 2, "note": "Отличное настроение, готовились к олимпиаде"},
            {"student_id": u[4]["id"], "stress": 8, "note": "Тяжело совмещать секции и уроки"},
            {"student_id": u[5]["id"], "stress": 4, "note": "Обычный учебный день"},
            {"student_id": u[6]["id"], "stress": 3, "note": "Всё по плану"},
            {"student_id": u[7]["id"], "stress": 5, "note": "Немного волнуюсь за оценки"},
            {"student_id": u[8]["id"], "stress": 6, "note": "Много домашней работы"},
            {"student_id": u[9]["id"], "stress": 2, "note": "Вдохновение после урока литературы"},
            {"student_id": u[10]["id"], "stress": 4, "note": "Нормальное самочувствие"},
            {"student_id": u[11]["id"], "stress": 8, "note": "Чувствую тревогу по поводу экзаменов"},
        ]

        inserted_moods = 0
        for m in mood_data:
            try:
                sb.table("mood_entries").insert({
                    "id": str(uuid.uuid4()),
                    "student_id": m["student_id"],
                    "stress_level": m["stress"],
                    "note": m["note"],
                    "created_at": now.isoformat(),
                }).execute()
                inserted_moods += 1
            except Exception as e_m:
                logger.warning("Error inserting mood: %s", e_m)

        # Step 5: Demo QA Questions (if table exists)
        demo_qa = [
            {
                "id": str(uuid.uuid4()),
                "student_id": u[2]["id"],
                "title": "Как справиться со страхом провала на экзаменах?",
                "content": "Очень боюсь подвести родителей и учителей на выпускных экзаменах, от страха не могу спать.",
                "category": "Стресс",
                "answer": "Страх перед важными событиями естественен. Сосредоточьтесь на поэтапной подготовке, используйте дыхательные техники 4-4-4-4 и помните: ваша ценность не зависит от одной оценки.",
                "is_published": True,
                "likes_count": 5,
                "created_at": now.isoformat(),
                "answered_at": now.isoformat(),
            },
            {
                "id": str(uuid.uuid4()),
                "student_id": u[4]["id"],
                "title": "Как выбрать профессию, если нравятся разные сферы?",
                "content": "Интересует и программирование, и дизайн, и психология. Как определиться с выбором специальности?",
                "category": "Профориентация",
                "answer": "Современный мир поощряет гибридные навыки (T-shaped). Например, UX/UI дизайн или разработка AI-интерфейсов объединяют код, визуал и психологию человека.",
                "is_published": True,
                "likes_count": 3,
                "created_at": now.isoformat(),
                "answered_at": now.isoformat(),
            },
        ]

        for q in demo_qa:
            try:
                sb.table("qa_questions").insert(q).execute()
            except Exception as e_q:
                logger.debug("QA table insert optional skip: %s", e_q)

        logger.info(
            "SEED SUCCESS: Generated %d students, %d assessments, %d moods",
            len(created_users), inserted_tests, inserted_moods
        )

        return {
            "status": "ok",
            "message": f"Демо-база успешно пересоздана: {len(created_users)} учеников, {inserted_tests} тестов, {inserted_moods} записей настроения.",
            "count": len(created_users),
            "students_count": len(created_users),
            "assessments_count": inserted_tests,
            "mood_count": inserted_moods,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("SEED ERROR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка при генерации демо-данных")
