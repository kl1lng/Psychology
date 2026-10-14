-- ============================================================
-- School Psychology Platform — Supabase SQL Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── DEPARTMENTS (КАФЕДРЫ) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    code            TEXT UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE,
    full_name       TEXT NOT NULL,
    password_hash   TEXT,
    role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'psychologist', 'teacher', 'admin', 'guest')),
    class_id        TEXT,
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    points_balance  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- ─── ASSESSMENT RESULTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    test_id         TEXT NOT NULL,
    test_name       TEXT NOT NULL,
    risk_level      TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reward_points   INTEGER NOT NULL DEFAULT 0,
    answers_json    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_student ON assessment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_risk ON assessment_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_assessment_test ON assessment_results(test_id);

-- ─── QUESTION RESPONSES (ДЕТАЛИЗАЦИЯ ВЫБОРОВ) ─────────────────
CREATE TABLE IF NOT EXISTS question_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_result_id  UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL,
    selected_option TEXT NOT NULL,
    score           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_responses_test_result ON question_responses(test_result_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question ON question_responses(question_id);

-- ─── MOOD ENTRIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    stress_level    INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 10),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_student ON mood_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_mood_created ON mood_entries(created_at);

-- ─── DIALOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dialogs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'BOT' CHECK (status IN ('BOT', 'WAITING_PSYCHOLOGIST', 'ACTIVE', 'CLOSED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogs_student ON dialogs(student_id);
CREATE INDEX IF NOT EXISTS idx_dialogs_status ON dialogs(status);

-- ─── CHAT MESSAGES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dialog_id       UUID NOT NULL REFERENCES dialogs(id) ON DELETE CASCADE,
    sender_role     TEXT NOT NULL CHECK (sender_role IN ('STUDENT', 'BOT', 'PSYCHOLOGIST')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_dialog ON chat_messages(dialog_id);

-- ─── PODCASTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS podcasts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    description     TEXT,
    file_url        TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    duration_seconds INTEGER,
    uploaded_by     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PSYCHOLOGIST NOTES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS psychologist_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    psychologist_id TEXT NOT NULL,
    note            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psych_notes_student ON psychologist_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_psych_notes_psychologist ON psychologist_notes(psychologist_id);

-- ─── CONSULTATION SLOTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_slots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    psychologist_id TEXT NOT NULL,
    student_id      TEXT,
    slot_time       TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_psychologist ON consultation_slots(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_slots_student ON consultation_slots(student_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON consultation_slots(status);

-- ─── QA QUESTIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qa_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    category        TEXT NOT NULL,
    answer          TEXT,
    psychologist_id TEXT,
    is_published    BOOLEAN DEFAULT FALSE,
    likes_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    answered_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_published ON qa_questions(is_published);
CREATE INDEX IF NOT EXISTS idx_qa_category ON qa_questions(category);
CREATE INDEX IF NOT EXISTS idx_qa_student ON qa_questions(student_id);

-- ─── SEED DEPARTMENTS ────────────────────────────────────────
INSERT INTO departments (name, code)
VALUES 
    ('Математика, Информатика, Физика', 'MIPH2026'),
    ('Казахский, русский и иностранные языки', 'LANG2026'),
    ('Естественные науки (Химия, Биология, География)', 'SCI2026'),
    ('История и общественные дисциплины', 'HUM2026'),
    ('Физическая культура, искусство и технологии', 'TECH2026')
ON CONFLICT (code) DO NOTHING;

-- ─── HELPER FUNCTION: increment points ───────────────────────
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET points_balance = points_balance + points
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- ─── ROW LEVEL SECURITY (basic) ───────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;

-- Allow service_role and public access
CREATE POLICY "service_role_all" ON departments FOR ALL TO service_role USING (true);
CREATE POLICY "public_departments_all" ON departments FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "public_users_all" ON users FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON assessment_results FOR ALL TO service_role USING (true);
CREATE POLICY "public_assessment_all" ON assessment_results FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON question_responses FOR ALL TO service_role USING (true);
CREATE POLICY "public_question_responses_all" ON question_responses FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON mood_entries FOR ALL TO service_role USING (true);
CREATE POLICY "public_mood_all" ON mood_entries FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON dialogs FOR ALL TO service_role USING (true);
CREATE POLICY "public_dialogs_all" ON dialogs FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON chat_messages FOR ALL TO service_role USING (true);
CREATE POLICY "public_chat_all" ON chat_messages FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON podcasts FOR ALL TO service_role USING (true);
CREATE POLICY "public_podcasts_all" ON podcasts FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON psychologist_notes FOR ALL TO service_role USING (true);
CREATE POLICY "public_psychologist_notes_all" ON psychologist_notes FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON consultation_slots FOR ALL TO service_role USING (true);
CREATE POLICY "public_consultation_slots_all" ON consultation_slots FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON qa_questions FOR ALL TO service_role USING (true);
CREATE POLICY "public_qa_questions_all" ON qa_questions FOR ALL TO public USING (true) WITH CHECK (true);
