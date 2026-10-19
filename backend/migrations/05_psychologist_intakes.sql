-- Psychologist visit register; curator identity is recorded as text because no curator accounts are used.
CREATE TABLE IF NOT EXISTS psychologist_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    curator_name TEXT NOT NULL,
    paper_signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psychologist_intakes_created_at ON psychologist_intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psychologist_intakes_signature ON psychologist_intakes(paper_signed, created_at DESC);
ALTER TABLE psychologist_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_psychologist_intakes_all" ON psychologist_intakes FOR ALL TO service_role USING (true) WITH CHECK (true);
