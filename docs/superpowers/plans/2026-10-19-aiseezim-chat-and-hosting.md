# AISezim Chat and Hosting Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a reliable RU/KZ student support chat with persistent psychologist history and search, then verify the self-hosted one-click stack locally.

**Architecture:** Keep Next.js → FastAPI → private PostgREST → PostgreSQL. Add class-language and psychologist routing, database-backed presence, atomic/idempotent message persistence, role-scoped archive search, and keep the existing polling transport. No Supabase or external messaging integration is introduced.

**Tech Stack:** Next.js 15 / React 19 / TypeScript, FastAPI / Pydantic, PostgreSQL / PostgREST, Docker Compose, existing Python unittest and Playwright scripts.

**Spec:** `docs/superpowers/specs/2026-10-19-aiseezim-student-support-design.md`

## Global Constraints

- Use local self-hosted PostgreSQL; do not add a Supabase or hosted AI dependency.
- Store timestamps in UTC and display times in `Asia/Oral`.
- Guests select `ru` or `kk`; authenticated students route by their class `instruction_language`.
- A psychologist online heartbeat prevents bot replies; when offline, the deterministic bot may reply while an existing handoff stays queued.
- Risk phrases create urgent psychologist work and use only pre-approved static safety copy.
- Every chat write must be confirmed, atomic where it changes related state, and idempotent on retry.
- Only the assigned psychologist can read the transcript; teachers cannot read chat content.
- Do not execute remote operations, SSH, migrations against an existing/production database, deploy, push, or send external notifications.

## Review Focus

1. **Concurrent first messages for one guest/student:** test one active dialog per subject and no lost/duplicate messages.
2. **Missing class language or missing psychologist assignment:** test the explicit fallback/error state and retained request.
3. **Presence boundary and stale heartbeat:** test online within 90 seconds and offline after 90 seconds.
4. **Database failure or network retry after commit:** test visible error and idempotent retry without duplicate transcript entries.
5. **Search scope and time boundaries:** test the psychologist can find assigned dialogs by inclusive date range/content while another psychologist and a teacher cannot infer them.

---

## File Map

- `backend/migrations/08_chat_workflow.sql` — class language, per-language psychologist assignment, presence, dialog assignment/status fields, dialog events, idempotency, archive indexes and atomic RPCs.
- `backend/migrations/standalone_init.sql` — same canonical schema for a new empty Compose volume.
- `backend/app/schemas/chat.py` — request/response DTOs and status/language values.
- `backend/app/services/chat_repository.py` — persistence adapter for atomic RPCs, presence, history, and archive query.
- `backend/app/services/chat_assignment.py` — resolver for class/chat language and assigned psychologist online state.
- `backend/app/api/v1/chat.py` — authenticated chat, reply, presence, list, and archive routes; delegate persistence/assignment to services.
- `backend/app/api/router.py` — register any extracted routers.
- `backend/tests/test_chat_workflow.py` — routing, status, urgency and write-failure behavior with stubbed database.
- `backend/tests/test_chat_archive_authorization.py` — assigned psychologist scope, date/content filters and ordering.
- `backend/tests/test_chat_workflow_sql.py` — migration and fresh-schema parity assertions.
- `frontend/src/lib/api.ts` — typed chat, presence and archive requests, stable retry ID.
- `frontend/src/app/(admin)/admin/chat-routing/page.tsx` — admin mapping screen for class language, psychologist assignment, and safe legacy routing.
- `frontend/src/app/(student)/chat/page.tsx` — selected language for guests, visible delivery/responding state, safe resend.
- `frontend/src/app/(psychologist)/chats/page.tsx` — online heartbeat, assigned queue, chronological transcript and date/status/content filters.
- `frontend/src/app/(psychologist)/chats/archive/page.tsx` — archived-dialog list with pagination and search.
- `frontend/src/lib/dictionaries.ts` — Russian/Kazakh strings for chat states, filters, and errors.
- `scripts/check-local-chat.cjs` — browser scenarios for guest and therapist handoff without external API calls.
- `README.md`, `docs/VPS_DEPLOYMENT.md`, `PROJECT_MAP.md` — verified launch/readiness and updated module map.

## Tasks

### Task 1: Pin chat routing and persistence contracts

