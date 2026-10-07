import { supabase } from './supabase';

/**
 * Reusable function to save or update Firebase user in Supabase.
 * Returns { needsSetup: boolean }
 */
export const saveUserToSupabase = async (firebaseUser, additionalData = {}) => {
  try {
    const payload = {
      firebase_uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || 'New User',
      ...additionalData
    };

    // Upsert matches based on the unique 'firebase_uid' column
    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { 
        onConflict: 'firebase_uid',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Upsert Error:', error.message);
      throw new Error(error.message);
    }

    console.log('✅ User saved to Supabase:', data);
    // needsSetup is true if user has never completed profile
    const needsSetup = !data?.profile_completed;
    return { user: data, needsSetup };
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    throw error;
  }
};
