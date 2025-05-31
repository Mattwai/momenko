import 'react-native-url-polyfill/auto';
import { supabase } from '../lib/supabase';

// Helper function to handle errors consistently
export const handleSupabaseError = (error: Error | null) => {
  if (error) {
    console.error('Supabase Error:', error.message);
    throw error;
  }
};

// User management functions
export const userService = {
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    handleSupabaseError(error);
    return user;
  },

  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*, cultural_profiles(*)')
      .eq('id', userId)
      .single();
    
    handleSupabaseError(error);
    return data;
  },

  updateUserProfile: async (userId: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    handleSupabaseError(error);
    return data;
  }
};

// Cultural profile management
export const culturalService = {
  getCulturalProfile: async (profileId: string) => {
    const { data, error } = await supabase
      .from('cultural_profiles')
      .select('*, cultural_contexts(*)')
      .eq('id', profileId)
      .single();
    
    handleSupabaseError(error);
    return data;
  },

  getCulturalContexts: async (profileId: string) => {
    const { data, error } = await supabase
      .from('cultural_contexts')
      .select('*')
      .eq('profile_id', profileId);
    
    handleSupabaseError(error);
    return data;
  }
};

// Conversation management
export const conversationService = {
  getConversationHistory: async (userId: string, limit = 100) => {
    const { data, error } = await supabase
      .rpc('get_user_conversation_history', {
        user_id: userId,
        limit_count: limit
      });
    
    handleSupabaseError(error);
    return data;
  },

  saveConversation: async (userId: string, messages: Record<string, unknown>[]) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        messages,
        last_interaction: new Date().toISOString()
      })
      .select()
      .single();
    
    handleSupabaseError(error);
    return data;
  },

  updateConversation: async (conversationId: string, messages: Record<string, unknown>[]) => {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        messages,
        last_interaction: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();
    
    handleSupabaseError(error);
    return data;
  }
};

// Cached phrases management
export const phrasesService = {
  getCachedPhrases: async (culturalProfileId: string, context: string) => {
    const { data, error } = await supabase
      .from('cached_phrases')
      .select('*')
      .eq('cultural_profile_id', culturalProfileId)
      .eq('context', context)
      .order('use_count', { ascending: false });
    
    handleSupabaseError(error);
    return data;
  },

  updatePhraseUsage: async (phraseId: string) => {
    // First get the current count
    const { data: currentPhrase, error: getError } = await supabase
      .from('cached_phrases')
      .select('use_count')
      .eq('id', phraseId)
      .single();
    
    handleSupabaseError(getError);
    
    if (!currentPhrase) {
      throw new Error('Phrase not found');
    }

    // Then update with the incremented count
    const { data, error } = await supabase
      .from('cached_phrases')
      .update({
        use_count: (currentPhrase.use_count || 0) + 1,
        last_used: new Date().toISOString()
      })
      .eq('id', phraseId)
      .select()
      .single();
    
    handleSupabaseError(error);
    return data;
  }
};

// Emergency contact management
export const emergencyService = {
  getEmergencyContacts: async (userId: string) => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });
    
    handleSupabaseError(error);
    return data;
  },

  updateEmergencyContact: async (contactId: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();
    
    handleSupabaseError(error);
    return data;
  }
};

// Check-in management
export const checkInService = {
  getCheckInSchedule: async (userId: string) => {
    const { data, error } = await supabase
      .from('check_in_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    handleSupabaseError(error);
    return data;
  },

  updateCheckInStatus: async (userId: string) => {
    const { data, error } = await supabase
      .rpc('update_check_in_status', { user_id: userId });
    
    handleSupabaseError(error);
    return data;
  }
}; 