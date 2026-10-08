-- Safe to run more than once. Apply in the Supabase SQL Editor when the
-- profile API reports an incomplete users schema.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS height NUMERIC,
  ADD COLUMN IF NOT EXISTS allergies TEXT,
  ADD COLUMN IF NOT EXISTS chronic_diseases TEXT,
  ADD COLUMN IF NOT EXISTS emergency_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- The API creates or updates a user row by Firebase UID.
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_unique_idx
  ON public.users (firebase_uid);

UPDATE public.users
SET profile_completed = TRUE
WHERE phone IS NOT NULL
  AND age IS NOT NULL
  AND gender IS NOT NULL
  AND blood_group IS NOT NULL
  AND emergency_name IS NOT NULL
  AND emergency_contact IS NOT NULL;
