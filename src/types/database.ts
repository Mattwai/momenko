import { CulturalProfile, CulturalContext } from './cultural';
import { ConversationMessage, ConversationPreferences, CachedPhrase } from './conversation';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          cultural_profile_id: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      cultural_profiles: {
        Row: CulturalProfile;
        Insert: Omit<CulturalProfile, 'id'>;
        Update: Partial<CulturalProfile>;
      };
      cultural_contexts: {
        Row: CulturalContext;
        Insert: Omit<CulturalContext, 'id'>;
        Update: Partial<CulturalContext>;
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          messages: ConversationMessage[];
          last_interaction: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      conversation_preferences: {
        Row: ConversationPreferences;
        Insert: Omit<ConversationPreferences, 'id'>;
        Update: Partial<ConversationPreferences>;
      };
      cached_phrases: {
        Row: CachedPhrase;
        Insert: Omit<CachedPhrase, 'id'>;
        Update: Partial<CachedPhrase>;
      };
      emergency_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          relationship: string;
          is_primary: boolean;
          notification_preferences: {
            email: boolean;
            sms: boolean;
            push: boolean;
          };
        };
        Insert: Omit<Database['public']['Tables']['emergency_contacts']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['emergency_contacts']['Insert']>;
      };
      check_in_schedules: {
        Row: {
          id: string;
          user_id: string;
          frequency: 'daily' | 'weekly' | 'custom';
          preferred_time: string;
          timezone: string;
          is_active: boolean;
          last_check_in: string | null;
          notification_sent: boolean;
        };
        Insert: Omit<Database['public']['Tables']['check_in_schedules']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['check_in_schedules']['Insert']>;
      };
    };
    Views: {
      user_profiles_with_cultural: {
        Row: Database['public']['Tables']['users']['Row'] & {
          cultural_profile: Database['public']['Tables']['cultural_profiles']['Row'];
        };
      };
    };
    Functions: {
      get_user_conversation_history: {
        Args: { user_id: string; limit: number };
        Returns: Array<Database['public']['Tables']['conversations']['Row']>;
      };
      update_check_in_status: {
        Args: { user_id: string };
        Returns: boolean;
      };
    };
  };
} 