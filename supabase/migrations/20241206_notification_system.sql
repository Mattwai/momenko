-- Create notification system tables

-- Notification templates for cultural-aware messaging
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'medication_reminder', 'appointment', 'emergency', 'family_update', 'wellness_check', 'cultural_celebration', 'caregiver_alert')),
    cultural_group TEXT NOT NULL CHECK (cultural_group IN ('maori', 'chinese', 'western')),
    language TEXT NOT NULL CHECK (language IN ('en', 'mi', 'zh')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_buttons JSONB DEFAULT '[]'::jsonb,
    cultural_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled notifications
CREATE TABLE scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'medication_reminder', 'appointment', 'emergency', 'family_update', 'wellness_check', 'cultural_celebration', 'caregiver_alert')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'critical')) DEFAULT 'normal',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    channels TEXT[] DEFAULT ARRAY['push'],
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'custom')),
    recurrence_config JSONB DEFAULT '{}'::jsonb,
    cultural_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enabled_channels TEXT[] DEFAULT ARRAY['push'],
    quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}'::jsonb,
    cultural_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    type_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    emergency_contacts UUID[],
    family_notifications JSONB DEFAULT '{"enabled": false, "contacts": [], "includeInRoutine": false, "emergencyOnly": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-in schedules
CREATE TABLE check_in_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    recurrence TEXT NOT NULL CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'custom')) DEFAULT 'daily',
    preferred_time TIME NOT NULL DEFAULT '10:00',
    timezone TEXT NOT NULL DEFAULT 'Pacific/Auckland',
    cultural_considerations JSONB DEFAULT '{"avoidReligiousHours": false, "includeFamilyGreeting": false, "useTraditionalPhrases": false}'::jsonb,
    notifications JSONB DEFAULT '{"reminder": {"enabled": false, "minutesBefore": 15}, "followUp": {"enabled": false, "minutesAfter": 30}}'::jsonb,
    last_check_in TIMESTAMP WITH TIME ZONE,
    missed_count INTEGER DEFAULT 0,
    escalation_rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency contacts (extended from existing)
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": false, "weekly_reports": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family notifications
CREATE TABLE family_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    family_contact_id UUID REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('summary', 'concern', 'milestone', 'emergency')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    cultural_context TEXT,
    includes_conversation_summary BOOLEAN DEFAULT FALSE,
    conversation_ids UUID[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    requires_response BOOLEAN DEFAULT FALSE,
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Caregiver alerts
CREATE TABLE caregiver_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    caregiver_id UUID, -- References caregiver system
    alert_type TEXT NOT NULL CHECK (alert_type IN ('missed_checkin', 'behavioral_change', 'health_concern', 'family_request', 'emergency')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'normal', 'high', 'critical')) DEFAULT 'normal',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    cultural_context TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    suggested_actions TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Wellness indicators
CREATE TABLE wellness_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_completed BOOLEAN DEFAULT FALSE,
    conversation_quality TEXT CHECK (conversation_quality IN ('poor', 'fair', 'good', 'excellent')),
    mood_indicators JSONB DEFAULT '{"anxious": false, "confused": false, "content": false, "agitated": false, "responsive": false}'::jsonb,
    cultural_engagement JSONB DEFAULT '{"traditionalGreetingsUsed": false, "familyMentioned": false, "culturalTopicsDiscussed": false, "spiritualReferencesNoted": false}'::jsonb,
    concerns TEXT[],
    positive_notes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Notification delivery logs
CREATE TABLE notification_delivery_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'voice_call', 'in_app')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')) DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    cultural_adaptations TEXT[]
);

-- Wellness concerns (for trend analysis)
CREATE TABLE wellness_concerns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    concern_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')) DEFAULT 'moderate',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Wellness reports (weekly summaries)
CREATE TABLE wellness_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    check_ins_completed INTEGER DEFAULT 0,
    total_days INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    average_conversation_quality DECIMAL(3,2) DEFAULT 0.0,
    concerns TEXT[],
    positive_notes TEXT[],
    cultural_engagement_score DECIMAL(5,2) DEFAULT 0.0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Create indexes for better performance
