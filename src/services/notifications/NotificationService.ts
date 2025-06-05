import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addMinutes, isWithinInterval as _isWithinInterval, parseISO, setHours, setMinutes } from 'date-fns';
import { supabase } from '../supabase';
import { getCulturalServices as _getCulturalServices } from '../cultural';
import {
  NotificationType,
  NotificationPriority as _NotificationPriority,
  NotificationChannel as _NotificationChannel,
  ScheduledNotification,
  NotificationPreferences,
  CheckInSchedule,
  CulturalNotificationConfig,
  NotificationTemplate,
  EscalationRule,
  FamilyNotification,
  CaregiverAlert,
  WellnessIndicator,
  NotificationDeliveryLog,
  CulturalCelebration as _CulturalCelebration,
  DEFAULT_CULTURAL_NOTIFICATION_CONFIGS,
} from '../../types/notifications';
import { CulturalGroup, PreferredLanguage } from '../../types/cultural';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private activeSchedules: Map<string, NodeJS.Timeout> = new Map();
  private notificationTemplates: Map<string, NotificationTemplate> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notifications
      await Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const culturalGroup = await this.getUserCulturalGroup(String(notification.request.content.data?.userId || ''));
          const config = DEFAULT_CULTURAL_NOTIFICATION_CONFIGS[culturalGroup as CulturalGroup];
          
          return {
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: !config.specialConsiderations.indirectCommunication,
            shouldSetBadge: true,
          };
        },
      });

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }

      // Load notification templates
      await this.loadNotificationTemplates();

      // Restore active schedules
      await this.restoreSchedules();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  private async loadNotificationTemplates(): Promise<void> {
    try {
      const { data: templates, error } = await supabase
        .from('notification_templates')
        .select('*');

      if (error) throw error;

      templates?.forEach((template: NotificationTemplate) => {
        const key = `${template.type}_${template.culturalGroup}_${template.language}`;
        this.notificationTemplates.set(key, template);
      });

      // Load default templates if none exist
      if (templates?.length === 0) {
        await this.createDefaultTemplates();
      }
    } catch (error) {
      console.error('Failed to load notification templates:', error);
      await this.createDefaultTemplates();
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: Omit<NotificationTemplate, 'id'>[] = [
      // Māori check-in templates
      {
        type: 'check_in',
        culturalGroup: 'maori',
        language: 'mi',
        title: 'Kia ora, he pēhea koe?',
        message: 'He taima pai ki te kōrero. Kei te tawhiti koe?',
        culturalContext: 'Traditional greeting with family consideration'
      },
      {
        type: 'check_in',
        culturalGroup: 'maori',
        language: 'en',
        title: 'Hello, how are you feeling today?',
        message: 'It\'s time for our gentle check-in. How is your whānau?',
        culturalContext: 'Respectful approach including family'
      },
      // Chinese check-in templates
      {
        type: 'check_in',
        culturalGroup: 'chinese',
        language: 'zh',
        title: '您好，您今天感觉怎么样？',
        message: '是时候进行温和的问候了。您的家人都好吗？',
        culturalContext: 'Respectful hierarchical approach'
      },
      {
        type: 'check_in',
        culturalGroup: 'chinese',
        language: 'en',
        title: 'Good day, how are you feeling?',
        message: 'Time for our respectful check-in. How is your family today?',
        culturalContext: 'Formal respectful tone with family consideration'
      },
      // Western check-in templates
      {
        type: 'check_in',
        culturalGroup: 'western',
        language: 'en',
        title: 'Daily Check-in',
        message: 'Hi! Ready for our daily conversation?',
        culturalContext: 'Direct friendly approach'
      },
      // Emergency templates
      {
        type: 'emergency',
        culturalGroup: 'maori',
        language: 'mi',
        title: 'He tawhiti koe?',
        message: 'Kaore au i rongo ki a koe. Kei te pai koe?',
        culturalContext: 'Gentle concern without alarm'
      },
      {
        type: 'emergency',
        culturalGroup: 'chinese',
        language: 'zh',
        title: '我们关心您',
        message: '我们已经一段时间没有收到您的消息了。您还好吗？',
        culturalContext: 'Respectful concern expression'
      },
      {
        type: 'emergency',
        culturalGroup: 'western',
        language: 'en',
        title: 'Wellness Check',
        message: 'We haven\'t heard from you today. Is everything okay?',
        culturalContext: 'Direct but caring approach'
      }
    ];

    for (const template of defaultTemplates) {
      const { data, error } = await supabase
        .from('notification_templates')
        .insert(template)
        .select()
        .single();

      if (!error && data) {
        const key = `${template.type}_${template.culturalGroup}_${template.language}`;
        this.notificationTemplates.set(key, data);
      }
    }
  }

  async scheduleCheckIn(schedule: CheckInSchedule): Promise<string> {
    try {
      // Get user's cultural configuration
      const culturalConfig = await this.getUserCulturalConfig(schedule.userId);
      
      // Calculate next notification time
      const nextTime = this.calculateNextCheckInTime(schedule, culturalConfig);
      
      if (!this.isTimeAppropriate(nextTime, culturalConfig)) {
        // Adjust to appropriate time
        const adjustedTime = this.adjustToAppropriateTime(nextTime, culturalConfig);
        console.log(`Adjusted check-in time from ${nextTime} to ${adjustedTime} for cultural appropriateness`);
        return this.scheduleCheckIn({ ...schedule, preferredTime: format(adjustedTime, 'HH:mm') });
      }

      // Get appropriate template
      const userProfile = await this.getUserProfile(schedule.userId);
      const template = this.getNotificationTemplate('check_in', userProfile.culturalGroup, userProfile.preferredLanguage);
      
      if (!template) {
        throw new Error('No appropriate notification template found');
      }

      // Create notification
      const notificationRequest: Notifications.NotificationRequestInput = {
        identifier: `checkin_${schedule.id}_${Date.now()}`,
        content: {
          title: template.title,
          body: this.personalizeMessage(template.message, userProfile),
          data: {
            type: 'check_in',
            scheduleId: schedule.id,
            userId: schedule.userId,
            culturalGroup: userProfile.culturalGroup,
            requiresFamily: schedule.culturalConsiderations.includeFamilyGreeting
          },
          sound: culturalConfig.specialConsiderations.indirectCommunication ? 'default' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextTime,
        },
      };

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      // Store schedule reference
      await this.storeScheduledNotification({
        id: notificationId,
        userId: schedule.userId,
        type: 'check_in',
        priority: 'normal',
        title: template.title,
        message: template.message,
        scheduledFor: nextTime.toISOString(),
        channels: ['push'],
        isRecurring: schedule.recurrence !== 'custom',
        culturalConfig,
        metadata: { scheduleId: schedule.id },
        isActive: true,
        failureCount: 0
      });

      // Schedule reminder if enabled
      if (schedule.notifications.reminder.enabled) {
        await this.scheduleReminder(schedule, template, nextTime);
      }

      console.log(`Scheduled check-in for ${format(nextTime, 'yyyy-MM-dd HH:mm')} (${userProfile.culturalGroup})`);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule check-in:', error);
      throw error;
    }
  }

  private calculateNextCheckInTime(schedule: CheckInSchedule, culturalConfig: CulturalNotificationConfig): Date {
    const now = new Date();
    const [hours, minutes] = schedule.preferredTime.split(':').map(Number);
    
    let nextTime = setMinutes(setHours(now, hours), minutes);
    
    // If time has passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime = new Date(nextTime.getTime() + 24 * 60 * 60 * 1000);
    }

    // Adjust for cultural considerations
    if (culturalConfig.avoidDays.includes(format(nextTime, 'EEEE').toLowerCase())) {
      // Move to next appropriate day
      do {
        nextTime = new Date(nextTime.getTime() + 24 * 60 * 60 * 1000);
      } while (culturalConfig.avoidDays.includes(format(nextTime, 'EEEE').toLowerCase()));
    }

    return nextTime;
  }

  private isTimeAppropriate(time: Date, culturalConfig: CulturalNotificationConfig): boolean {
    const timeStr = format(time, 'HH:mm');
    const startTime = culturalConfig.respectfulHours.start;
    const endTime = culturalConfig.respectfulHours.end;
    
    return timeStr >= startTime && timeStr <= endTime;
  }

  private adjustToAppropriateTime(time: Date, culturalConfig: CulturalNotificationConfig): Date {
    const [startHour, startMinute] = culturalConfig.respectfulHours.start.split(':').map(Number);
    const [endHour, endMinute] = culturalConfig.respectfulHours.end.split(':').map(Number);
    
    const timeHour = time.getHours();
    const timeMinute = time.getMinutes();
    
    // If too early, move to start time
    if (timeHour < startHour || (timeHour === startHour && timeMinute < startMinute)) {
      return setMinutes(setHours(time, startHour), startMinute);
    }
    
    // If too late, move to next day's start time
    if (timeHour > endHour || (timeHour === endHour && timeMinute > endMinute)) {
      const nextDay = new Date(time.getTime() + 24 * 60 * 60 * 1000);
      return setMinutes(setHours(nextDay, startHour), startMinute);
    }
    
    return time;
  }

  private async scheduleReminder(schedule: CheckInSchedule, template: NotificationTemplate, checkInTime: Date): Promise<void> {
    const reminderTime = addMinutes(checkInTime, -schedule.notifications.reminder.minutesBefore);
    
    if (reminderTime <= new Date()) return; // Don't schedule past reminders
    
    const reminderRequest: Notifications.NotificationRequestInput = {
      identifier: `reminder_${schedule.id}_${Date.now()}`,
      content: {
        title: 'Gentle Reminder',
        body: `Your check-in is coming up in ${schedule.notifications.reminder.minutesBefore} minutes`,
        data: {
          type: 'reminder',
          scheduleId: schedule.id,
          checkInTime: checkInTime.toISOString()
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
    };

    await Notifications.scheduleNotificationAsync(reminderRequest);
  }

  async handleMissedCheckIn(scheduleId: string): Promise<void> {
    try {
      const { data: schedule, error } = await supabase
        .from('check_in_schedules')
        .select(`
          *,
          users (
            id,
            full_name,
            cultural_profile_id,
            cultural_profiles (*)
          )
        `)
        .eq('id', scheduleId)
        .single();

      if (error || !schedule) {
        console.error('Failed to get schedule for missed check-in:', error);
        return;
      }

      // Increment missed count
      await supabase
        .from('check_in_schedules')
        .update({ 
          missed_count: schedule.missed_count + 1,
          last_missed: new Date().toISOString()
        })
        .eq('id', scheduleId);

      // Apply escalation rules
      for (const rule of schedule.escalation_rules || []) {
        await this.processEscalationRule(rule, schedule);
      }

      // Log wellness indicator
      await this.recordWellnessIndicator(schedule.user_id, {
        checkInCompleted: false,
        concerns: ['Missed scheduled check-in'],
        date: format(new Date(), 'yyyy-MM-dd')
      });

    } catch (error) {
      console.error('Failed to handle missed check-in:', error);
    }
  }

  private async processEscalationRule(rule: EscalationRule, schedule: any): Promise<void> {
    const now = new Date();
    const lastCheckIn = schedule.last_check_in ? parseISO(schedule.last_check_in) : null;
    
    if (!lastCheckIn || (now.getTime() - lastCheckIn.getTime()) < rule.triggerAfterMinutes * 60 * 1000) {
      return; // Not time to escalate yet
    }

    const culturalConfig = await this.getUserCulturalConfig(schedule.user_id);
    
    switch (rule.action) {
      case 'notify_family':
        await this.notifyFamily(schedule, rule, culturalConfig);
        break;
      case 'notify_caregiver':
        await this.notifyCaregiver(schedule, rule, culturalConfig);
        break;
      case 'call_emergency':
        await this.initiateEmergencyCall(schedule, rule);
        break;
      case 'schedule_visit':
        await this.scheduleWelfareVisit(schedule, rule);
        break;
    }
  }

  private async notifyFamily(schedule: any, rule: EscalationRule, culturalConfig: CulturalNotificationConfig): Promise<void> {
    const user = schedule.users;
    const culturalGroup = user.cultural_profiles.cultural_group;
    
    // Get family contacts
    const { data: contacts, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', schedule.user_id)
      .in('id', rule.contacts);

    if (error || !contacts) return;

    // Create culturally appropriate message
    let message = rule.message;
    if (culturalConfig.specialConsiderations.indirectCommunication) {
      message = `We wanted to gently let you know that we haven't heard from ${user.full_name} today. This may not be concerning, but we thought you'd want to know.`;
    } else {
      message = `${user.full_name} has missed their scheduled check-in. Please consider reaching out to them.`;
    }

    // Send notifications to family
    for (const contact of contacts) {
      const familyNotification: Omit<FamilyNotification, 'id'> = {
        userId: schedule.user_id,
        familyContactId: contact.id,
        type: 'concern',
        title: culturalConfig.specialConsiderations.indirectCommunication ? 
          'Gentle Check-in Notice' : 'Missed Check-in Alert',
        content: message,
        culturalContext: `Escalation handled with ${culturalGroup} cultural sensitivity`,
        includesConversationSummary: false,
        timestamp: new Date().toISOString(),
        isRead: false,
        requiresResponse: rule.culturallyAppropriate
      };

      await this.storeFamilyNotification(familyNotification);
      
      // Send via preferred channels
      if (contact.notification_preferences.push) {
        await this.sendPushNotification(contact.phone, { ...familyNotification, id: Date.now().toString() });
      }
      if (contact.notification_preferences.sms) {
        await this.sendSMSNotification(contact.phone, { ...familyNotification, id: Date.now().toString() });
      }
      if (contact.notification_preferences.email) {
        await this.sendEmailNotification(contact.email, { ...familyNotification, id: Date.now().toString() });
      }
    }
  }

  private async notifyCaregiver(schedule: any, rule: EscalationRule, culturalConfig: CulturalNotificationConfig): Promise<void> {
    const caregiverAlert: Omit<CaregiverAlert, 'id'> = {
      userId: schedule.user_id,
      caregiverId: rule.contacts[0], // Assuming first contact is primary caregiver
      alertType: 'missed_checkin',
      severity: 'high',
      title: 'Missed Check-in Alert',
      description: `${schedule.users.full_name} has missed their scheduled check-in. Cultural group: ${schedule.users.cultural_profiles.cultural_group}`,
      culturalContext: `Patient follows ${culturalConfig.culturalGroup} cultural practices. ${
        culturalConfig.specialConsiderations.familyInvolvement ? 'Family involvement preferred.' : ''
      } ${
        culturalConfig.specialConsiderations.indirectCommunication ? 'Use indirect communication approach.' : ''
      }`,
      actionRequired: true,
      suggestedActions: [
        'Attempt gentle contact via phone',
        culturalConfig.specialConsiderations.familyInvolvement ? 'Contact family member' : 'Direct welfare check',
        'Schedule in-person visit if no response'
      ],
      timestamp: new Date().toISOString(),
      isResolved: false
    };

    await this.storeCaregiverAlert(caregiverAlert);
  }

  async sendWellnessNotification(userId: string, _indicator: Partial<WellnessIndicator>): Promise<void> {
    const userProfile = await this.getUserProfile(userId);
    const culturalConfig = DEFAULT_CULTURAL_NOTIFICATION_CONFIGS[userProfile.culturalGroup as CulturalGroup];
    
    // Only send if current time is appropriate
    if (!this.isTimeAppropriate(new Date(), culturalConfig)) {
      console.log('Skipping wellness notification - inappropriate time');
      return;
    }

    const template = this.getNotificationTemplate('wellness_check', userProfile.culturalGroup, userProfile.preferredLanguage);
    if (!template) return;

    const notificationRequest: Notifications.NotificationRequestInput = {
      identifier: `wellness_${userId}_${Date.now()}`,
      content: {
        title: template.title,
        body: this.personalizeMessage(template.message, userProfile),
        data: {
          type: 'wellness_check',
          userId,
          culturalGroup: userProfile.culturalGroup,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(),
      },
    };

    await Notifications.scheduleNotificationAsync(notificationRequest);
  }

  private getNotificationTemplate(type: NotificationType, culturalGroup: CulturalGroup, language: PreferredLanguage): NotificationTemplate | null {
    const key = `${type}_${culturalGroup}_${language}`;
    let template = this.notificationTemplates.get(key);
    
    // Fallback to English if preferred language template not found
    if (!template && language !== 'en') {
      const fallbackKey = `${type}_${culturalGroup}_en`;
      template = this.notificationTemplates.get(fallbackKey);
    }
    
    // Fallback to western approach if cultural template not found
    if (!template) {
      const westernKey = `${type}_western_en`;
      template = this.notificationTemplates.get(westernKey);
    }
    
    return template || null;
  }

  private personalizeMessage(message: string, userProfile: any): string {
    return message
      .replace('{name}', userProfile.full_name || 'friend')
      .replace('{cultural_greeting}', this.getCulturalGreeting(userProfile.culturalGroup))
      .replace('{family_term}', this.getFamilyTerm(userProfile.culturalGroup));
  }

  private getCulturalGreeting(culturalGroup: CulturalGroup): string {
    switch (culturalGroup) {
      case 'maori': return 'Kia ora';
      case 'chinese': return '您好';
      default: return 'Hello';
    }
  }

  private getFamilyTerm(culturalGroup: CulturalGroup): string {
    switch (culturalGroup) {
      case 'maori': return 'whānau';
      case 'chinese': return 'family';
      default: return 'family';
    }
  }

  private async getUserProfile(userId: string): Promise<{
    id: string;
    culturalGroup: CulturalGroup;
    preferredLanguage: PreferredLanguage;
    cultural_profiles: Array<{
      cultural_group: CulturalGroup;
      preferred_language: PreferredLanguage;
    }>;
  }> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        cultural_profiles (*)
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return {
      ...data,
      culturalGroup: data.cultural_profiles[0]?.cultural_group || 'western',
      preferredLanguage: data.cultural_profiles[0]?.preferred_language || 'en'
    };
  }

  private async getUserCulturalGroup(userId: string): Promise<CulturalGroup> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile.culturalGroup;
    } catch {
      return 'western'; // Default fallback
    }
  }

  private async getUserCulturalConfig(userId: string): Promise<CulturalNotificationConfig> {
    const culturalGroup = await this.getUserCulturalGroup(userId);
    return DEFAULT_CULTURAL_NOTIFICATION_CONFIGS[culturalGroup];
  }

  private async storeScheduledNotification(notification: ScheduledNotification): Promise<void> {
    await supabase
      .from('scheduled_notifications')
      .insert(notification);
  }

  private async storeFamilyNotification(notification: Omit<FamilyNotification, 'id'>): Promise<void> {
    await supabase
      .from('family_notifications')
      .insert(notification);
  }

  private async storeCaregiverAlert(alert: Omit<CaregiverAlert, 'id'>): Promise<void> {
    await supabase
      .from('caregiver_alerts')
      .insert(alert);
  }

  private async recordWellnessIndicator(userId: string, indicator: Partial<WellnessIndicator>): Promise<void> {
    const fullIndicator: Omit<WellnessIndicator, 'id'> = {
      userId,
      date: format(new Date(), 'yyyy-MM-dd'),
      checkInCompleted: false,
      conversationQuality: 'poor',
      moodIndicators: {
        anxious: false,
        confused: false,
        content: false,
        agitated: false,
        responsive: false
      },
      culturalEngagement: {
        traditionalGreetingsUsed: false,
        familyMentioned: false,
        culturalTopicsDiscussed: false,
        spiritualReferencesNoted: false
      },
      concerns: [],
      positiveNotes: [],
      ...indicator
    };

    await supabase
      .from('wellness_indicators')
      .upsert(fullIndicator, { onConflict: 'user_id,date' });
  }

  private async sendPushNotification(deviceToken: string, notification: FamilyNotification): Promise<void> {
    // Implementation for push notification via FCM or APNS
    console.log('Sending push notification:', notification.title);
  }

  private async sendSMSNotification(phone: string, notification: FamilyNotification): Promise<void> {
    // Implementation for SMS via Twilio or similar service
    console.log('Sending SMS to:', phone, notification.title);
  }

  private async sendEmailNotification(email: string, notification: FamilyNotification): Promise<void> {
    // Implementation for email via SendGrid or similar service
    console.log('Sending email to:', email, notification.title);
  }

  private async initiateEmergencyCall(schedule: any, _rule: EscalationRule): Promise<void> {
    console.log('Emergency escalation triggered for:', schedule.users.full_name);
    // Implementation for emergency call system
  }

  private async scheduleWelfareVisit(schedule: any, _rule: EscalationRule): Promise<void> {
    console.log('Scheduling welfare visit for:', schedule.users.full_name);
    // Implementation for welfare visit scheduling
  }

  private async restoreSchedules(): Promise<void> {
    // Restore active schedules from storage
    try {
      const schedules = await AsyncStorage.getItem('active_schedules');
      if (schedules) {
        const parsedSchedules = JSON.parse(schedules);
        // Restore notification schedules
        console.log('Restored notification schedules:', parsedSchedules.length);
      }
    } catch (error) {
      console.error('Failed to restore schedules:', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    
    // Update database
    await supabase
      .from('scheduled_notifications')
      .update({ is_active: false })
      .eq('id', notificationId);
  }

  async cancelAllNotifications(userId: string): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Update database
    await supabase
      .from('scheduled_notifications')
      .update({ is_active: false })
      .eq('user_id', userId);
  }

  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationDeliveryLog[]> {
    const { data, error } = await supabase
      .from('notification_delivery_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' });
  }
}

export const notificationService = NotificationService.getInstance();