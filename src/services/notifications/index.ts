export { notificationService } from './NotificationService';
export { backgroundScheduler } from './BackgroundScheduler';

// Re-export types for convenience
export type {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  ScheduledNotification,
  NotificationPreferences,
  CheckInSchedule,
  EscalationRule,
  FamilyNotification,
  CaregiverAlert,
  WellnessIndicator,
  NotificationDeliveryLog,
  CulturalNotificationConfig,
  NotificationTemplate,
  CulturalCelebration,
} from '../../types/notifications';