CREATE INDEX idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_is_active ON scheduled_notifications(is_active);
CREATE INDEX idx_check_in_schedules_user_id ON check_in_schedules(user_id);
CREATE INDEX idx_check_in_schedules_is_active ON check_in_schedules(is_active);
CREATE INDEX idx_family_notifications_user_id ON family_notifications(user_id);
CREATE INDEX idx_family_notifications_is_read ON family_notifications(is_read);
CREATE INDEX idx_caregiver_alerts_user_id ON caregiver_alerts(user_id);
CREATE INDEX idx_caregiver_alerts_is_resolved ON caregiver_alerts(is_resolved);
CREATE INDEX idx_wellness_indicators_user_date ON wellness_indicators(user_id, date);
CREATE INDEX idx_notification_delivery_logs_user_id ON notification_delivery_logs(user_id);
CREATE INDEX idx_notification_delivery_logs_timestamp ON notification_delivery_logs(timestamp);
CREATE INDEX idx_notification_templates_type_cultural_lang ON notification_templates(type, cultural_group, language);

-- Create RLS policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_reports ENABLE ROW LEVEL SECURITY;

-- Notification templates - readable by all authenticated users
CREATE POLICY "Notification templates are readable by authenticated users" ON notification_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only access their own scheduled notifications
CREATE POLICY "Users can access their own scheduled notifications" ON scheduled_notifications
    USING (auth.uid() = user_id);

-- Users can only access their own notification preferences
CREATE POLICY "Users can access their own notification preferences" ON notification_preferences
    USING (auth.uid() = user_id);

-- Users can only access their own check-in schedules
CREATE POLICY "Users can access their own check-in schedules" ON check_in_schedules
    USING (auth.uid() = user_id);

-- Users can only access their own emergency contacts
CREATE POLICY "Users can access their own emergency contacts" ON emergency_contacts
    USING (auth.uid() = user_id);

-- Family notifications - accessible by user and their family contacts
CREATE POLICY "Users can access their family notifications" ON family_notifications
    USING (auth.uid() = user_id);

-- Caregiver alerts - accessible by user and caregivers
CREATE POLICY "Users can access their caregiver alerts" ON caregiver_alerts
    USING (auth.uid() = user_id);

-- Users can only access their own wellness indicators
CREATE POLICY "Users can access their own wellness indicators" ON wellness_indicators
    USING (auth.uid() = user_id);

-- Users can only access their own notification delivery logs
CREATE POLICY "Users can access their own notification delivery logs" ON notification_delivery_logs
    USING (auth.uid() = user_id);

-- Users can only access their own wellness concerns
CREATE POLICY "Users can access their own wellness concerns" ON wellness_concerns
    USING (auth.uid() = user_id);

-- Users can only access their own wellness reports
CREATE POLICY "Users can access their own wellness reports" ON wellness_reports
    USING (auth.uid() = user_id);

-- Insert default notification templates
INSERT INTO notification_templates (type, cultural_group, language, title, message, cultural_context) VALUES
-- Māori templates
('check_in', 'maori', 'mi', 'Kia ora, he pēhea koe?', 'He taima pai ki te kōrero. Kei te tawhiti koe?', 'Traditional greeting with family consideration'),
('check_in', 'maori', 'en', 'Hello, how are you feeling today?', 'It''s time for our gentle check-in. How is your whānau?', 'Respectful approach including family'),
('emergency', 'maori', 'mi', 'He tawhiti koe?', 'Kaore au i rongo ki a koe. Kei te pai koe?', 'Gentle concern without alarm'),
('emergency', 'maori', 'en', 'Checking in with you', 'We haven''t heard from you today. Is everything well with you and your whānau?', 'Family-inclusive concern'),

-- Chinese templates
('check_in', 'chinese', 'zh', '您好，您今天感觉怎么样？', '是时候进行温和的问候了。您的家人都好吗？', 'Respectful hierarchical approach'),
('check_in', 'chinese', 'en', 'Good day, how are you feeling?', 'Time for our respectful check-in. How is your family today?', 'Formal respectful tone with family consideration'),
('emergency', 'chinese', 'zh', '我们关心您', '我们已经一段时间没有收到您的消息了。您还好吗？', 'Respectful concern expression'),
('emergency', 'chinese', 'en', 'We are concerned about you', 'We haven''t heard from you today. Are you well? Should we contact your family?', 'Hierarchical concern with family involvement'),

-- Western templates
('check_in', 'western', 'en', 'Daily Check-in', 'Hi! Ready for our daily conversation?', 'Direct friendly approach'),
('emergency', 'western', 'en', 'Wellness Check', 'We haven''t heard from you today. Is everything okay?', 'Direct but caring approach'),
('wellness_check', 'western', 'en', 'How are you doing?', 'Just checking in to see how you''re feeling today.', 'Casual wellness inquiry');

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_in_schedules_updated_at BEFORE UPDATE ON check_in_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wellness_indicators_updated_at BEFORE UPDATE ON wellness_indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();