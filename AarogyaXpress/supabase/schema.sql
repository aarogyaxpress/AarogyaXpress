-- Aarogya Xpress Full Database Schema & Configuration

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  blood_group TEXT,
  weight NUMERIC,
  height NUMERIC,
  allergies TEXT,
  emergency_name TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. MEDICINES TABLE
-- ==========================================
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  instructions TEXT,
  pills_remaining INTEGER DEFAULT 0,
  pharmacy_distance TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_medicine_per_user UNIQUE(user_id, name)
);

CREATE TRIGGER update_medicines_updated_at 
BEFORE UPDATE ON medicines 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. SCANS TABLE
-- ==========================================
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  image_url TEXT,
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. REMINDERS TABLE
-- ==========================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  days TEXT[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'done')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. APPOINTMENTS TABLE
-- ==========================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialty TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. DOSE LOGS TABLE
-- ==========================================
CREATE TABLE dose_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are highly restrictive by default.
-- All secure mutations and reads are assumed to be routed through the trusted 
-- Express backend using the SUPABASE_SERVICE_KEY bypassing RLS.
