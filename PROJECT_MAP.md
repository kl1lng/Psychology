# Project Overview

AISezim — существующая школьная платформа психологической поддержки: тестирование, настроение, чат, обращения к психологу, Q&A, подкасты и административный интерфейс. Локальная разработка и изолированные проверки: 2026-10-15. Production и реальные БД не проверялись.

Stack: Next.js 15.1 / React 19 / TypeScript / Tailwind; FastAPI / Pydantic; self-hosted PostgreSQL + PostgREST и файловое хранилище в Docker volumes. Два приложения: `frontend/` и `backend/`. Backend обращается к приватному PostgREST API через общий клиент `core/database.py`; отдельного ORM/repository слоя нет. Prisma-схемы описывают модели, но runtime Prisma dependency в frontend manifest отсутствует. Compose разворачивает чистую локальную БД; облачные данные не импортируются.

Запуск: Windows — `Start-AISezim.cmd` (проверяет Docker, подготавливает секретный `.env`, запускает production Compose на `http://localhost:3000`); VPS — `bash ops/start-vps.sh` после настройки домена, DNS и `.env`, с Caddy/HTTPS. `docker-compose.desktop.yml` публикует frontend только на loopback. PostgreSQL/PostgREST не публикуются наружу. Frontend использует системный font stack, чтобы production build не загружал Google Fonts из сети.

Git-репозиторий создан 2026-10-14 по просьбе пользователя для первой публикации. До этого локальной Git-истории не было; исходного HEAD для восстановления предыдущих файлов нет.

# Directory Map

| Путь | Назначение |
|---|---|
| `frontend/src/app/` | App Router страницы, role layouts, error/loading boundaries |
| `frontend/src/lib/` | Axios API, PDF export, словари, звуковые уведомления |
| `frontend/src/context/`, `providers/`, `types/` | Auth, язык ru/kk, тема и контракты UI |
| `frontend/src/components/` | Самопомощь, аудио, графики, UI и PDF-шаблоны |
| `backend/app/api/v1/` | REST handlers по функциям |
| `backend/app/core/` | Config, JWT/bcrypt, PostgREST singleton, кафедральный store |
| `backend/app/services/` | Подсчёт тестов, статистика настроения, чат-бот, alerts |
| `backend/app/schemas/`, `data/` | Pydantic DTO, JSON тестов и FAQ |
| `backend/migrations/` | `standalone_init.sql` — схема чистой self-hosted БД для Compose; остальные SQL — старые/дополнительные миграции, автоматически не запускаются; `07_intake_creator_retention.sql` сохраняет записи приёма при удалении психолога |
| `prisma/schema.prisma`, `frontend/prisma/schema.prisma` | Две одинаковые на момент проверки схемы; сверять обе при изменении моделей |
| `docs/` | Подробная архитектура и прошлый отчёт безопасности; утверждения сверять с кодом |

# Core Modules / Frontend ↔ Backend / API Map

Все API ниже имеют префикс `/api/v1`. Клиенты находятся в `frontend/src/lib/api.ts`, если не отмечено иначе. Backend путь — `backend/app/api/v1/<module>.py`.

