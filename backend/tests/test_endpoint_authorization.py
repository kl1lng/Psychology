import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import admin, appointments, auth, departments, podcasts, qa, users
from app.core import security, departments_store


class FakeQuery:
    def __init__(self, table_name):
        self.table_name = table_name
        self.values = None

    def insert(self, values):
        self.values = values
        return self

    def execute(self):
        return SimpleNamespace(data=[self.values] if self.values else [])


class FakeDatabase:
    def table(self, table_name):
        return FakeQuery(table_name)


class RecordingQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.values = None

    def insert(self, values):
        self.values = values
        return self

    def select(self, *_args): return self
    def eq(self, *_args): return self
    def neq(self, *_args): return self
    def order(self, *_args, **_kwargs): return self
    def limit(self, *_args): return self

    def execute(self):
        if self.values is not None:
            self.database.inserted.setdefault(self.table_name, []).append(self.values)
            return SimpleNamespace(data=[self.values])
        return SimpleNamespace(data=[])


class RecordingDatabase:
    def __init__(self):
        self.inserted = {}

    def table(self, table_name):
        return RecordingQuery(self, table_name)


class EndpointAuthorizationTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        for module in (admin, appointments, auth, departments, podcasts, qa, users):
            app.include_router(module.router, prefix="/api/v1")
        self.client = TestClient(app)
        self.db_patch = patch.object(qa, "get_database", return_value=FakeDatabase())
        self.db_patch.start()
        self.addCleanup(self.db_patch.stop)
        self.memory_patch = patch.object(qa, "_IN_MEMORY_QA", [])
        self.memory_patch.start()
        self.addCleanup(self.memory_patch.stop)

    def request_as(self, method, path, role=None, subject="student-1", **kwargs):
        headers = kwargs.pop("headers", {})
        if role:
            headers["Authorization"] = f"Bearer test-{role}"
        with patch.object(
            security,
            "decode_token",
            side_effect=lambda token: {"sub": subject, "role": role} if token.startswith("test-") else {},
        ):
            return self.client.request(method, path, headers=headers, **kwargs)

    def test_sensitive_endpoints_require_authentication(self):
        requests = [
            ("GET", "/api/v1/qa/moderation"),
            ("POST", "/api/v1/qa/answer/missing"),
            ("GET", "/api/v1/appointments/"),
            ("GET", "/api/v1/users/another-user"),
            ("GET", "/api/v1/departments/"),
            ("GET", "/api/v1/departments/department-id"),
            ("GET", "/api/v1/podcasts/"),
        ]
        for method, path in requests:
            with self.subTest(method=method, path=path):
                response = self.client.request(method, path, json={"answer": "Ответ психолога"} if method == "POST" else None)
                self.assertEqual(response.status_code, 401)

    def test_student_cannot_use_staff_endpoints_or_read_another_profile(self):
        self.assertEqual(self.request_as("GET", "/api/v1/qa/moderation", role="student").status_code, 403)
        self.assertEqual(self.request_as("POST", "/api/v1/qa/answer/missing", role="student", json={"answer": "Ответ психолога"}).status_code, 403)
        self.assertEqual(self.request_as("GET", "/api/v1/appointments/", role="student").status_code, 403)
        self.assertEqual(self.request_as("GET", "/api/v1/users/another-user", role="student").status_code, 403)
        self.assertEqual(self.request_as("GET", "/api/v1/departments/", role="student").status_code, 403)

    def test_question_identity_comes_from_authenticated_session(self):
        response = self.request_as(
            "POST",
            "/api/v1/qa/ask",
            role="student",
            subject="verified-student",
            json={"title": "Нужен совет", "content": "Как справиться с волнением перед экзаменом?", "category": "Стресс", "student_id": "victim"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["student_id"], "verified-student")

    def test_appointment_cannot_be_created_for_another_student(self):
        response = self.request_as(
            "POST",
            "/api/v1/appointments/book",
            role="student",
            subject="verified-student",
            json={"student_id": "victim", "lang": "ru"},
        )
        self.assertEqual(response.status_code, 403)

    def test_guest_appointment_keeps_session_identity_for_chat_linkage(self):
        database = RecordingDatabase()
        with patch.object(appointments, "get_database", return_value=database):
            response = self.request_as(
                "POST",
                "/api/v1/appointments/book",
                role="guest",
                subject="guest_unique_session",
                json={"lang": "ru"},
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(database.inserted["appointments"][0]["student_id"], "guest_unique_session")

    def test_public_signup_cannot_create_staff_accounts(self):
        payload = {"email": "staff@school.kz", "password": "test-password", "full_name": "Тестовый сотрудник"}
        for role in ("admin", "psychologist"):
            with self.subTest(role=role):
                response = self.client.post("/api/v1/auth/register", json={**payload, "role": role})
                self.assertEqual(response.status_code, 403)

    def test_department_store_uses_fallback_when_database_client_is_unavailable(self):
        with patch.object(departments_store, "get_database", side_effect=RuntimeError("database unavailable")):
            self.assertEqual(departments_store.DepartmentStore.get_by_code("miph2026")["code"], "MIPH2026")

    def test_empty_database_result_does_not_resurrect_deleted_departments(self):
        class EmptyQuery:
            def select(self, *_args): return self
            def order(self, *_args): return self
            def eq(self, *_args): return self
            def execute(self): return SimpleNamespace(data=[])

        class EmptyDatabase:
            def table(self, *_args): return EmptyQuery()

        with patch.object(departments_store, "get_database", return_value=EmptyDatabase()):
            self.assertEqual(departments_store.DepartmentStore.list_all(), [])
            self.assertIsNone(departments_store.DepartmentStore.get_by_code("MIPH2026"))

    def test_admin_user_deletion_cleans_dependent_student_records(self):
        deleted_tables = []

        class DeleteQuery:
            def __init__(self, table): self.table = table
            def delete(self): return self
            def eq(self, *_args): return self
            def execute(self):
                deleted_tables.append(self.table)
                return SimpleNamespace(data=[])

        class DeleteDatabase:
            def table(self, table): return DeleteQuery(table)

        with patch.object(admin, "get_database", return_value=DeleteDatabase()):
            response = self.request_as("DELETE", "/api/v1/admin/users/deleted-student", role="admin")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            deleted_tables,
            ["assessment_results", "mood_entries", "psychologist_notes", "qa_questions", "appointments", "dialogs", "consultation_slots", "users"],
        )


if __name__ == "__main__":
    unittest.main()
