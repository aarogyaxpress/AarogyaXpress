-- Replace the old Delhi demo cards with a sourced Dehradun directory.
ALTER TABLE public.ambulance_hospitals
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

CREATE TABLE IF NOT EXISTS public.ambulance_emergency_contacts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📞',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.ambulance_emergency_contacts ENABLE ROW LEVEL SECURITY;
INSERT INTO public.ambulance_emergency_contacts (id, label, phone, icon, sort_order)
VALUES
  ('ambulance-108', 'Ambulance', '108', '🚑', 1),
  ('maternal-102', 'Maternal & Child', '102', '🤱', 2),
  ('emergency-112', 'Emergency', '112', '🆘', 3)
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, phone=EXCLUDED.phone, icon=EXCLUDED.icon, sort_order=EXCLUDED.sort_order, is_active=TRUE;

UPDATE public.ambulance_hospitals
SET is_active = FALSE
WHERE city = 'Delhi';

INSERT INTO public.ambulance_hospitals
  (id, name, city, address, website, phone, source_url, has_emergency_department, is_active, is_sample, sort_order)
VALUES
  ('doon-hospital', 'Doon Hospital', 'Dehradun', 'New Road, Race Course, Dehradun, Uttarakhand 248001', NULL, NULL,
   'https://dehradun.nic.in/public-utility/doon-hospital-dehradun/', FALSE, TRUE, FALSE, 1),
  ('coronation-hospital', 'Coronation Hospital', 'Dehradun', 'Dalanwala, Dehradun, Uttarakhand 248001', NULL, NULL,
   'https://dehradun.nic.in/public-utility-category/hospitals/', FALSE, TRUE, FALSE, 2),
  ('max-dehradun', 'Max Super Speciality Hospital', 'Dehradun', 'Mussoorie Diversion Road, Dehradun, Uttarakhand 248001',
   'https://www.maxhealthcare.in/hospital-network/max-super-speciality-hospital-dehradun', NULL,
   'https://www.maxhealthcare.in/hospital-network/max-super-speciality-hospital-dehradun', TRUE, TRUE, FALSE, 3),
  ('shri-mahant-indiresh', 'Shri Mahant Indiresh Hospital', 'Dehradun', 'Patel Nagar, Dehradun, Uttarakhand 248001',
   'https://www.smihospital.com/', '0135-6672600',
   'https://www.smihospital.com/', TRUE, TRUE, FALSE, 4),
  ('graphic-era-hospital', 'Graphic Era Hospital', 'Dehradun', '16th Milestone, Chakrata Road, Dhulkot Mafi, Dehradun, Uttarakhand 248008',
   'https://geimshospital.com/', '1800-889-7351',
   'https://geimshospital.com/', TRUE, TRUE, FALSE, 5),
  ('synergy-dehradun', 'Synergy Institute of Medical Sciences', 'Dehradun', 'Ballupur, Dehradun, Uttarakhand',
   'https://www.synergyhealthcare.in/', '0135-2226111',
   'https://www.synergyhealthcare.in/', TRUE, TRUE, FALSE, 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  website = EXCLUDED.website,
  phone = EXCLUDED.phone,
  source_url = EXCLUDED.source_url,
  has_emergency_department = EXCLUDED.has_emergency_department,
  is_active = TRUE,
  is_sample = FALSE,
  sort_order = EXCLUDED.sort_order;
