-- Preserve the visit and paper-signature record when an employee account is removed.
ALTER TABLE psychologist_intakes
    ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE psychologist_intakes
    DROP CONSTRAINT IF EXISTS psychologist_intakes_created_by_fkey;

ALTER TABLE psychologist_intakes
    ADD CONSTRAINT psychologist_intakes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
