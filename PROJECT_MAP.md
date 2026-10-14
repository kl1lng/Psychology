# Project Overview

AISezim — существующая школьная платформа психологической поддержки: тестирование, настроение, чат, обращения к психологу, Q&A, подкасты и административный интерфейс. Локальная проверка исходников: 2026-10-14; запуск и remote/DB inspection не выполнялись.

Stack: Next.js 15.1 / React 19 / TypeScript / Tailwind; FastAPI / Pydantic; Supabase PostgreSQL, PostgREST, Storage и Realtime. Два приложения: `frontend/` и `backend/`. Backend работает с Supabase SDK напрямую из handlers; отдельного ORM/repository слоя нет. Prisma-схемы описывают модели, но runtime Prisma dependency в frontend manifest отсутствует.

Git-репозиторий создан 2026-10-14 по просьбе пользователя для первой публикации. До этого локальной Git-истории не было; исходного HEAD для восстановления предыдущих файлов нет.

# Directory Map

| Путь | Назначение |
|---|---|
| `frontend/src/app/` | App Router страницы, role layouts, error/loading boundaries |
| `frontend/src/lib/` | Axios API, Supabase client, PDF export, словари, звуковые уведомления |
| `frontend/src/context/`, `providers/`, `types/` | Auth, язык ru/kk, тема и контракты UI |
| `frontend/src/components/` | Самопомощь, аудио, графики, UI и PDF-шаблоны |
| `backend/app/api/v1/` | REST handlers по функциям |
| `backend/app/core/` | Config, JWT/bcrypt, Supabase singleton, кафедральный store |
| `backend/app/services/` | Подсчёт тестов, статистика настроения, чат-бот, alerts |
| `backend/app/schemas/`, `data/` | Pydantic DTO, JSON тестов и FAQ |
| `backend/migrations/` | SQL схемы, RLS, индексы и appointments; не запускать автоматически |
| `prisma/schema.prisma`, `frontend/prisma/schema.prisma` | Две одинаковые на момент проверки схемы; сверять обе при изменении моделей |
| `docs/` | Подробная архитектура и прошлый отчёт безопасности; утверждения сверять с кодом |

# Core Modules / Frontend ↔ Backend / API Map

Все API ниже имеют префикс `/api/v1`. Клиенты находятся в `frontend/src/lib/api.ts`, если не отмечено иначе. Backend путь — `backend/app/api/v1/<module>.py`.

| UI / задача | Клиент → API → backend | Данные / зависимости |
|---|---|---|
| `(auth)/login`, `register` | `authApi` → `/auth/register`, `/login`, `/guest`, `/me`, `/logout` → `auth.py` | `users`; security, DepartmentStore; AuthProvider |
| `(student)/tests`, `tests/[id]` | `assessmentsApi` → GET `/assessments/`, `/{test_id}`, POST `/submit` → `assessments.py` | scoring_engine → JSON теста → assessment_results, question_responses, RPC increment_points |
| `(student)/mood`, домашняя страница | `moodApi` → `/mood/entry`, `/stats` → `mood.py` | mood_entries → mood_analytics |
| `(student)/chat`, `(psychologist)/chats` | `chatApi` → `/chat/message`, `/reply`, `/call-psychologist`, `/history/{identifier}`, `/dialog/{id}/messages`, `/waiting` → `chat.py` | dialogs → chat_messages; bot_operator → FAQ/crisis rules → alerts; UI Realtime subscriptions |
| Запись из чата | `appointmentsApi` → POST `/appointments/book`, GET `/appointments/` → `appointments.py` | appointments; обновление диалога, сообщение и alerts; memory fallback |
| `(psychologist)/dashboard`, `archive`, `archive/[id]` | `analyticsApi` → `/analytics/dashboard`, `/class-comparison`, `/results`, `/results/{student_id}`, `/assessment/{id}`, `/student/{id}/notes` → `analytics.py` | users, assessment_results, question_responses, mood_entries, dialogs, psychologist_notes |
| `(student)/qa`, `(psychologist)/qa-moderation` | `qaApi` → `/qa/ask`, `/feed`, `/moderation`, `/answer/{id}`, `/like/{id}` → `qa.py` | qa_questions; memory fallback |
| `(student)/podcasts`, `(psychologist)/podcasts/upload` | `podcastsApi` → `/podcasts/`, `/upload`, DELETE `/{id}` → `podcasts.py` | podcasts; Supabase Storage bucket audio |
| `(student)/leaderboard` | API клиент → `/leaderboard/` → `leaderboard.py` | users.points_balance; get_current_user guard |
| `(admin)/admin/dashboard` | `adminApi`, `departmentsApi` → `/admin/stats`, `/users`, `/users/{id}`, `/departments/`, `/{id}` → admin.py / departments.py | users, departments; связанные записи при удалении; DepartmentStore fallback |
| Профиль пользователя | `usersApi` → `/users/{id}` → `users.py` | users |
| `(teacher)/teacher/dashboard` | Локальные данные страницы и PDF-шаблоны | Академические тесты/ҚМЖ представлены demo-константами; backend flow не подтверждён |
| `breathing`, `(student)/self-help` | Компоненты самопомощи | box-breathing, audio-player; клиентская логика |

