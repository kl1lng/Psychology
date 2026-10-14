-- ============================================================
-- AISezim Migration 04: Psychologist Appointments Booking
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      TEXT NOT NULL,
    notes           TEXT,
    preferred_time  TEXT,
    
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    source          TEXT NOT NULL DEFAULT 'chat',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);

-- Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_appointments_all" ON appointments FOR ALL TO service_role USING (true);
CREATE POLICY "public_appointments_all" ON appointments FOR ALL TO public USING (true) WITH CHECK (true);