**Files:**
- Create: `backend/tests/test_chat_workflow.py`
- Create: `backend/tests/test_chat_archive_authorization.py`
- Modify: `backend/tests/test_chat_authorization.py`

**Interfaces:**
- Tests consume `POST /chat/message`, `/chat/call-psychologist`, `/chat/reply`, `/chat/presence/heartbeat`, `/chat/archive`, `/chat/admin/routing`, `/chat/admin/unassigned`, and current JWT roles.
- Contract: message response includes `dialog_id`, `status`, `reply`, `responder` (`bot` or `human`), `assigned_language`, `is_crisis`, `suggest_appointment`, and `quick_actions`.

- [ ] **Step 1: Add failing behavior tests** for guest RU/KK assignment, account class-language assignment, online/offline bot routing, crisis enqueue regardless of presence, and write-failure HTTP 503.
- [ ] **Step 2: Add failing authorization tests** for assigned psychologist, other psychologist, admin, teacher, dialog owner, and guest session.
- [ ] **Step 3: Run the two focused test modules** and confirm failures are caused by missing contract/behavior.

Run from `backend/`: `venv/Scripts/python.exe -m unittest discover -s tests -p "test_chat_workflow.py" -v` and repeat with `test_chat_archive_authorization.py`.
Expected: FAIL on absent route/service contracts; no DB or external service is contacted.

### Task 2: Add versioned PostgreSQL workflow schema

**Files:**
- Create: `backend/migrations/08_chat_workflow.sql`
- Modify: `backend/migrations/standalone_init.sql`
- Create: `backend/tests/test_chat_workflow_sql.py`

**Interfaces:**
- Tables: `school_classes(class_id, display_name, instruction_language)`, `psychologist_assignments(instruction_language, psychologist_id, updated_at, updated_by)`, `psychologist_presence(psychologist_id, last_seen_at)`, `dialog_events(id, dialog_id, event_type, actor_id, details, created_at)`.
- Extend `dialogs` with `assigned_psychologist_id`, `instruction_language`, `language_source`, `priority`, `last_message_at`; keep current `BOT`, `WAITING_PSYCHOLOGIST`, `ACTIVE`, `CLOSED` values, and enforce one open dialog per subject.
- Extend `chat_messages` with `client_message_id` and uniqueness `(dialog_id, sender_role, client_message_id)`.
- RPCs: `record_chat_exchange(...)`, `record_psychologist_reply(...)`, `touch_psychologist_presence(...)`, `search_psychologist_dialogs(...)`.

- [ ] **Step 1: Write schema assertions** that fresh init and upgrade migration create all expected columns, constraints and indexes without destructive operations; verify status compatibility and one open dialog per subject.
- [ ] **Step 2: Implement SQL migration** with idempotent DDL and atomic message/event/status RPCs.
- [ ] **Step 3: Mirror canonical SQL into `standalone_init.sql`** so a fresh Compose volume and an upgraded local volume converge.
- [ ] **Step 4: Validate SQL syntax on an isolated PostgreSQL container/temporary volume** and verify a repeated application is safe; do not mount project or production volumes.

Expected: both fresh setup and migration contain equivalent workflow schema; duplicate client IDs return the original result or a deterministic conflict without a second message.

### Task 3: Implement language assignment and presence service

**Files:**
- Create: `backend/app/services/chat_assignment.py`
- Modify: `backend/app/services/chat_repository.py`
- Modify: `backend/app/schemas/chat.py`
- Modify: `backend/app/api/v1/chat.py`

**Interfaces:**
- `resolve_chat_assignment(db, subject: str, role: str, requested_language: str | None) -> ChatAssignment`
- `psychologist_is_online(db, psychologist_id: str, now: datetime) -> bool`
- `POST /chat/presence/heartbeat` authenticates psychologist and touches only their own presence row.
- Admin-only `/chat/admin/routing` reads/updates class language and the ru/kk psychologist mapping; admin-only `/chat/admin/unassigned` returns legacy dialog metadata, and `/chat/admin/unassigned/{dialog_id}/assign` requires an explicit language.
- Thresholds: heartbeat every 30 seconds, stale after 90 seconds; injectable `now` for tests.

