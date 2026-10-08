-- Doctor directory and appointment fields used by /api/doctors.
-- All directory entries below are illustrative sample data, not verified providers.
CREATE TABLE IF NOT EXISTS public.doctor_specialties (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏥',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty_id TEXT NOT NULL REFERENCES public.doctor_specialties(id),
  specialty_label TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  rating NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  bio TEXT,
  avatar_initials TEXT NOT NULL DEFAULT 'DR',
  avatar_color TEXT NOT NULL DEFAULT '#4a7a9b',
  available_online BOOLEAN NOT NULL DEFAULT FALSE,
  availability_label TEXT NOT NULL DEFAULT 'By request',
  is_sample BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES public.doctors(id),
  ADD COLUMN IF NOT EXISTS consultation_type TEXT CHECK (consultation_type IN ('clinic', 'video')),
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_phone TEXT;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('request_pending', 'scheduled', 'completed', 'cancelled'));
CREATE INDEX IF NOT EXISTS appointments_user_date_idx ON public.appointments (user_id, date, time);

ALTER TABLE public.doctor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

INSERT INTO public.doctor_specialties (id, label, icon, sort_order) VALUES
  ('general', 'General', '👨‍⚕️', 1),
  ('cardiology', 'Cardiology', '❤️', 2),
  ('dermatology', 'Dermatology', '🧴', 3),
  ('neurology', 'Neurology', '🧠', 4),
  ('orthopedics', 'Orthopedics', '🦴', 5),
  ('pediatrics', 'Pediatrics', '👶', 6),
  ('psychiatry', 'Psychiatry', '🧘', 7),
  ('gynecology', 'Gynecology', '🌸', 8),
  ('ophthalmology', 'Eye Care', '👁️', 9)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO public.doctors
  (id,name,specialty_id,specialty_label,experience_years,fee,rating,review_count,bio,avatar_initials,avatar_color,available_online,availability_label,is_sample,sort_order)
VALUES
  ('sample-priya-sharma','Dr. Priya Sharma','cardiology','Cardiology',12,600,4.9,312,'Sample profile: cardiology and preventive heart care. Verify provider credentials and availability before booking.','PS','#e84455',true,'Sample availability',true,1),
  ('sample-arjun-mehta','Dr. Arjun Mehta','general','General',8,400,4.7,528,'Sample profile: general and family medicine. Verify provider credentials and availability before booking.','AM','#4a7a9b',true,'Sample availability',true,2),
  ('sample-sneha-patel','Dr. Sneha Patel','dermatology','Dermatology',6,500,4.8,189,'Sample profile: dermatology. Verify provider credentials and availability before booking.','SP','#e0784a',false,'Sample availability',true,3),
  ('sample-vikram-nair','Dr. Vikram Nair','neurology','Neurology',15,900,4.9,241,'Sample profile: neurology. Verify provider credentials and availability before booking.','VN','#6a5acd',true,'Sample availability',true,4),
  ('sample-kavya-reddy','Dr. Kavya Reddy','pediatrics','Pediatrics',10,450,4.8,407,'Sample profile: pediatrics. Verify provider credentials and availability before booking.','KR','#2e9b6a',true,'Sample availability',true,5),
  ('sample-rohit-sinha','Dr. Rohit Sinha','orthopedics','Orthopedics',11,700,4.6,163,'Sample profile: orthopedics. Verify provider credentials and availability before booking.','RS','#c07830',false,'Sample availability',true,6),
  ('sample-meena-iyer','Dr. Meena Iyer','gynecology','Gynecology',14,650,4.9,294,'Sample profile: obstetrics and gynaecology. Verify provider credentials and availability before booking.','MI','#c0507a',true,'Sample availability',true,7),
  ('sample-suresh-kumar','Dr. Suresh Kumar','psychiatry','Psychiatry',9,800,4.7,132,'Sample profile: psychiatry. Verify provider credentials and availability before booking.','SK','#7a6aaa',true,'Sample availability',true,8),
  ('sample-ananya-ghosh','Dr. Ananya Ghosh','ophthalmology','Eye Care',7,550,4.8,218,'Sample profile: ophthalmology. Verify provider credentials and availability before booking.','AG','#3a8a7a',false,'Sample availability',true,9)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, specialty_id=EXCLUDED.specialty_id, specialty_label=EXCLUDED.specialty_label,
  experience_years=EXCLUDED.experience_years, fee=EXCLUDED.fee, rating=EXCLUDED.rating,
  review_count=EXCLUDED.review_count, bio=EXCLUDED.bio, avatar_initials=EXCLUDED.avatar_initials,
  avatar_color=EXCLUDED.avatar_color, available_online=EXCLUDED.available_online,
  availability_label=EXCLUDED.availability_label, is_sample=TRUE, active=TRUE, sort_order=EXCLUDED.sort_order;
