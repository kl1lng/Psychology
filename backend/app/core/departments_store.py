import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.core.database import get_database

# Default initial departments for AISezim school system
DEFAULT_DEPARTMENTS: List[Dict[str, Any]] = [
    {
        "id": "dept-1",
        "name": "Математика, Информатика, Физика (МИФ)",
        "code": "MIPH2026",
        "created_at": "2026-01-15T00:00:00Z",
    },
    {
        "id": "dept-2",
        "name": "Казахский, русский и иностранные языки",
        "code": "LANG2026",
        "created_at": "2026-01-20T00:00:00Z",
    },
    {
        "id": "dept-3",
        "name": "Естественные науки (Химия, Биология, География)",
        "code": "SCI2026",
        "created_at": "2026-01-25T00:00:00Z",
    },
    {
        "id": "dept-4",
        "name": "История и общественные дисциплины",
        "code": "HUM2026",
        "created_at": "2026-02-01T00:00:00Z",
    },
    {
        "id": "dept-5",
        "name": "Физическая культура, искусство и технологии",
        "code": "TECH2026",
        "created_at": "2026-02-05T00:00:00Z",
    },
]

class DepartmentStore:
    """
    Department storage backed by the local PostgreSQL API with an in-process fallback.
    """
    _memory_departments: List[Dict[str, Any]] = [dict(d) for d in DEFAULT_DEPARTMENTS]

    @classmethod
    def list_all(cls) -> List[Dict[str, Any]]:
        try:
            sb = get_database()
            res = sb.table("departments").select("*").order("name").execute()
            return res.data or []
        except Exception:
            return [dict(d) for d in cls._memory_departments]

    @classmethod
    def get_by_id(cls, dept_id: str) -> Optional[Dict[str, Any]]:
        try:
            sb = get_database()
            res = sb.table("departments").select("*").eq("id", dept_id).execute()
            return res.data[0] if res.data else None
        except Exception:
            pass
        for d in cls._memory_departments:
            if d["id"] == dept_id:
                return d
        return None

    @classmethod
    def get_by_code(cls, code: str) -> Optional[Dict[str, Any]]:
        clean = code.strip().upper()
        try:
            sb = get_database()
            res = sb.table("departments").select("*").eq("code", clean).execute()
            return res.data[0] if res.data else None
        except Exception:
            pass
        for d in cls._memory_departments:
            if d["code"].upper() == clean:
                return d
        return None

    @classmethod
    def create(cls, name: str, code: str) -> Dict[str, Any]:
        clean_code = code.strip().upper()
        existing = cls.get_by_code(clean_code)
        if existing:
            raise ValueError(f"Кафедра с кодом '{clean_code}' уже существует")

        dept_id = str(uuid.uuid4())
        new_dept = {
            "id": dept_id,
            "name": name.strip(),
            "code": clean_code,
            "created_at": datetime.utcnow().isoformat(),
        }

        try:
            sb = get_database()
            res = sb.table("departments").insert(new_dept).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        cls._memory_departments.insert(0, new_dept)
        return new_dept

    @classmethod
    def update(cls, dept_id: str, name: Optional[str] = None, code: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_data: Dict[str, Any] = {}
        if name is not None:
            update_data["name"] = name.strip()
        if code is not None:
            clean_code = code.strip().upper()
            existing = cls.get_by_code(clean_code)
            if existing and existing["id"] != dept_id:
                raise ValueError(f"Кафедра с кодом '{clean_code}' уже существует")
            update_data["code"] = clean_code

        if not update_data:
            return cls.get_by_id(dept_id)

        try:
            sb = get_database()
            res = sb.table("departments").update(update_data).eq("id", dept_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        for d in cls._memory_departments:
            if d["id"] == dept_id:
                d.update(update_data)
                return d
        return None

    @classmethod
    def delete(cls, dept_id: str) -> bool:
        deleted_in_database = False
        try:
            sb = get_database()
            res = sb.table("departments").delete().eq("id", dept_id).execute()
            deleted_in_database = bool(res.data)
        except Exception:
            pass

        initial_len = len(cls._memory_departments)
        cls._memory_departments = [d for d in cls._memory_departments if d["id"] != dept_id]
        return deleted_in_database or len(cls._memory_departments) < initial_len
