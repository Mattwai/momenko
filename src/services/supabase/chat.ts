import { supabase } from './supabaseClient';

export async function fetchChatHistory(userId: string) {
  console.log(`Fetching chat history for user: ${userId}`);
  const response = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });
  
  if (response.error) {
    console.error('Error fetching chat history:', response.error);
  } else {
    console.log(`Retrieved ${response.data?.length || 0} messages from chat history`);
  }
  
  return response;
}

export async function addChatMessage(userId: string, message: string, sender: 'user' | 'bot') {
  console.log(`Adding ${sender} message to chat history for user: ${userId}`);
  
  const messageData = {
    user_id: userId,
    message,
    sender,
    timestamp: new Date().toISOString()
  };
  
  const response = await supabase
    .from('chat_history')
    .insert([messageData]);
  
  if (response.error) {
    console.error('Error adding chat message:', response.error);
  } else {
    console.log('Successfully added message to chat history');
  }
  
  return response;
} 