-- ============================================================================
-- AISezim Platform — Row Level Security (RLS) Policies
-- Migration 002: Enforce data isolation per role
-- ============================================================================
-- USAGE: Execute this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- NOTE: Requires that the Supabase client uses the `service_role` key for backend
--       operations. The RLS policies below apply to `anon` and `authenticated` roles.
-- ============================================================================

-- ─── 1. Enable RLS on all sensitive tables ──────────────────────────────────

ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS psychologist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qa_questions ENABLE ROW LEVEL SECURITY;

-- ─── 2. USERS table policies ────────────────────────────────────────────────

-- Students can only read their own profile
CREATE POLICY "students_read_own_profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- Admins can manage all users
CREATE POLICY "admins_manage_users" ON users
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ─── 3. ASSESSMENT_RESULTS table policies ───────────────────────────────────

-- Students can only read their own assessment results
CREATE POLICY "students_read_own_assessments" ON assessment_results
  FOR SELECT USING (
    student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- Students can insert their own assessment results (when submitting tests)
CREATE POLICY "students_insert_own_assessments" ON assessment_results
  FOR INSERT WITH CHECK (
    student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- Psychologists and admins can read all assessment results
CREATE POLICY "psychologists_read_all_assessments" ON assessment_results
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- ─── 4. QUESTION_RESPONSES table policies ───────────────────────────────────

-- Students can only read their own detailed responses
CREATE POLICY "students_read_own_responses" ON question_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_results ar
      WHERE ar.id = question_responses.test_result_id
        AND (ar.student_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin', 'psychologist'))
    )
  );

-- Students can insert responses for their own tests
CREATE POLICY "students_insert_own_responses" ON question_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_results ar
      WHERE ar.id = question_responses.test_result_id
        AND (ar.student_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin', 'psychologist'))
    )
  );

-- ─── 5. MOOD_ENTRIES table policies ─────────────────────────────────────────

-- Students can only manage their own mood entries
CREATE POLICY "students_manage_own_mood" ON mood_entries
  FOR ALL USING (
    student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- ─── 6. DIALOGS table policies ──────────────────────────────────────────────

-- Students can only access their own dialogs
CREATE POLICY "students_own_dialogs" ON dialogs
  FOR ALL USING (
    student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- ─── 7. CHAT_MESSAGES table policies ────────────────────────────────────────

-- Messages accessible only through dialog ownership
CREATE POLICY "chat_through_dialog" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dialogs d
      WHERE d.id = chat_messages.dialog_id
        AND (d.student_id = auth.uid()::text OR auth.jwt() ->> 'role' IN ('admin', 'psychologist'))
    )
  );

-- ─── 8. PSYCHOLOGIST_NOTES table policies ───────────────────────────────────

-- Only psychologists and admins can access confidential notes
CREATE POLICY "psychologists_manage_notes" ON psychologist_notes
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- ─── 9. QA_QUESTIONS table policies ─────────────────────────────────────────

-- Published questions are readable by all authenticated users
CREATE POLICY "public_read_published_qa" ON qa_questions
  FOR SELECT USING (
    is_published = true
    OR student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- Students can insert their own questions
CREATE POLICY "students_insert_own_qa" ON qa_questions
  FOR INSERT WITH CHECK (
    student_id = auth.uid()::text
    OR auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- Only psychologists can update/answer questions
CREATE POLICY "psychologists_manage_qa" ON qa_questions
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('admin', 'psychologist')
  );

-- ─── 10. Service role bypass ────────────────────────────────────────────────
-- NOTE: The backend uses `service_role` key which bypasses RLS by default.
-- These policies primarily protect against direct client-side Supabase access
-- and ensure defense-in-depth even if a token is leaked.
