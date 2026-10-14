from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase import get_supabase
from app.core.departments_store import DepartmentStore
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentOut,
    DepartmentWithTeachers,
)
from app.core.security import get_current_admin

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=List[DepartmentOut])
async def list_departments():
    """List all school departments (resilient with Supabase & fallback)."""
    departments = DepartmentStore.list_all()
    return [DepartmentOut(**d) for d in departments]


@router.get("/{dept_id}", response_model=DepartmentWithTeachers)
async def get_department(dept_id: str):
    """Get department details along with its assigned teachers."""
    dept_data = DepartmentStore.get_by_id(dept_id)
    if not dept_data:
        raise HTTPException(status_code=404, detail="Кафедра не найдена")

    # Fetch teachers associated with this department if table exists
    teachers = []
    try:
        sb = get_supabase()
        teachers_res = sb.table("users").select("id, email, full_name, role, created_at").eq("department_id", dept_id).execute()
        teachers = teachers_res.data or []
    except Exception:
        teachers = []

    return DepartmentWithTeachers(
        id=dept_data["id"],
        name=dept_data["name"],
        code=dept_data["code"],
        created_at=dept_data.get("created_at"),
        teachers=teachers,
    )


@router.post("/", response_model=DepartmentOut)
async def create_department(payload: DepartmentCreate, admin: dict = Depends(get_current_admin)):
    """Create a new department (Admin only)."""
    try:
        new_dept = DepartmentStore.create(name=payload.name, code=payload.code)
        return DepartmentOut(**new_dept)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при создании кафедры: {e}")


@router.put("/{dept_id}", response_model=DepartmentOut)
async def update_department(dept_id: str, payload: DepartmentUpdate, admin: dict = Depends(get_current_admin)):
    """Update department info (Admin only)."""
    try:
        updated = DepartmentStore.update(dept_id=dept_id, name=payload.name, code=payload.code)
        if not updated:
            raise HTTPException(status_code=404, detail="Кафедра не найдена")
        return DepartmentOut(**updated)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении кафедры: {e}")


@router.delete("/{dept_id}")
async def delete_department(dept_id: str, admin: dict = Depends(get_current_admin)):
    """Delete department (Admin only)."""
    DepartmentStore.delete(dept_id)
    return {"message": "Кафедра успешно удалена", "id": dept_id}