- [ ] **Step 1: Add failing unit tests** for class language precedence, guest language, unsupported language, missing class language, missing psychologist mapping, and the exact 90-second boundary.
- [ ] **Step 2: Implement resolver** with explicit errors and no silent wrong-language routing.
- [ ] **Step 3: Implement psychologist-only heartbeat endpoint** and test student/guest/teacher rejection.
- [ ] **Step 4: Run focused tests** and confirm assignment source (`class` or `chat`) is returned.

### Task 4: Make chat writes reliable and implement responder switching

**Files:**
- Modify: `backend/app/api/v1/chat.py`
- Modify: `backend/app/services/chat_repository.py`
- Modify: `backend/app/schemas/chat.py`
- Modify: `backend/tests/test_chat_workflow.py`

**Interfaces:**
- `persist_chat_exchange(...) -> PersistedChatExchange` uses `record_chat_exchange` and returns the durable dialog/message IDs.
- Student UI supplies UUID `client_message_id`; bot responses share the exchange transaction but have server IDs.
- Human online: persist student message, enqueue for assigned psych, no bot reply.
- Human offline: persist student + deterministic bot reply; preserve waiting/active assignment when the conversation is escalated.
- Crisis: save student message, fixed safety response, urgent event and waiting state atomically; `notify_emergency` must not log raw message content or guest secret.
- Reply endpoint checks dialog assignment before writing and returns 403 for another therapist.

- [ ] **Step 1: Keep tests failing** for online/offline, crisis, history preservation, duplicate retry and PostgREST error.
- [ ] **Step 2: Replace `_get_or_create_dialog` and `_save_message` success-swallowing behavior** with typed repository operations backed by atomic RPCs.
- [ ] **Step 3: Refactor `send_message`, `call_psychologist` and `reply_message`** to resolve mode/assignment, preserve event history and surface HTTP 503 on persistence failure.
- [ ] **Step 4: Test red-flag messages** with both online and offline psychologist fixtures; verify only approved static response appears.
- [ ] **Step 5: Run backend chat and authorization test suites**.

### Task 5: Add scoped psychologist archive API

**Files:**
- Modify: `backend/app/api/v1/chat.py`
- Modify: `backend/app/services/chat_repository.py`
- Modify: `backend/app/schemas/chat.py`
- Create/modify: `backend/tests/test_chat_archive_authorization.py`

**Interfaces:**
- `GET /chat/archive?from=&to=&language=&status=&priority=&q=&limit=&offset=`
- `GET /chat/archive/{dialog_id}` returns the dialog, ordered events and paginated chronological messages.
- Authenticated assigned psychologist is derived from JWT subject and `psychologist_assignments`; never trust a client-provided psychologist ID.
- Archive sorts by `last_message_at DESC, id ASC`; transcript sorts by `created_at ASC, id ASC`; timestamps are UTC.

- [ ] **Step 1: Add failing query tests** for date bounds, content query, pagination, tie timestamps, closed conversations and RU/KZ scope.
- [ ] **Step 2: Implement repository query/RPC** with parameterized input and bounded page sizes.
- [ ] **Step 3: Implement archive routes** and ensure teacher/unauthorized therapist receives 403 or a non-disclosing 404.
- [ ] **Step 4: Run endpoint authorization, archive and existing chat history tests**.

### Task 6: Add administrator routing controls

**Files:**
- Modify: `backend/app/api/v1/chat.py`
- Modify: `backend/app/schemas/chat.py`
- Modify: `backend/app/services/chat_repository.py`
- Create: `frontend/src/app/(admin)/admin/chat-routing/page.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/dictionaries.ts`
- Create: `scripts/check-local-admin-chat-routing.cjs`
- Modify: `backend/tests/test_chat_workflow.py`

**Interfaces:**
- `GET /chat/admin/routing` returns distinct class IDs/languages and two language-to-psychologist assignments.
- `PUT /chat/admin/routing/classes/{class_id}` accepts `instruction_language: "ru" | "kk"`.
- `PUT /chat/admin/routing/psychologists/{language}` accepts an existing `psychologist_id` only.
- `GET /chat/admin/unassigned` returns legacy dialogs without transcript content; `POST /chat/admin/unassigned/{dialog_id}/assign` requires explicit language and assigns its language psychologist.

