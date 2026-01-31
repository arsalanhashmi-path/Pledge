-- Migration: Add Student Identity Fields to public_profiles
ALTER TABLE public_profiles 
ADD COLUMN IF NOT EXISTS institution_id TEXT,
ADD COLUMN IF NOT EXISTS campus_code TEXT,
ADD COLUMN IF NOT EXISTS batch_year INTEGER,
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS is_hostelite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS societies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT FALSE;

-- Optional: Add a comment to describe the table pivot
COMMENT ON TABLE public_profiles IS 'Stores student-only verified profiles for Pakistani universities.';
