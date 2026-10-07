import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment."
  );
}

// Supabase rejects empty URL/key values during client construction, which can
// prevent the entire React app from rendering on a deployment with missing
// environment variables. Keep the UI bootable; backend requests will fail
// until the real public Supabase configuration is added.
export const supabase = createClient(
  supabaseUrl || 'https://missing-project.supabase.co',
  supabaseAnonKey || 'missing-anon-key'
);
