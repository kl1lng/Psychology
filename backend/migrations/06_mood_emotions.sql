ALTER TABLE mood_entries
    ADD COLUMN IF NOT EXISTS emotion TEXT
    CHECK (emotion IS NULL OR emotion IN ('joy', 'calm', 'sadness', 'anger', 'anxiety', 'tired'));

CREATE INDEX IF NOT EXISTS idx_mood_emotion_created_at ON mood_entries(emotion, created_at DESC);