- [ ] **Step 1: Add failing API tests** for admin-only class/psychologist updates, rejecting student/teacher updates, role-checking selected psychologist, and legacy metadata-only assignment.
- [ ] **Step 2: Implement validated admin routes** and audit events; never infer guest language from transcript text.
- [ ] **Step 3: Add the class/psychologist mapping page** with clear empty states and language-specific selectors.
- [ ] **Step 4: Add legacy unassigned queue** with ID/date only and explicit manual language assignment.
- [ ] **Step 5: Run backend tests and browser check** with test admin, RU psychologist and KK psychologist accounts.

### Task 7: Update student chat experience

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(student)/chat/page.tsx`
- Modify: `frontend/src/lib/dictionaries.ts`
- Add/update: `scripts/check-local-chat.cjs`

- [ ] **Step 1: Add/extend browser check** for guest language selection, message delivery state and no false success after API 503.
- [ ] **Step 2: Extend API client** with message idempotency key and correct presence/status payloads.
- [ ] **Step 3: Implement RU/KK selection for guest and account fallback** while locking the language from class when it is known.
- [ ] **Step 4: Display truthful responder and handoff states** (bot answered, psychologist online/awaiting, request queued, persistence error) and preserve a failed message for retry.
- [ ] **Step 5: Run the browser check with external requests blocked** and verify the existing guest session still sees its saved transcript.

### Task 8: Update psychologist live inbox and searchable archive

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(psychologist)/chats/page.tsx`
- Create: `frontend/src/app/(psychologist)/chats/archive/page.tsx`
- Modify: `frontend/src/lib/dictionaries.ts`

- [ ] **Step 1: Add a browser check** for heartbeat, RU/KZ queue separation, queue refresh, transcript order, and stale/closed dialog archive visibility.
- [ ] **Step 2: Send heartbeat from the visible psychologist cabinet** at 30 seconds and stop/expire it after sign-out or page close.
- [ ] **Step 3: Show assigned queue, unread/urgent markers and full message author/time order**; bot fallback is labeled BOT.
- [ ] **Step 4: Add date range, language, status, priority, student/guest ID and text filters with server pagination**.
- [ ] **Step 5: Run the browser check as separate RU and KK therapists** and verify one cannot load the other queue/transcript.

### Task 9: Verify one-click hosting and whole-project readiness

**Files:**
- Modify only as required: `Start-AISezim.ps1`, `Start-AISezim.cmd`, `docker-compose.yml`, `docker-compose.desktop.yml`, `docker-compose.local.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `.env.example`, `docs/VPS_DEPLOYMENT.md`, `README.md`.

- [ ] **Step 1: Audit user-visible strings** for local-demo/local-server disclaimers leaking into normal hosted screens; preserve legitimate development-only labels.
- [ ] **Step 2: Validate Compose configuration** without starting external or production services; verify Postgres/PostgREST remain private and data/media use persistent volumes.
- [ ] **Step 3: Run fresh isolated Compose smoke check** with a temporary project name/volumes, healthchecks, login page, and RU/KK chat route; remove only those named temporary resources.
- [ ] **Step 4: Run all backend tests, chat browser checks, existing local browser checks relevant to login/navigation/chat, and frontend production build**.
- [ ] **Step 5: Inspect bundle/build warnings and polling load; make only evidence-backed local optimizations without adding dependencies.**
- [ ] **Step 6: Update README/VPS guide with verified one-click start, required environment, persistent transcript behavior, migration instructions, and explicit statement that deployment has not occurred.**

### Task 10: Update project memory and perform final review

**Files:**
- Modify: `PROJECT_MAP.md`
- Modify: `docs/PRODUCT_ROADMAP.md`
- Modify only if needed: `docs/VPS_DEPLOYMENT.md`

- [ ] **Step 1: Update chat, data model, API, and local verification entries in `PROJECT_MAP.md`** after code inspection.
- [ ] **Step 2: Add competitor-informed roadmap and acceptance gates** to `docs/PRODUCT_ROADMAP.md`; separate implemented features from later opportunities.
- [ ] **Step 3: Review the full diff, test outputs, and temporary resources; verify no secrets or production data entered files/logs.**
- [ ] **Step 4: Report original HEAD, changed files, verification, docs/map status, commits, and that remote/production/deploy were not touched.**

## Execution note

Execute Tasks 1–9 in order in the current workspace. Existing user changes predate this plan and must remain intact. Do not create a branch, stash, whole-project backup, remote write, VPS connection or deployment. Commit only intentional task files if a small reviewable local milestone is useful; never include unrelated existing modifications.