Route groups `(student)`, `(psychologist)` и т. п. не входят в URL: например `/tests`, `/dashboard`, `/archive`. `app/psychologist/dashboard/page.tsx` отдельно переиспользует страницу `(psychologist)/dashboard`. Также существуют `app/page.tsx` и `(student)/page.tsx`: при работе с корневым URL проверяй обе, сборка в рамках анализа не проверялась.

Dashboard психолога дополнительно читает Supabase напрямую и подписывается на изменения. Для data flow нельзя ограничиться Axios API. Проверяй `lib/supabase.ts` и импорты/вызовы `supabase` в нужной странице.

# Authentication & Authorization

- `core/security.py`: bcrypt, JWT, cookie или Bearer; get_current_user, get_current_admin, get_current_psychologist. Admin guard допускает также psychologist; psychologist guard допускает admin.
- `auth.py`: собственные users/password_hash и JWT, а не login через Supabase Auth; teacher registration через DepartmentStore. Есть совместимость с `class_id` вида TEACHER и department_id.
- Backend выставляет HttpOnly cookie и возвращает токен в JSON. `auth-context.tsx` дополнительно сохраняет токен через js-cookie и профиль в localStorage; `api.ts` добавляет Bearer, withCredentials и редирект при 401. `/auth/me` читает cookie. Logout UI удаляет клиентские данные, отдельный backend logout endpoint существует.
- Роли: student, guest, teacher, psychologist, admin. UI layouts используют клиентские редиректы, что само по себе не защищает API.
- Admin/analytics и запись кафедр используют guards; многие chat, Q&A, mood, appointments, podcast и profile handlers не имеют обязательного общего guard. Проверяй конкретную сигнатуру/проверки, не считай RBAC повсеместным.
- SQL RLS и browser Supabase access требуют отдельной проверки совместимости с собственным JWT. Реальные применённые policies и права ключей неизвестны; подключений к БД не было.

# Database Map

- departments → users.department_id; users также содержит role, class_id, points_balance.
- assessment_results → question_responses.test_result_id (cascade); ответы дополнительно сохраняются как answers_json. Scoring выдаёт шкалы, риск и баллы; handler начисляет баллы RPC.
- mood_entries привязаны к ученику; dialogs содержат состояние общения, chat_messages → dialog_id.
- psychologist_notes связывают заметки психолога с учеником; qa_questions — вопрос/ответ/публикация/likes; podcasts — metadata и storage URL.
- consultation_slots описаны в схемах; endpoint записи использует отдельную appointments из `04_appointments.sql` (в Prisma не описана).
- `init.sql` — начальная схема/RPC/политики; `02_departments_teachers_question_responses.sql` — дополнения; `002_rls_policies.sql` — политики; `003_indexes.sql` — индексы. Порядок и фактическое применение неизвестны. В init есть разрешающие public policies; нельзя делать вывод о защищённости БД только по наличию RLS-файла.
- SQL и Prisma различаются: runtime handlers используют имена/форматы SQL, в том числе guest IDs. Перед изменениями сверяй handler, DTO и SQL; не предполагается полная эквивалентность Prisma и реальной БД.

# Business Logic & Dependency Map

