-- Apply in the Supabase SQL Editor for projects created before profile setup
-- was added to schema.sql.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS chronic_diseases TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.users
SET profile_completed = TRUE
WHERE phone IS NOT NULL
  AND age IS NOT NULL
  AND gender IS NOT NULL
  AND blood_group IS NOT NULL
  AND emergency_name IS NOT NULL
  AND emergency_contact IS NOT NULL;
