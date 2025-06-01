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

export async function fetchUserMemories(userId: string) {
  return supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
}

export async function addUserMemory(userId: string, memory: { type: string; content: string; metadata?: object }) {
  return supabase
    .from('user_memories')
    .insert([{ user_id: userId, ...memory }]);
}

export async function updateUserMemory(memoryId: string, content: string) {
  return supabase
    .from('user_memories')
    .update({ content })
    .eq('id', memoryId);
}

export async function deleteUserMemory(memoryId: string) {
  return supabase
    .from('user_memories')
    .delete()
    .eq('id', memoryId);
} 