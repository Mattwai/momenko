import { supabase } from './supabaseClient';

export async function fetchChatHistory(userId: string) {
  return supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });
}

export async function addChatMessage(userId: string, message: string, sender: 'user' | 'bot') {
  return supabase
    .from('chat_history')
    .insert([{ user_id: userId, message, sender }]);
} 