- Тест: UI → assessmentsApi → handler → scoring_engine.load_test_config/score_assessment → scales/risk/reward → Supabase inserts/RPC → response. Конфиги: eysenck_epi_a, phillips_school, klimov_ddo, luskanova_motivation. Ошибки записи местами подавляются, поэтому ответ об успехе не доказывает сохранение.
- Чат: UI → chat.py → dialog/message persistence → bot_operator.process_chat_message (правила, FAQ, ru/kk, escalation) → статус ожидания психолога и alerts. Это локальный детерминированный бот; внешняя LLM интеграция не обнаружена.
- `alerts.notify_emergency` сейчас логирует события; Telegram/SMS/email hooks — заготовки, реальная отправка не реализована. Логи могут содержать чувствительное содержимое, не переносить их в документацию/ответы.
- `mood_analytics.py` вычисляет агрегаты; `analytics.py` собирает dashboard/классы/отчёты из нескольких таблиц.
- DepartmentStore, Q&A, appointments используют память как fallback; это состояние процесса, не долговременное хранилище. В некоторых местах get_supabase вызывается до try, поэтому отсутствие config не всегда покрывается fallback.
- `lib/pdf-generator.ts` → html2canvas/jsPDF → `components/pdf/` (индивидуальные/классные психологические и академические отчёты); `types/pdf-report.ts` — контракты. `mocks/eysenck-demo.ts` используется dashboard, demo и реальные данные проверять отдельно.

# Critical Files & Configuration

- `backend/app/main.py`: FastAPI, CORS, глобальная обработка исключений, /static, /health; `api/router.py`: регистрация API. Импорт main создаёт static directory, поэтому это не чистая проверка без side effects.
- `backend/app/core/config.py`: Settings, загрузка .env, SUPABASE_URL/KEY, JWT_SECRET_KEY/ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, APP_ENV, ENABLE_DEV_TOOLS, CORS_ORIGINS. `core/supabase.py`: singleton внешнего клиента.
- `frontend/src/app/layout.tsx`: fonts, providers Auth/Language/Theme; `globals.css`, tailwind.config.js, theme-provider.tsx — общий вид.
- `frontend/src/lib/api.ts`: NEXT_PUBLIC_API_URL; `lib/supabase.ts`: NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY. Реальные значения не читать/не документировать.
- `frontend/next.config.ts`: CSP и images; `tsconfig.json`: TypeScript; package.json и backend/requirements.txt — зависимости. Скрипт lint указан как next lint; его работоспособность не подтверждена.
- `backend/Dockerfile`: Uvicorn на 8000. Compose/CI/reverse proxy конфигурация среди изученных исходников не обнаружена.
- `backend/create_superuser.py`, convert_tests.py, frontend/automate_supabase.js и demo seed/clear endpoints — специальные инструменты; не запускать без проверки эффектов и разрешённого окружения.
- README содержит раздел учётных данных: не копировать его значения. `CREDENTIALS.txt` и реальные env исключены из анализа.

# Integrations & Execution Boundaries

Supabase DB/PostgREST, Realtime и Storage — внешние сервисы. Запуск UI/API и даже demo-кнопки могут обратиться к настроенному внешнему окружению. Next fonts используют Google fonts при сборке. Очередей/background worker или собственного WebSocket сервера в изученной структуре не обнаружено; realtime обеспечивается Supabase. Production topology и данные не проверены.

# Common Change Guide

| Задача | Сначала открыть → далее |
|---|---|
| Login/roles | auth-context.tsx, lib/api.ts → auth.py, core/security.py → schemas/user.py, role layouts |
| Кафедры/учителя | admin dashboard / register → departments.py, auth.py → departments_store.py → SQL/schema; академический teacher UI проверять отдельно как demo |
| Тест/риск/баллы | tests/[id] → assessments.py → scoring_engine.py, нужный JSON → assessment DTO, SQL/RPC |
| Настроение | mood page → mood.py → mood_analytics.py → mood_entries SQL |
| Чат/эскалация/запись | student chat / psychologist chats → chat.py, appointments.py → bot_operator.py, alerts.py → subscriptions, SQL |
| Dashboard/архив/заметки | psychologist pages → analytics.py и прямые Supabase queries → schemas/SQL; проверить demo fallback |
| Q&A/подкасты | соответствующая page → qa.py / podcasts.py → DTO, SQL / Storage |
| PDF | вызывающая page → pdf-generator.ts → нужный components/pdf шаблон и types/pdf-report.ts |
| Общий UI/ru/kk | app/layout.tsx, globals.css → language-context.tsx, dictionaries.ts, компоненты и provider темы |
| Доступ/хранение | конкретный handler → security.py, Supabase client → init.sql и RLS; фактическую БД не инспектировать без разрешения |

Для правок этой документации достаточно проверить ссылки на локальные пути и согласованность с исходниками. Функциональные тесты/сборку не запускать автоматически: они не нужны для Markdown и могут затронуть внешнее окружение. При задачах по коду выбирать безопасные проверки после изучения scripts/config; отдельный test suite среди просмотренных исходников не обнаружен.
