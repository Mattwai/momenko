-- Drop existing tables that we'll replace
DROP TABLE IF EXISTS "public"."patients" CASCADE;
DROP TABLE IF EXISTS "public"."voice_preferences" CASCADE;
DROP TABLE IF EXISTS "public"."prompts" CASCADE;
DROP TABLE IF EXISTS "public"."sessions" CASCADE;
DROP TABLE IF EXISTS "public"."session_prompts" CASCADE;

-- Create users table (replacing patients)
CREATE TABLE "public"."users" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "full_name" text NOT NULL,
    "avatar_url" text,
    "cultural_profile_id" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create cultural_profiles table
CREATE TABLE "public"."cultural_profiles" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "cultural_group" text NOT NULL CHECK (cultural_group IN ('maori', 'chinese', 'western')),
    "preferred_language" text NOT NULL CHECK (preferred_language IN ('en', 'mi', 'zh')),
    "preferred_terms" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "communication_style" text NOT NULL CHECK (communication_style IN ('indirect_respectful', 'hierarchical_respectful', 'direct_medical')),
    "family_structure" text NOT NULL CHECK (family_structure IN ('whanau_centered', 'filial_piety_based', 'individual_focused')),
    "spiritual_aspects" text NOT NULL CHECK (spiritual_aspects IN ('journey_based', 'karma_concepts', 'optional')),
    "stigma_level" text NOT NULL CHECK (stigma_level IN ('low', 'moderate', 'high')),
    "custom_nuances" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create cultural_contexts table
CREATE TABLE "public"."cultural_contexts" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "profile_id" uuid NOT NULL REFERENCES cultural_profiles(id),
    "context_type" text NOT NULL CHECK (context_type IN ('greeting', 'emotional_support', 'medical_discussion', 'family_interaction')),
    "templates" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "cultural_notes" text[] DEFAULT ARRAY[]::text[],
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create conversations table
CREATE TABLE "public"."conversations" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES users(id),
    "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "last_interaction" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create conversation_preferences table
CREATE TABLE "public"."conversation_preferences" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES users(id) UNIQUE,
    "preferred_volume" numeric NOT NULL DEFAULT 1.0 CHECK (preferred_volume BETWEEN 0.0 AND 2.0),
    "preferred_speech_rate" numeric NOT NULL DEFAULT 1.0 CHECK (preferred_speech_rate BETWEEN 0.5 AND 2.0),
    "preferred_voice_gender" text NOT NULL CHECK (preferred_voice_gender IN ('male', 'female')),
    "reminder_frequency" text NOT NULL CHECK (reminder_frequency IN ('low', 'medium', 'high')),
    "emergency_contact_id" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create cached_phrases table
CREATE TABLE "public"."cached_phrases" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "content" text NOT NULL,
    "language" text NOT NULL CHECK (language IN ('en', 'mi', 'zh')),
    "context" text NOT NULL CHECK (context IN ('casual', 'medical', 'family', 'memory', 'emergency')),
    "cultural_profile_id" uuid NOT NULL REFERENCES cultural_profiles(id),
    "audio_url" text NOT NULL,
    "last_used" timestamp with time zone DEFAULT now() NOT NULL,
    "use_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create emergency_contacts table
CREATE TABLE "public"."emergency_contacts" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES users(id),
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "relationship" text NOT NULL,
    "is_primary" boolean NOT NULL DEFAULT false,
    "notification_preferences" jsonb NOT NULL DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create check_in_schedules table
CREATE TABLE "public"."check_in_schedules" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES users(id),
    "frequency" text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'custom')),
    "preferred_time" time NOT NULL,
    "timezone" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "last_check_in" timestamp with time zone,
    "notification_sent" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint to users table after all tables are created
ALTER TABLE "public"."users" 
ADD CONSTRAINT "users_cultural_profile_id_fkey" 
FOREIGN KEY (cultural_profile_id) REFERENCES cultural_profiles(id);

-- Add foreign key constraint to conversation_preferences table after emergency_contacts is created
ALTER TABLE "public"."conversation_preferences" 
ADD CONSTRAINT "conversation_preferences_emergency_contact_id_fkey" 
FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts(id);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_profiles_updated_at
    BEFORE UPDATE ON cultural_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_contexts_updated_at
    BEFORE UPDATE ON cultural_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_preferences_updated_at
    BEFORE UPDATE ON conversation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cached_phrases_updated_at
    BEFORE UPDATE ON cached_phrases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_in_schedules_updated_at
    BEFORE UPDATE ON check_in_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for user profiles with cultural information
CREATE OR REPLACE VIEW user_profiles_with_cultural AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.cultural_profile_id as profile_ref_id,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    cp.id as cultural_profile_id,
    cp.cultural_group,
    cp.preferred_language,
    cp.preferred_terms,
    cp.communication_style,
    cp.family_structure,
    cp.spiritual_aspects,
    cp.stigma_level,
    cp.custom_nuances,
    cp.created_at as profile_created_at,
    cp.updated_at as profile_updated_at
FROM users u
LEFT JOIN cultural_profiles cp ON u.cultural_profile_id = cp.id;

-- Create function to get user conversation history
CREATE OR REPLACE FUNCTION get_user_conversation_history(
    user_id uuid,
    limit_count integer DEFAULT 100
) 
RETURNS TABLE (
    conversation_id uuid,
    messages jsonb,
    last_interaction timestamp with time zone
) 
LANGUAGE sql
STABLE
AS $$
    SELECT id, messages, last_interaction
    FROM conversations
    WHERE user_id = get_user_conversation_history.user_id
    ORDER BY last_interaction DESC
    LIMIT limit_count;
$$;

-- Create function to update check-in status
CREATE OR REPLACE FUNCTION update_check_in_status(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE check_in_schedules
    SET 
        last_check_in = NOW(),
        notification_sent = false,
        updated_at = NOW()
    WHERE user_id = update_check_in_status.user_id
    AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Similar policies for other tables
CREATE POLICY "Users can read own conversations" ON conversations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversations" ON conversations
    FOR ALL
    USING (auth.uid() = user_id);

-- Emergency contacts policies
CREATE POLICY "Users can read own emergency contacts" ON emergency_contacts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own emergency contacts" ON emergency_contacts
    FOR ALL
    USING (auth.uid() = user_id);

-- Check-in schedules policies
CREATE POLICY "Users can read own check-in schedules" ON check_in_schedules
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own check-in schedules" ON check_in_schedules
    FOR ALL
    USING (auth.uid() = user_id);

-- Cultural profiles are readable by all authenticated users
CREATE POLICY "Authenticated users can read cultural profiles" ON cultural_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Cultural contexts are readable by all authenticated users
CREATE POLICY "Authenticated users can read cultural contexts" ON cultural_contexts
    FOR SELECT
    TO authenticated
    USING (true);

-- Cached phrases are readable by all authenticated users
CREATE POLICY "Authenticated users can read cached phrases" ON cached_phrases
    FOR SELECT
    TO authenticated
    USING (true);

-- Add indexes for performance
CREATE INDEX idx_users_cultural_profile ON users(cultural_profile_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_interaction ON conversations(last_interaction);
CREATE INDEX idx_cultural_contexts_profile_id ON cultural_contexts(profile_id);
CREATE INDEX idx_cached_phrases_cultural_profile ON cached_phrases(cultural_profile_id);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_check_in_schedules_user_id ON check_in_schedules(user_id);
CREATE INDEX idx_check_in_schedules_active ON check_in_schedules(is_active) WHERE is_active = true; 