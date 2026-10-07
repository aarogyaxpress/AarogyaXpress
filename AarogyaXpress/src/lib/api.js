import { ensureProfileRecord } from "./profile";

/** Creates a minimal Supabase user row before profile setup is completed. */
export async function saveUserToSupabase(firebaseUser) {
  const result = await ensureProfileRecord(firebaseUser);
  return { needsSetup: !result.profile_completed };
}