| UI / задача | Клиент → API → backend | Данные / зависимости |
|---|---|---|
| `(auth)/login`, `register` | `authApi` → `/auth/register`, `/login`, `/guest`, `/me`, `/logout` → `auth.py` | `users`; security, DepartmentStore; AuthProvider. В development локальные демо-профили психолога, ученика и учителя доступны при недоступном API; они хранят профиль без пароля только в текущем браузере. Анонимный вход также имеет local-only fallback. |
| `(student)/tests`, `tests/[id]` | Обычный режим: `assessmentsApi` → GET `/assessments/`, `/{test_id}`, POST `/submit` → `assessments.py`. Локальный гость: `lib/local-assessment.ts` → `assessment-definitions.json` → локальный scoring engine | Серверный режим пишет `assessment_results`, `question_responses`, начисляет баллы через RPC. Локальный гостевой режим рассчитывает по тем же определениям и сохраняет результаты только в `localStorage`; в школьную базу они не передаются. |
| `(student)/mood`, домашняя страница | `moodApi` → `/mood/entry`, `/stats?days=30` → `mood.py` | JWT subject determines student/guest ownership; recent stress history and optional self-selected emotion summary; mood_entries → mood_analytics; emotion column in `06_mood_emotions.sql` |
| `(student)/chat`, `(psychologist)/chats` | `chatApi` → `/chat/message`, `/reply`, `/call-psychologist`, `/history/{identifier}`, `/dialog/{id}/messages`, `/waiting` → `chat.py` | dialogs → chat_messages; bot_operator → FAQ/crisis rules → alerts; client refreshes through role/ownership checked API endpoints |
| Запись из чата | `appointmentsApi` → POST `/appointments/book`, GET `/appointments/` → `appointments.py` | appointments; student/guest subject из JWT сохраняется напрямую и связывает заявку с его диалогом; просмотр очереди только psychologist/admin; memory fallback |
| `(psychologist)/intakes` | `intakesApi` → GET `/intakes/students`, GET/POST `/intakes/`, PATCH `/intakes/{id}/signature` → `intakes.py` | `psychologist_intakes`; psychologist/admin guard; curator recorded as text, paper-signature reminder |
| `(psychologist)/dashboard`, `archive`, `archive/[id]` | `analyticsApi` → `/analytics/dashboard`, `/activity`, `/class-comparison`, `/results`, `/monthly-comparison`, `/results/{student_id}`, `/assessment/{id}`, `/student/{id}/notes` → `analytics.py` | users, assessment_results, question_responses, mood_entries, dialogs, psychologist_notes; same-student/same-method scale comparison between two rolling 30-day periods |
| `(student)/qa`, `(psychologist)/qa-moderation` | `qaApi` → `/qa/ask`, `/feed`, `/moderation`, `/answer/{id}`, `/like/{id}` → `qa.py` | qa_questions; memory fallback |
| `(student)/podcasts`, `(psychologist)/podcasts/upload` | `podcastsApi` → `/podcasts/`, `/upload`, DELETE `/{id}` → `podcasts.py` | metadata в PostgreSQL; аудиофайл в `LOCAL_STORAGE_PATH/podcasts`, выдаётся через `/static` |
| `(student)/leaderboard` | API клиент → `/leaderboard/` → `leaderboard.py` | users.points_balance; get_current_user guard |
| `(admin)/admin/dashboard` | `adminApi`, `departmentsApi` → `/admin/stats`, `/users`, `/users/{id}`, `/departments/`, `/{id}` → admin.py / departments.py | users, departments; связанные записи при удалении; DepartmentStore fallback |
| Профиль пользователя | `usersApi` → `/users/{id}` → `users.py` | users |
| `(teacher)/teacher/dashboard` | Локальные данные страницы и PDF-шаблоны | Академические тесты/ҚМЖ представлены demo-константами; backend flow не подтверждён |
| `breathing`, `(student)/self-help` | Компоненты самопомощи | box-breathing, audio-player; клиентская логика |

Route groups `(student)`, `(psychologist)` и т. п. не входят в URL: например `/tests`, `/dashboard`, `/archive`. `app/psychologist/dashboard/page.tsx` отдельно переиспользует страницу `(psychologist)/dashboard`. Также существуют `app/page.tsx` и `(student)/page.tsx`: при работе с корневым URL проверяй обе, сборка в рамках анализа не проверялась.

Клиентские обновления чата выполняются через защищённые API-маршруты с периодическим опросом. Аналитика активности агрегируется backend-маршрутом `/analytics/activity`; frontend не обращается напрямую к хранилищу данных.

# Authentication & Authorization

