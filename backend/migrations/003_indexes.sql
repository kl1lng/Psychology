-- ============================================================================
-- AISezim Platform — Performance Indexes
-- Migration 003: Create indexes on frequently queried columns
-- ============================================================================
-- USAGE: Execute this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ─── Users table indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users (department_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users (class_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- ─── Assessment Results indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assessment_results_student_id ON assessment_results (student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_test_id ON assessment_results (test_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_risk_level ON assessment_results (risk_level);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON assessment_results (created_at DESC);

-- Composite index for common psychologist query pattern
CREATE INDEX IF NOT EXISTS idx_assessment_results_student_test ON assessment_results (student_id, test_id);

-- ─── Question Responses indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_question_responses_test_result_id ON question_responses (test_result_id);

-- ─── Mood Entries indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mood_entries_student_id ON mood_entries (student_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries (created_at DESC);

-- ─── Dialogs indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dialogs_student_id ON dialogs (student_id);
CREATE INDEX IF NOT EXISTS idx_dialogs_status ON dialogs (status);

-- ─── Chat Messages indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_messages_dialog_id ON chat_messages (dialog_id);

-- ─── QA Questions indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qa_questions_student_id ON qa_questions (student_id);
CREATE INDEX IF NOT EXISTS idx_qa_questions_is_published ON qa_questions (is_published);

-- ─── Psychologist Notes indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_psychologist_notes_student_id ON psychologist_notes (student_id);
