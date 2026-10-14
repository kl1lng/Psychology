-- ============================================================
-- AISezim Migration 02: Departments, Teachers & Question Responses
-- ============================================================

-- 1. Update users role check constraint to include 'admin' and 'teacher'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('student', 'psychologist', 'teacher', 'admin', 'guest'));

-- 2. Create Departments table (Кафедры)
CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    code        TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

-- 3. Add department_id to Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- 4. Create Question Responses table (Детализация ответов учеников)
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

-- 5. Row Level Security policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON departments FOR ALL TO service_role USING (true);
CREATE POLICY "public_departments_all" ON departments FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON question_responses FOR ALL TO service_role USING (true);
CREATE POLICY "public_question_responses_all" ON question_responses FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Seed initial departments
INSERT INTO departments (name, code)
VALUES 
    ('Математика, Информатика, Физика', 'MIPH2026'),
    ('Казахский, русский и иностранные языки', 'LANG2026'),
    ('Естественные науки (Химия, Биология, География)', 'SCI2026'),
    ('История и общественные дисциплины', 'HUM2026'),
    ('Физическая культура, искусство и технологии', 'TECH2026')
ON CONFLICT (code) DO NOTHING;