- `core/security.py`: bcrypt, JWT, cookie или Bearer; get_current_user, get_current_admin, get_current_psychologist. Admin guard допускает также psychologist; psychologist guard допускает admin.
- `auth.py`: собственные users/password_hash и JWT; teacher registration через DepartmentStore; public signup принимает ученика/учителя, учётные записи admin/psychologist создаются только из админ-панели. Есть совместимость с `class_id` вида TEACHER и department_id.
- Chat API: отправка и запрос психологу доступны только student/guest и используют `sub` из JWT, а не `student_id` из тела. Чтение истории и сообщений ограничено владельцем; очередь ожидания и ответы доступны psychologist/admin. Гостевые беседы сохраняют уникальный `guest_...` subject в текстовом `dialogs.student_id`.
- Backend выставляет HttpOnly cookie и возвращает токен в JSON. `auth-context.tsx` дополнительно сохраняет токен через js-cookie и профиль в localStorage; `api.ts` добавляет Bearer, withCredentials и редирект при 401. `/auth/me` читает cookie. Logout UI удаляет клиентские данные, отдельный backend logout endpoint существует.
- Роли: student, guest, teacher, psychologist, admin. UI layouts используют клиентские редиректы, что само по себе не защищает API.
- Admin/analytics, mood entry/stats, Q&A moderation/answers, просмотр заявок, список/карточка кафедры и каталог подкастов используют role guards. Вопросы и заявки берут личность из проверенной сессии; профиль доступен самому пользователю и сотрудникам школы. Публичными остаются только опубликованная лента Q&A и её отметка «нравится».
- Браузер не подключается к базе: запросы идут через Next rewrites к FastAPI, а тот — к приватному PostgREST с короткоживущим внутренним JWT. Отдельный `JWT_SECRET_KEY` используется для пользовательских сессий. Compose база чистая; production и прежняя облачная база не проверялись.
- В development гостевой вход при недоступном API создаёт `local-demo-guest`; тесты и результаты доступны только в текущем браузере. Этот локальный профиль не является серверной аутентификацией и не синхронизируется с кабинетом психолога.
- Development-регистрация при недоступном API создаёт локальный профиль выбранной роли без сохранения пароля; это не создаёт школьный аккаунт и не проверяет код кафедры на сервере.

# Database Map

- departments → users.department_id; users также содержит role, class_id, points_balance.
- assessment_results → question_responses.test_result_id (cascade); ответы дополнительно сохраняются как answers_json. Scoring выдаёт шкалы, риск и баллы; handler начисляет баллы RPC.
- mood_entries привязаны к ученику; dialogs содержат состояние общения, chat_messages → dialog_id.
- psychologist_notes связывают заметки психолога с учеником; qa_questions — вопрос/ответ/публикация/likes; podcasts — metadata и storage URL.
- psychologist_intakes связывает посещение ученика, имя сопровождавшего куратора, факт/время получения бумажной подписи и автора-психолога; таблица входит в `standalone_init.sql` для чистой локальной установки.
- consultation_slots описаны в схемах; endpoint записи использует отдельную appointments из `04_appointments.sql` (в Prisma не описана).
- `standalone_init.sql` — начальная схема и RPC для новой self-hosted базы, подключается Compose только при инициализации пустого volume. `init.sql` и остальные SQL — исторические/дополнительные миграции; они автоматически не запускаются. Для уже существующего volume изменение SQL-файла не применит миграцию задним числом; перед удалением аккаунтов психологов применить `07_intake_creator_retention.sql`.
- SQL и Prisma различаются: runtime handlers используют имена/форматы SQL, в том числе guest IDs. Перед изменениями сверяй handler, DTO и SQL; не предполагается полная эквивалентность Prisma и реальной БД.

# Business Logic & Dependency Map

- Тест: UI → assessmentsApi → handler → scoring_engine.load_test_config/score_assessment → scales/risk/reward → PostgreSQL inserts/RPC через PostgREST → response. Конфиги: eysenck_epi_a, phillips_school, klimov_ddo, luskanova_motivation. Ошибки записи местами подавляются, поэтому ответ об успехе не доказывает сохранение.
- Чат: UI → chat.py → dialog/message persistence → bot_operator.process_chat_message (правила, FAQ, ru/kk, escalation) → статус ожидания психолога и alerts. Это локальный детерминированный бот; внешняя LLM интеграция не обнаружена.
- Chat API защищён JWT, ролью и проверкой владельца диалога. Страницы чата ученика/психолога получают обновления очереди и сообщений через эти маршруты. Dashboard активности использует role-protected `/analytics/activity`.
- `alerts.notify_emergency` сейчас логирует события; Telegram/SMS/email hooks — заготовки, реальная отправка не реализована. Логи могут содержать чувствительное содержимое, не переносить их в документацию/ответы.
- `mood_analytics.py` вычисляет дневные/недельные агрегаты; `/mood/entry` и `/mood/stats` привязывают чтение и запись к JWT subject и ограничивают окно статистики параметром `days` (1–90). `analytics.py` собирает dashboard/классы/отчёты из нескольких таблиц.
- DepartmentStore, Q&A, appointments используют память как fallback; это состояние процесса, не долговременное хранилище. DepartmentStore берёт память при ошибке подключения, но успешный пустой ответ БД остаётся пустым списком.
- `lib/pdf-generator.ts` → html2canvas/jsPDF → `components/pdf/` (индивидуальные/классные психологические и академические отчёты); индивидуальный отчёт собирается по страницам с повторяемой шапкой и пагинацией ответов, сводная таблица использует фиксированную сетку колонок и выровненные метки риска. Психологический и учительский дашборды импортируют генератор только при запуске экспорта. `types/pdf-report.ts` — контракты. `mocks/assessment-demo.ts` содержит 16 вымышленных записей (12 завершённых и 4 незавершённых) по четырём методикам; `assessment-definitions.json` синхронизируется из backend JSON через `scripts/sync-assessment-definitions.cjs`. Демо-отчёты помечены как вымышленные.

