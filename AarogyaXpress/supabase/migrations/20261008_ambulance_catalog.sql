-- Demo catalog for the ambulance screen. These rows are explicitly marked as
-- samples; they do not represent a live ambulance-dispatch integration.
CREATE TABLE IF NOT EXISTS public.ambulance_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🚑',
  eta_minutes INTEGER,
  price_min INTEGER,
  price_max INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_sample BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ambulance_types_eta_nonnegative CHECK (eta_minutes IS NULL OR eta_minutes >= 0),
  CONSTRAINT ambulance_types_price_range CHECK (price_min IS NULL OR price_max IS NULL OR price_max >= price_min)
);

CREATE TABLE IF NOT EXISTS public.ambulance_hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  has_emergency_department BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_sample BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambulance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  ambulance_type_id TEXT REFERENCES public.ambulance_types(id) ON DELETE SET NULL,
  ambulance_type_label TEXT,
  emergency_number TEXT NOT NULL CHECK (emergency_number IN ('108', '102', '112')),
  status TEXT NOT NULL DEFAULT 'request_logged' CHECK (status IN ('request_logged', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambulance_emergency_contacts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📞',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ambulance_requests_firebase_uid_created_idx
  ON public.ambulance_requests (firebase_uid, created_at DESC);

ALTER TABLE public.ambulance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulance_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Sample estimates preserve the prototype values, visibly marked as samples
-- in the UI. Replace them with verified provider data before offering service.
INSERT INTO public.ambulance_types (id, label, description, icon, eta_minutes, price_min, price_max, is_sample, sort_order)
VALUES
  ('basic', 'Basic Life Support', 'Standard ambulance · EMT team', '🚑', 8, 500, 800, TRUE, 1),
  ('advanced', 'Advanced Life Support', 'ICU-equipped · Paramedic team', '🚨', 12, 1200, 1800, TRUE, 2),
  ('neonatal', 'Neonatal Transport', 'Incubator-equipped · Specialist', '👶', 15, 2000, 3000, TRUE, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ambulance_emergency_contacts (id, label, phone, icon, sort_order)
VALUES
  ('ambulance-108', 'Ambulance', '108', '🚑', 1),
  ('maternal-102', 'Maternal & Child', '102', '🤱', 2),
  ('emergency-112', 'Emergency', '112', '🆘', 3)
ON CONFLICT (id) DO NOTHING;

-- Hospital listings are added by 20261008_dehradun_hospitals.sql.
