-- Fresh, self-hosted PostgreSQL schema. No Supabase services or policies required.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), email TEXT UNIQUE,
    full_name TEXT NOT NULL, password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','psychologist','teacher','admin','guest')),
    class_id TEXT, department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    points_balance INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);

CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    test_id TEXT NOT NULL, test_name TEXT NOT NULL,
    risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    reward_points INTEGER NOT NULL DEFAULT 0, answers_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessment_student ON assessment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_risk ON assessment_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_assessment_created ON assessment_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_student_test ON assessment_results(student_id, test_id);

CREATE TABLE IF NOT EXISTS question_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL, selected_option TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_question_responses_result ON question_responses(test_result_id);

CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    stress_level INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 10), note TEXT,
    emotion TEXT CHECK (emotion IS NULL OR emotion IN ('joy','calm','sadness','anger','anxiety','tired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mood_student ON mood_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_mood_created ON mood_entries(created_at DESC);

CREATE TABLE IF NOT EXISTS dialogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BOT' CHECK (status IN ('BOT','WAITING_PSYCHOLOGIST','ACTIVE','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dialogs_student ON dialogs(student_id);
CREATE INDEX IF NOT EXISTS idx_dialogs_status ON dialogs(status);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dialog_id UUID NOT NULL REFERENCES dialogs(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('STUDENT','BOT','PSYCHOLOGIST')),
    content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_dialog ON chat_messages(dialog_id, created_at);

CREATE TABLE IF NOT EXISTS podcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), title TEXT NOT NULL,
    description TEXT, category TEXT, file_url TEXT NOT NULL, storage_path TEXT NOT NULL,
    duration_seconds INTEGER, uploaded_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psychologist_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    psychologist_id TEXT NOT NULL, note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psych_notes_student ON psychologist_notes(student_id);

CREATE TABLE IF NOT EXISTS consultation_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), psychologist_id TEXT NOT NULL,
    student_id TEXT, slot_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','BOOKED','COMPLETED','CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qa_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, answer TEXT,
    psychologist_id TEXT, is_published BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), answered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qa_published ON qa_questions(is_published);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), student_id TEXT NOT NULL,
    notes TEXT, preferred_time TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
    source TEXT NOT NULL DEFAULT 'chat', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS psychologist_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curator_name TEXT NOT NULL, paper_signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_at TIMESTAMPTZ, note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psychologist_intakes_signature ON psychologist_intakes(paper_signed, created_at DESC);

CREATE OR REPLACE FUNCTION increment_points(user_id UUID, points INTEGER)
RETURNS VOID LANGUAGE SQL AS $$
    UPDATE users SET points_balance = points_balance + $2 WHERE id = $1;
$$;

INSERT INTO departments (name, code) VALUES
 ('Математика, Информатика, Физика', 'MIPH2026'),
 ('Казахский, русский и иностранный языки', 'LANG2026'),
 ('Естественные науки (Химия, Биология, География)', 'SCI2026'),
 ('История и общественные дисциплины', 'HUM2026'),
 ('Физическая культура, искусство и технологии', 'TECH2026')
ON CONFLICT (code) DO NOTHING;

GRANT USAGE ON SCHEMA public TO aisezim_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aisezim_api;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO aisezim_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aisezim_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO aisezim_api;
