import { supabase } from './supabaseClient';

export async function fetchEmergencyContacts(userId: string) {
  return supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
}

export async function addEmergencyContact(userId: string, contact: {
  name: string;
  role?: string;
  contact_info: string;
  notes?: string;
}) {
  return supabase
    .from('emergency_contacts')
    .insert([{ user_id: userId, ...contact }]);
}

export async function deleteEmergencyContact(contactId: string) {
  return supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId);
} 