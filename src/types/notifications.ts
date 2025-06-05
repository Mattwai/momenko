import { CulturalGroup, PreferredLanguage } from './cultural';

export type NotificationType = 
  | 'check_in' 
  | 'medication_reminder' 
  | 'appointment' 
  | 'emergency' 
  | 'family_update' 
  | 'wellness_check' 
  | 'cultural_celebration'
  | 'caregiver_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationChannel = 'push' | 'sms' | 'email' | 'voice_call' | 'in_app';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface CulturalNotificationConfig {
  culturalGroup: CulturalGroup;
  respectfulHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  avoidDays: string[]; // Days to avoid (e.g., ['sunday'] for some cultures)
  specialConsiderations: {
    familyInvolvement: boolean;
    indirectCommunication: boolean;
    hierarchicalApproach: boolean;
    spiritualSensitivity: boolean;
  };
  preferredChannels: NotificationChannel[];
  escalationDelay: number; // minutes before escalating
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  culturalGroup: CulturalGroup;
  language: PreferredLanguage;
  title: string;
  message: string;
  actionButtons?: {
    label: string;
    action: string;
  }[];
  culturalContext?: string;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  scheduledFor: string; // ISO timestamp
  channels: NotificationChannel[];
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceConfig?: {
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    endDate?: string;
  };
  culturalConfig: CulturalNotificationConfig;
  metadata?: Record<string, string | number | boolean | null>;
  isActive: boolean;
  lastSent?: string;
  failureCount: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  enabledChannels: NotificationChannel[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  culturalConfig: CulturalNotificationConfig;
  typePreferences: {
    [K in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    };
  };
  emergencyContacts: string[]; // Contact IDs for escalation
  familyNotifications: {
    enabled: boolean;
    contacts: string[]; // Family member contact IDs
    includeInRoutine: boolean;
    emergencyOnly: boolean;
  };
}

export interface CheckInSchedule {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  recurrence: RecurrencePattern;
  preferredTime: string; // HH:mm format
  timezone: string;
  culturalConsiderations: {
    avoidReligiousHours: boolean;
    includeFamilyGreeting: boolean;
    useTraditionalPhrases: boolean;
  };
  notifications: {
    reminder: {
      enabled: boolean;
      minutesBefore: number;
    };
    followUp: {
      enabled: boolean;
      minutesAfter: number;
    };
  };
  lastCheckIn?: string;
  missedCount: number;
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  id: string;
  triggerAfterMinutes: number;
  action: 'notify_family' | 'notify_caregiver' | 'call_emergency' | 'schedule_visit';
  contacts: string[]; // Contact IDs to notify
  message: string;
  culturallyAppropriate: boolean;
}

export interface FamilyNotification {
  id: string;
  userId: string;
  familyContactId: string;
  type: 'summary' | 'concern' | 'milestone' | 'emergency';
  title: string;
  content: string;
  culturalContext?: string;
  includesConversationSummary: boolean;
  conversationIds?: string[];
  timestamp: string;
  isRead: boolean;
  requiresResponse?: boolean;
}

export interface CaregiverAlert {
  id: string;
  userId: string;
  caregiverId: string;
  alertType: 'missed_checkin' | 'behavioral_change' | 'health_concern' | 'family_request' | 'emergency';
  severity: NotificationPriority;
  title: string;
  description: string;
  culturalContext?: string;
  actionRequired: boolean;
  suggestedActions?: string[];
  timestamp: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface WellnessIndicator {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkInCompleted: boolean;
  conversationQuality: 'poor' | 'fair' | 'good' | 'excellent';
  moodIndicators: {
    anxious: boolean;
    confused: boolean;
    content: boolean;
    agitated: boolean;
    responsive: boolean;
  };
  culturalEngagement: {
    traditionalGreetingsUsed: boolean;
    familyMentioned: boolean;
    culturalTopicsDiscussed: boolean;
    spiritualReferencesNoted: boolean;
  };
  concerns: string[];
  positiveNotes: string[];
}

export interface NotificationDeliveryLog {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  timestamp: string;
  errorMessage?: string;
  retryCount: number;
  culturalAdaptations?: string[]; // What cultural adaptations were applied
}

export interface CulturalCelebration {
  id: string;
  culturalGroup: CulturalGroup;
  name: string;
  date: string; // MM-DD format for annual events
  description: string;
  notificationMessage: {
    [K in PreferredLanguage]: string;
  };
  suggestedActivities: string[];
  familyInvolvementRecommended: boolean;
}

export const DEFAULT_CULTURAL_NOTIFICATION_CONFIGS: Record<CulturalGroup, CulturalNotificationConfig> = {
  maori: {
    culturalGroup: 'maori',
    respectfulHours: {
      start: '08:00',
      end: '19:00'
    },
    avoidDays: [],
    specialConsiderations: {
      familyInvolvement: true,
      indirectCommunication: true,
      hierarchicalApproach: false,
      spiritualSensitivity: true
    },
    preferredChannels: ['push', 'voice_call', 'in_app'],
    escalationDelay: 30
  },
  chinese: {
    culturalGroup: 'chinese',
    respectfulHours: {
      start: '09:00',
      end: '20:00'
    },
    avoidDays: [],
    specialConsiderations: {
      familyInvolvement: true,
      indirectCommunication: true,
      hierarchicalApproach: true,
      spiritualSensitivity: true
    },
    preferredChannels: ['push', 'sms', 'in_app'],
    escalationDelay: 20
  },
  western: {
    culturalGroup: 'western',
    respectfulHours: {
      start: '08:00',
      end: '21:00'
    },
    avoidDays: [],
    specialConsiderations: {
      familyInvolvement: false,
      indirectCommunication: false,
      hierarchicalApproach: false,
      spiritualSensitivity: false
    },
    preferredChannels: ['push', 'email', 'sms'],
    escalationDelay: 15
  }
};