# Critical Files & Configuration

- `backend/app/main.py`: FastAPI, CORS, глобальная обработка исключений, /static, /health; `api/router.py`: регистрация API. Импорт main создаёт static directory, поэтому это не чистая проверка без side effects.
- `backend/app/core/config.py`: Settings, загрузка .env, DATABASE_API_URL, INTERNAL_DATABASE_JWT_SECRET, LOCAL_STORAGE_PATH, JWT_SECRET_KEY/ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, APP_ENV, ENABLE_DEV_TOOLS, CORS_ORIGINS. `core/database.py`: singleton приватного PostgREST-клиента.
- `frontend/src/app/layout.tsx`: fonts, providers Auth/Language/Theme; `globals.css`, tailwind.config.js, theme-provider.tsx — общий вид.
- `frontend/src/app/(psychologist)/dashboard/page.tsx`: аналитика получает данные через API; активность — дневные агрегаты `/analytics/activity`, новые высокие/критические результаты проверяются раз в 30 секунд на видимой вкладке. Вкладка методик в локальном демо показывает только `assessment-demo.ts`, фильтрует по выбранной методике и классу. Обычный кабинет направляет за реальными результатами в архив. Демо доступно только в development и не выполняет API-запросы; layout ограничивает его маршрутами локального просмотра. Модальное окно и PDF используют одни ответы и шкалы. Графики отложены до приближения viewport; отсутствующие данные не заменяются случайными.
- `frontend/src/app/(student)/page.tsx` и `(student)/mood/page.tsx`: недельные графики строятся по сохранённым отметкам стресса; быстрая шкала переводит подписи «Супер/Хорошо/Норма/Устал» в низкий/умеренный/высокий уровень стресса. Серия отметок и среднее состояние вычисляются из данных, статические значения не используются.
- `frontend/src/components/ui/navigation-link.tsx` предварительно загружает внутренний раздел при наведении/фокусе; используется меню четырёх ролей. `frontend/src/components/ui/route-loading.tsx` используется сегментами ученического, психологического, административного и учительского интерфейсов, чтобы показывать локальный skeleton во время перехода между страницами.
- `frontend/src/app/(psychologist)/archive/page.tsx`: архив реальных результатов; заключение открывается через `analyticsApi.getAssessmentDetail` и печатается средствами браузера. Print CSS должен оставлять контейнер `#printable-report` видимым и переводить тёмную экранную тему в читаемый светлый лист.
- `frontend/src/lib/api.ts`: same-origin `/api` по умолчанию; `frontend/next.config.ts` направляет `/api/*` и `/static/*` на внутренний FastAPI.
- `frontend/next.config.ts`: CSP и images; `tsconfig.json`: TypeScript; package.json и backend/requirements.txt — зависимости. Скрипт lint указан как next lint; его работоспособность не подтверждена.
- `docker-compose.yml`: PostgreSQL, PostgREST, FastAPI, Next.js и опциональный Caddy-профиль для VPS; Postgres/PostgREST находятся в приватной Docker-сети, медиа и база — в постоянных volumes.
- `ops/prepare-env.ps1`: генерирует локальный `.env` с криптографически случайными паролями; `docs/VPS_DEPLOYMENT.md` описывает локальный запуск и ручную подготовку домена VPS. Скрипт не подключается к серверу.
- `backend/create_superuser.py`, convert_tests.py и demo seed/clear endpoints — специальные инструменты; не запускать без проверки эффектов и разрешённого окружения.
- README очищен от встроенных демо-паролей; отдельные credentials и реальные env исключены из анализа.

# Integrations & Execution Boundaries

Продуктовый runtime больше не требует облака: PostgreSQL, PostgREST, FastAPI, Next.js и аудиофайлы работают в self-hosted Docker-стеке. UI при сборке может загрузить Google Fonts. Очередей/background worker или собственного WebSocket сервера нет; UI чата обновляется периодическим запросом к backend. Реальная миграция старых облачных данных не выполнялась.

