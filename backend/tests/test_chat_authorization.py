import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import chat
from app.core import security


class FakeQuery:
    def __init__(self, database, table_name):
        self.database = database
        self.table_name = table_name
        self.operation = "select"
        self.filters = {}
        self.values = None

    def select(self, *_args):
        self.operation = "select"
        return self

    def insert(self, values):
        self.operation = "insert"
        self.values = values
        return self

    def update(self, values):
        self.operation = "update"
        self.values = values
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def neq(self, *_args):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, *_args):
        return self

    def execute(self):
        if self.operation == "insert":
            self.database.inserted.setdefault(self.table_name, []).append(self.values)
            return SimpleNamespace(data=[self.values])
        if self.table_name == "dialogs" and self.operation == "select":
            if "id" in self.filters and self.filters["id"] == self.database.dialog["id"]:
                return SimpleNamespace(data=[self.database.dialog])
            if "student_id" in self.filters and self.filters["student_id"] == self.database.dialog["student_id"]:
                return SimpleNamespace(data=[self.database.dialog])
            return SimpleNamespace(data=[])
        if self.table_name == "chat_messages" and self.operation == "select":
            return SimpleNamespace(data=[])
        return SimpleNamespace(data=[])


class FakeDatabase:
    def __init__(self, student_id="owner"):
        self.dialog = {"id": "11111111-1111-1111-1111-111111111111", "student_id": student_id, "status": "BOT", "created_at": "2026-01-01T00:00:00Z"}
        self.inserted = {}

    def table(self, table_name):
        return FakeQuery(self, table_name)


class ChatAuthorizationTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(chat.router, prefix="/api/v1")
        self.client = TestClient(app)
        self.database = FakeDatabase()
        self.database_patch = patch.object(chat, "get_database", return_value=self.database)
        self.database_patch.start()
        self.addCleanup(self.database_patch.stop)

    def request_as(self, method, path, role=None, subject="owner", **kwargs):
        headers = kwargs.pop("headers", {})
        if role:
            headers["Authorization"] = f"Bearer test-{role}"
        with patch.object(
            security,
            "decode_token",
            side_effect=lambda token: {"sub": subject, "role": role} if token.startswith("test-") else {},
        ):
            return self.client.request(method, path, headers=headers, **kwargs)

    def test_chat_reads_and_psychologist_actions_require_authentication(self):
        self.assertEqual(self.client.get("/api/v1/chat/waiting").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/chat/dialog/11111111-1111-1111-1111-111111111111/messages").status_code, 401)
        self.assertEqual(
            self.client.post("/api/v1/chat/reply", json={"dialog_id": "11111111-1111-1111-1111-111111111111", "content": "Ответ"}).status_code,
            401,
        )

    def test_student_cannot_read_or_reply_to_another_students_dialog(self):
        messages = self.request_as("GET", "/api/v1/chat/dialog/11111111-1111-1111-1111-111111111111/messages", role="student", subject="other")
        history = self.request_as("GET", "/api/v1/chat/history/11111111-1111-1111-1111-111111111111", role="student", subject="other")
        reply = self.request_as(
            "POST", "/api/v1/chat/reply", role="student", json={"dialog_id": "11111111-1111-1111-1111-111111111111", "content": "Ответ"}
        )

        self.assertEqual(messages.status_code, 403)
        self.assertEqual(history.status_code, 403)
        self.assertEqual(reply.status_code, 403)

    def test_student_id_in_request_body_cannot_override_authenticated_guest(self):
        self.database.dialog = {"id": "11111111-1111-1111-1111-111111111111", "student_id": "legacy_session", "status": "BOT"}
        with patch.object(chat, "process_chat_message", return_value={"reply": "Привет", "is_crisis": False}):
            response = self.request_as(
                "POST",
                "/api/v1/chat/message",
                role="guest",
                subject="guest_session",
                json={"content": "Привет", "student_id": "somebody-else"},
            )

        self.assertEqual(response.status_code, 200)
        created_dialogs = self.database.inserted.get("dialogs", [])
        self.assertEqual(len(created_dialogs), 1)
        self.assertEqual(created_dialogs[0]["student_id"], "guest_session")


if __name__ == "__main__":
    unittest.main()
