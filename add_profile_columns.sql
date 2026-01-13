-- Add missing columns to public_profiles table
ALTER TABLE public_profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS date_of_birth date;