# Common Change Guide

| Задача | Сначала открыть → далее |
|---|---|
| Login/roles | auth-context.tsx, lib/api.ts → auth.py, core/security.py → schemas/user.py, role layouts |
| Кафедры/учителя | admin dashboard / register → departments.py, auth.py → departments_store.py → SQL/schema; академический teacher UI проверять отдельно как demo |
| Тест/риск/баллы | tests/[id] → assessments.py → scoring_engine.py, нужный JSON → assessment DTO, SQL/RPC |
| Настроение | mood page → mood.py → mood_analytics.py → mood_entries SQL |
| Чат/эскалация/запись | student chat / psychologist chats → chat.py, appointments.py → bot_operator.py, alerts.py → subscriptions, SQL |
| Dashboard/архив/заметки | psychologist pages → защищённые analytics.py API → schemas/SQL; проверить demo fallback |
| Q&A/подкасты | соответствующая page → qa.py / podcasts.py → DTO, SQL / Storage |
| PDF | вызывающая page → pdf-generator.ts → нужный components/pdf шаблон и types/pdf-report.ts |
| Общий UI/ru/kk | app/layout.tsx, globals.css → language-context.tsx, dictionaries.ts, компоненты и provider темы |
| Доступ/хранение | конкретный handler → security.py, core/database.py → standalone_init.sql и Compose; VPS/реальную БД не инспектировать без разрешения |

Для правок этой документации достаточно проверить ссылки на локальные пути и согласованность с исходниками. Функциональные тесты/сборку не запускать автоматически: они не нужны для Markdown и могут затронуть внешнее окружение. При задачах по коду выбирать безопасные проверки после изучения scripts/config; отдельный test suite среди просмотренных исходников не обнаружен.

# Local Verification

- `backend/tests/test_assessment_scoring.py` и `test_assessment_submit.py`: изолированные тесты сохранения/ошибок и чистые тесты полноты/валидности ответов, интерпретаций и риска; API и БД не запускаются.
- `backend/tests/test_chat_authorization.py` и `test_endpoint_authorization.py`: проверяют изоляцию диалогов, ролевую защиту чувствительных маршрутов и запрет подмены личности в Q&A/записях; БД заменена тестовыми объектами.
- `scripts/check-demo-parity.cjs`: сверяет 12 демо-примеров с серверным scoring engine через локальный Python.
- `scripts/check-local-scoring-parity.cjs`: сверяет локальный guest scoring с Python scoring engine на 12 завершённых примерах.
- `scripts/check-local-guest.cjs`: блокирует API и проверяет анонимный локальный вход, полный опрос Айзенка, расчёт результата и сохранение в браузере.
- `scripts/check-local-registration.cjs`: блокирует API и проверяет локальные профили психолога, ученика и учителя; пароль не попадает в профиль.
- `scripts/check-local-navigation.cjs`: переходы между пятью разделами в изолированном браузере с подменённым API.
- `scripts/check-local-reports.cjs`: изолированный браузер, только localhost:3000; проверяет все ответы, отсутствие обрезки/столбцов баллов и API/внешних обращений, скачивает 8 пробных PDF в игнорируемый `output/pdf/`.
- `backend/app/services/scoring_engine.py`: ответы должны покрывать методику без повторов; варианты валидируются по конфигурации; интерпретация выбирается по наибольшему подходящему порогу. Риск Айзенка определяется по нейротизму, Климов не используется для классификации психологического риска. Существующие пороги и версия методики требуют отдельного подтверждения школьным психологом; обнаружены смысловые расхождения ru/kk у вопросов Айзенка 36/42/48/54. Пользователь передал уточнение версии школьному психологу.
- `POST /assessments/submit`: требует JWT ученика/гостя; student_id проверяется по sub, подмена запрещена; при сбое основной записи возвращает 503.
- `(student)/tests/[id]`: серверные сбои не подменяются фиктивным результатом для обычного аккаунта. В development-гостевом режиме полный тест рассчитывается локально по backend-определениям и сохраняется в browser localStorage с явным предупреждением, что он не отправлен.
- `(psychologist)/archive/[id]`: диаграмма показывает фактическое распределение записанных результатов, без придуманных личностных процентов; при отсутствии настроений стресс не подставляется.
