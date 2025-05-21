import { supabase } from './supabaseClient';

export async function fetchUserProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export async function updateUserProfile(userId: string, profileData: { full_name?: string; phone_number?: string }) {
  return supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);
} 