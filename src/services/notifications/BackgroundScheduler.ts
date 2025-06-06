import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addHours as _addHours, addDays, isAfter, isBefore as _isBefore, parseISO } from 'date-fns';
import { supabase } from '../supabase';
import { notificationService } from './NotificationService';
import {
  CheckInSchedule,
  CulturalNotificationConfig,
  DEFAULT_CULTURAL_NOTIFICATION_CONFIGS,
  NotificationType as _NotificationType,
  WellnessIndicator,
  NotificationDeliveryLog,
  ScheduledNotification,
} from '../../types/notifications';
import { CulturalGroup } from '../../types/cultural';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';
const CHECK_IN_MONITOR_TASK = 'check-in-monitor-task';
const WELLNESS_MONITOR_TASK = 'wellness-monitor-task';

class BackgroundScheduler {
  private static instance: BackgroundScheduler;
  private isInitialized = false;
  private taskQueue: Map<string, () => Promise<void>> = new Map();
  private processingQueue = false;

  static getInstance(): BackgroundScheduler {
    if (!BackgroundScheduler.instance) {
      BackgroundScheduler.instance = new BackgroundScheduler();
    }
    return BackgroundScheduler.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register background tasks
      await this.registerBackgroundTasks();
      
      // Start background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      await BackgroundFetch.registerTaskAsync(CHECK_IN_MONITOR_TASK, {
        minimumInterval: 5 * 60, // 5 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      await BackgroundFetch.registerTaskAsync(WELLNESS_MONITOR_TASK, {
        minimumInterval: 60 * 60, // 1 hour
        stopOnTerminate: false,
        startOnBoot: true,
      });

      // Set up notification response handler
      this.setupNotificationResponseHandler();

      // Process any pending tasks
      await this.processPendingTasks();

      this.isInitialized = true;
      console.log('BackgroundScheduler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BackgroundScheduler:', error);
      throw error;
    }
  }

  private async registerBackgroundTasks(): Promise<void> {
    // Main notification processing task
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
      try {
        console.log('Running background notification task');
        await this.processScheduledNotifications();
        await this.processNotificationQueue();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background notification task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Check-in monitoring task
    TaskManager.defineTask(CHECK_IN_MONITOR_TASK, async () => {
      try {
        console.log('Running check-in monitor task');
        await this.monitorCheckIns();
        await this.processEscalations();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Check-in monitor task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Wellness monitoring task
    TaskManager.defineTask(WELLNESS_MONITOR_TASK, async () => {
      try {
        console.log('Running wellness monitor task');
        await this.analyzeWellnessTrends();
        await this.generateWellnessReports();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Wellness monitor task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  private setupNotificationResponseHandler(): void {
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification } = response;
      const data = notification.request.content.data;

      try {
        switch (data?.type) {
          case 'check_in':
            await this.handleCheckInResponse(data);
            break;
          case 'reminder':
            await this.handleReminderResponse(data);
            break;
          case 'emergency':
            await this.handleEmergencyResponse(data);
            break;
          case 'family_update':
            await this.handleFamilyUpdateResponse(data);
            break;
          default:
            console.log('Unhandled notification response:', data?.type);
        }
      } catch (error) {
        console.error('Failed to handle notification response:', error);
      }
    });
  }

  async scheduleRecurringNotifications(userId: string): Promise<void> {
    try {
      // Get user's active schedules
      const { data: schedules, error } = await supabase
        .from('check_in_schedules')
        .select(`
          *,
          users (
            id,
            cultural_profile_id,
            cultural_profiles (*)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      for (const schedule of schedules || []) {
        await this.scheduleCheckInSeries(schedule);
      }
    } catch (error) {
      console.error('Failed to schedule recurring notifications:', error);
    }
  }

  private async scheduleCheckInSeries(schedule: CheckInSchedule & { users: { cultural_profiles: { cultural_group: CulturalGroup } } }): Promise<void> {
    const culturalGroup: CulturalGroup = schedule.users.cultural_profiles.cultural_group;
    const culturalConfig = DEFAULT_CULTURAL_NOTIFICATION_CONFIGS[culturalGroup];
    
    // Schedule check-ins for next 30 days
    const scheduleDays = 30;
    const currentDate = new Date();

    for (let day = 0; day < scheduleDays; day++) {
      const targetDate = addDays(currentDate, day);
      
      // Skip if this day should be avoided culturally
      if (this.shouldAvoidDay(targetDate, culturalConfig)) {
        continue;
      }

      const checkInTime = this.calculateCheckInTime(targetDate, schedule, culturalConfig);
      
      if (isAfter(checkInTime, new Date())) {
        await this.scheduleIndividualCheckIn(schedule, checkInTime);
      }
    }
  }

  private shouldAvoidDay(date: Date, culturalConfig: CulturalNotificationConfig): boolean {
    const dayName = format(date, 'EEEE').toLowerCase();
    return culturalConfig.avoidDays.includes(dayName);
  }

  private calculateCheckInTime(date: Date, schedule: CheckInSchedule, culturalConfig: CulturalNotificationConfig): Date {
    const [hours, minutes] = schedule.preferredTime.split(':').map(Number);
    let checkInTime = new Date(date);
    checkInTime.setHours(hours, minutes, 0, 0);

    // Adjust for cultural respectful hours
    const timeStr = format(checkInTime, 'HH:mm');
    if (timeStr < culturalConfig.respectfulHours.start) {
      const [startHour, startMinute] = culturalConfig.respectfulHours.start.split(':').map(Number);
      checkInTime.setHours(startHour, startMinute);
    } else if (timeStr > culturalConfig.respectfulHours.end) {
      // Move to next day's start time
      checkInTime = addDays(checkInTime, 1);
      const [startHour, startMinute] = culturalConfig.respectfulHours.start.split(':').map(Number);
      checkInTime.setHours(startHour, startMinute);
    }

    return checkInTime;
  }

  private async scheduleIndividualCheckIn(schedule: CheckInSchedule & { users: { cultural_profiles: { cultural_group: CulturalGroup } } }, checkInTime: Date): Promise<void> {
    const _culturalGroup: CulturalGroup = schedule.users.cultural_profiles.cultural_group;
    const { users: _users, ...scheduleWithoutUsers } = schedule;
    const notificationId = await notificationService.scheduleCheckIn(scheduleWithoutUsers);

    // Store reference for background processing
    await this.storeScheduleReference(notificationId, schedule.id, checkInTime);
  }

  private async storeScheduleReference(notificationId: string, scheduleId: string, scheduledTime: Date): Promise<void> {
    const reference = {
      notificationId,
      scheduleId,
      scheduledTime: scheduledTime.toISOString(),
      status: 'scheduled'
    };

    await AsyncStorage.setItem(
      `schedule_ref_${notificationId}`,
      JSON.stringify(reference)
    );
  }

  private async processScheduledNotifications(): Promise<void> {
    try {
      // Get pending notifications from database
      const { data: notifications, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('is_active', true)
        .lt('scheduled_for', new Date().toISOString());

      if (error) throw error;

      for (const notification of notifications || []) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error('Failed to process scheduled notifications:', error);
    }
  }

  private async processNotification(notification: ScheduledNotification): Promise<void> {
    try {
      // Check if notification should be sent based on cultural considerations
      if (!await this.shouldSendNotification(notification)) {
        // Reschedule for appropriate time
        await this.rescheduleNotification(notification);
        return;
      }

      // Send notification
      await this.sendNotification(notification);

      // Mark as sent
      await supabase
        .from('scheduled_notifications')
        .update({
          last_sent: new Date().toISOString(),
          is_active: !notification.isRecurring
        })
        .eq('id', notification.id);

      // Schedule next occurrence if recurring
      if (notification.isRecurring) {
        await this.scheduleNextOccurrence(notification);
      }

    } catch (error) {
      console.error('Failed to process notification:', error);
      
      // Increment failure count
      await supabase
        .from('scheduled_notifications')
        .update({
          failure_count: notification.failureCount + 1
        })
        .eq('id', notification.id);
    }
  }

  private async shouldSendNotification(notification: ScheduledNotification): Promise<boolean> {
    const now = new Date();
    const config = notification.culturalConfig;

    // Check if current time is within respectful hours
    const currentTime = format(now, 'HH:mm');
    const withinHours = currentTime >= config.respectfulHours.start && 
                       currentTime <= config.respectfulHours.end;

    if (!withinHours) {
      return false;
    }

    // Check if today should be avoided
    const dayName = format(now, 'EEEE').toLowerCase();
    if (config.avoidDays.includes(dayName)) {
      return false;
    }

    return true;
  }

  private async rescheduleNotification(notification: ScheduledNotification): Promise<void> {
    const config = notification.culturalConfig;
    const now = new Date();
    
    // Calculate next appropriate time
    let nextTime = new Date(now);
    const [startHour, startMinute] = config.respectfulHours.start.split(':').map(Number);
    
    // If before respectful hours today, schedule for start of respectful hours
    const currentTime = format(now, 'HH:mm');
    if (currentTime < config.respectfulHours.start) {
      nextTime.setHours(startHour, startMinute, 0, 0);
    } else {
      // Schedule for tomorrow's start time
      nextTime = addDays(nextTime, 1);
      nextTime.setHours(startHour, startMinute, 0, 0);
    }

    // Avoid culturally inappropriate days
    while (this.shouldAvoidDay(nextTime, config)) {
      nextTime = addDays(nextTime, 1);
    }

    // Update notification schedule
    await supabase
      .from('scheduled_notifications')
      .update({
        scheduled_for: nextTime.toISOString()
      })
      .eq('id', notification.id);
  }

  private async sendNotification(notification: ScheduledNotification): Promise<void> {
    const notificationRequest: Notifications.NotificationRequestInput = {
      identifier: `bg_${notification.id}_${Date.now()}`,
      content: {
        title: notification.title,
        body: notification.message,
        data: {
          ...notification.metadata,
          notificationId: notification.id,
          type: notification.type,
          culturalGroup: notification.culturalConfig.culturalGroup
        },
        sound: notification.culturalConfig.specialConsiderations.indirectCommunication ? 
          undefined : 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(),
      },
    };

    await Notifications.scheduleNotificationAsync(notificationRequest);

    // Log delivery
    await this.logNotificationDelivery(notification, 'sent');
  }

  private async logNotificationDelivery(notification: ScheduledNotification, status: string): Promise<void> {
    await supabase
      .from('notification_delivery_logs')
      .insert({
        notification_id: notification.id,
        user_id: notification.userId,
        channel: 'push',
        status,
        timestamp: new Date().toISOString(),
        retry_count: notification.failureCount,
        cultural_adaptations: [
          `Respectful hours: ${notification.culturalConfig.respectfulHours.start}-${notification.culturalConfig.respectfulHours.end}`,
          `Cultural group: ${notification.culturalConfig.culturalGroup}`,
          `Family involvement: ${notification.culturalConfig.specialConsiderations.familyInvolvement}`
        ]
      });
  }

  private async scheduleNextOccurrence(notification: ScheduledNotification): Promise<void> {
    if (!notification.recurrencePattern || !notification.recurrenceConfig) return;

    let nextDate = new Date(notification.scheduledFor);

    switch (notification.recurrencePattern) {
      case 'daily':
        nextDate = addDays(nextDate, notification.recurrenceConfig.interval || 1);
        break;
      case 'weekly':
        nextDate = addDays(nextDate, 7 * (notification.recurrenceConfig.interval || 1));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + (notification.recurrenceConfig.interval || 1));
        break;
    }

    // Check if we should continue (end date not reached)
    if (notification.recurrenceConfig.endDate && 
        isAfter(nextDate, parseISO(notification.recurrenceConfig.endDate))) {
      return;
    }

    // Create new notification for next occurrence
    const nextNotification: Omit<ScheduledNotification, 'id'> = {
      ...notification,
      scheduledFor: nextDate.toISOString(),
      lastSent: undefined,
      failureCount: 0
    };

    await supabase
      .from('scheduled_notifications')
      .insert(nextNotification);
  }

  private async monitorCheckIns(): Promise<void> {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      // Find schedules where check-in was expected but not completed
      const { data: overdueSchedules, error } = await supabase
        .from('check_in_schedules')
        .select(`
          *,
          users (
            id,
            full_name,
            cultural_profiles (cultural_group)
          )
        `)
        .eq('is_active', true)
        .or(`last_check_in.is.null,last_check_in.lt.${fifteenMinutesAgo.toISOString()}`);

      if (error) throw error;

      for (const schedule of overdueSchedules || []) {
        await this.handleOverdueCheckIn(schedule);
      }
    } catch (error) {
      console.error('Failed to monitor check-ins:', error);
    }
  }

  private async handleOverdueCheckIn(schedule: { users: { cultural_profiles: { cultural_group: CulturalGroup } }; last_check_in?: string }): Promise<void> {
    const culturalGroup = schedule.users.cultural_profiles.cultural_group;
    const config = DEFAULT_CULTURAL_NOTIFICATION_CONFIGS[culturalGroup as CulturalGroup];

    // Wait for cultural escalation delay before taking action
    const lastCheckIn = schedule.last_check_in ? parseISO(schedule.last_check_in) : null;
    const now = new Date();
    
    if (lastCheckIn) {
      const timeSinceLastCheckIn = now.getTime() - lastCheckIn.getTime();
      const escalationDelayMs = config.escalationDelay * 60 * 1000;
      
      if (timeSinceLastCheckIn < escalationDelayMs) {
        return; // Not time to escalate yet
      }
    }

    // Handle missed check-in with cultural sensitivity
    await notificationService.handleMissedCheckIn(schedule.id);
  }

  private async processEscalations(): Promise<void> {
    try {
      // Get unresolved caregiver alerts older than escalation threshold
      const { data: alerts, error } = await supabase
        .from('caregiver_alerts')
        .select('*')
        .eq('is_resolved', false)
        .eq('action_required', true)
        .lt('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour old

      if (error) throw error;

      for (const alert of alerts || []) {
        await this.processAlertEscalation(alert);
      }
    } catch (error) {
      console.error('Failed to process escalations:', error);
    }
  }

  private async processAlertEscalation(alert: { id: string; severity: string }): Promise<void> {
    // Escalate unresolved alerts to emergency contacts or higher-level care
    console.log('Escalating alert:', alert.id);
    
    // Mark as escalated
    await supabase
      .from('caregiver_alerts')
      .update({
        severity: 'critical',
        notes: `Auto-escalated due to no response within 1 hour. Original severity: ${alert.severity}`
      })
      .eq('id', alert.id);
  }

  private async analyzeWellnessTrends(): Promise<void> {
    try {
      // Get recent wellness indicators for analysis
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: indicators, error } = await supabase
        .from('wellness_indicators')
        .select('*')
        .gte('date', format(sevenDaysAgo, 'yyyy-MM-dd'));

      if (error) throw error;

      // Group by user and analyze trends
      const userIndicators = new Map<string, WellnessIndicator[]>();
      
      indicators?.forEach((indicator: WellnessIndicator) => {
        if (!userIndicators.has(indicator.userId)) {
          userIndicators.set(indicator.userId, []);
        }
        userIndicators.get(indicator.userId)?.push(indicator);
      });

      // Analyze each user's trends
      for (const [userId, userData] of userIndicators) {
        await this.analyzeUserWellnessTrend(userId, userData);
      }
    } catch (error) {
      console.error('Failed to analyze wellness trends:', error);
    }
  }

  private async analyzeUserWellnessTrend(userId: string, indicators: WellnessIndicator[]): Promise<void> {
    // Calculate trend metrics
    const missedCheckIns = indicators.filter(i => !i.checkInCompleted).length;
    const totalDays = indicators.length;
    const missedPercentage = totalDays > 0 ? (missedCheckIns / totalDays) * 100 : 0;

    // Check for concerning patterns
    if (missedPercentage > 50) {
      await this.createWellnessConcern(userId, 'high_missed_checkins', {
        missedPercentage,
        totalDays,
        description: 'User has missed more than 50% of check-ins in the past week'
      });
    }

    // Analyze mood trends
    const anxiousCount = indicators.filter(i => i.mood_indicators?.anxious).length;
    const confusedCount = indicators.filter(i => i.mood_indicators?.confused).length;
    
    if (anxiousCount > totalDays * 0.6) {
      await this.createWellnessConcern(userId, 'persistent_anxiety', {
        anxiousCount,
        totalDays,
        description: 'User showing signs of persistent anxiety'
      });
    }

    if (confusedCount > totalDays * 0.4) {
      await this.createWellnessConcern(userId, 'cognitive_changes', {
        confusedCount,
        totalDays,
        description: 'Potential cognitive changes detected'
      });
    }
  }

  private async createWellnessConcern(userId: string, type: string, details: Record<string, unknown>): Promise<void> {
    const concern = {
      user_id: userId,
      concern_type: type,
      severity: 'moderate',
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
      is_resolved: false
    };

    await supabase
      .from('wellness_concerns')
      .insert(concern);

    // Notify caregivers
    await this.notifyCaregivers(userId, type, details);
  }

  private async notifyCaregivers(userId: string, concernType: string, details: Record<string, unknown>): Promise<void> {
    // Create caregiver alert for wellness concern
    const alert = {
      user_id: userId,
      caregiver_id: null, // Will be assigned by caregiver system
      alert_type: 'health_concern',
      severity: 'normal',
      title: 'Wellness Trend Alert',
      description: `Trend analysis detected: ${concernType}. ${details.description}`,
      action_required: true,
      suggested_actions: [
        'Review recent conversation history',
        'Consider scheduling wellness visit',
        'Contact family if appropriate'
      ],
      timestamp: new Date().toISOString(),
      is_resolved: false
    };

    await supabase
      .from('caregiver_alerts')
      .insert(alert);
  }

  private async generateWellnessReports(): Promise<void> {
    try {
      // Generate weekly summary reports for families
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          cultural_profiles (cultural_group),
          emergency_contacts (*)
        `);

      if (error) throw error;

      for (const user of users || []) {
        await this.generateUserWellnessReport(user, weekStart);
      }
    } catch (error) {
      console.error('Failed to generate wellness reports:', error);
    }
  }

  private async generateUserWellnessReport(user: { id: string; full_name: string }, weekStart: Date): Promise<void> {
    // Get week's wellness data
    const { data: indicators } = await supabase
      .from('wellness_indicators')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', format(weekStart, 'yyyy-MM-dd'));

    if (!indicators || indicators.length === 0) return;

    // Generate report summary
    const checkInsCompleted = indicators.filter((i: WellnessIndicator) => i.checkInCompleted).length;
    const totalDays = indicators.length;
    const averageQuality = this.calculateAverageQuality(indicators);
    
    const report = {
      user_id: user.id,
      week_start: format(weekStart, 'yyyy-MM-dd'),
      check_ins_completed: checkInsCompleted,
      total_days: totalDays,
      completion_rate: totalDays > 0 ? (checkInsCompleted / totalDays) * 100 : 0,
      average_conversation_quality: averageQuality,
      concerns: indicators.flatMap((i: WellnessIndicator) => i.concerns || []),
      positive_notes: indicators.flatMap((i: WellnessIndicator) => i.positiveNotes || []),
      cultural_engagement_score: this.calculateCulturalEngagement(indicators),
      generated_at: new Date().toISOString()
    };

    await supabase
      .from('wellness_reports')
      .insert(report);

    // Send to family if enabled
    await this.sendWeeklyReportToFamily(user, report);
  }

  private calculateAverageQuality(indicators: WellnessIndicator[]): number {
    const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
    const sum = indicators.reduce((acc: number, i: WellnessIndicator) => acc + (qualityMap[i.conversationQuality as keyof typeof qualityMap] || 0), 0);
    return indicators.length > 0 ? sum / indicators.length : 0;
  }

  private calculateCulturalEngagement(indicators: WellnessIndicator[]): number {
    const totalPossiblePoints = indicators.length * 4; // 4 engagement metrics
    const actualPoints = indicators.reduce((acc, i) => {
      const engagement = i.culturalEngagement || {};
      return acc + 
        (engagement.traditionalGreetingsUsed ? 1 : 0) +
        (engagement.familyMentioned ? 1 : 0) +
        (engagement.culturalTopicsDiscussed ? 1 : 0) +
        (engagement.spiritualReferencesNoted ? 1 : 0);
    }, 0);

    return totalPossiblePoints > 0 ? (actualPoints / totalPossiblePoints) * 100 : 0;
  }

  private async sendWeeklyReportToFamily(user: { 
    id: string; 
    full_name: string; 
    emergency_contacts?: Array<{ 
      id: string; 
      notification_preferences?: { weekly_reports?: boolean } 
    }> 
  }, report: Record<string, unknown>): Promise<void> {
    const familyContacts = user.emergency_contacts?.filter((c: { 
      id: string; 
      notification_preferences?: { weekly_reports?: boolean } 
    }) => 
      c.notification_preferences?.weekly_reports
    );

    for (const contact of familyContacts || []) {
      const familyNotification = {
        user_id: user.id,
        family_contact_id: contact.id,
        type: 'summary',
        title: `Weekly Wellness Summary for ${user.full_name}`,
        content: this.formatWeeklyReportForFamily(report, user.cultural_profiles.cultural_group),
        includes_conversation_summary: false,
        timestamp: new Date().toISOString(),
        is_read: false
      };

      await supabase
        .from('family_notifications')
        .insert(familyNotification);
    }
  }

  private formatWeeklyReportForFamily(report: {
    check_ins_completed: number;
    total_days: number;
    completion_rate: number;
    average_conversation_quality: number;
    cultural_engagement_score: number;
    concerns: string[];
    positive_notes: string[];
  }, culturalGroup: string): string {
    const culturalContext = culturalGroup === 'maori' ? 'whānau' : 
                           culturalGroup === 'chinese' ? 'family' : 'family';
    
    return `This week, your ${culturalContext} member completed ${report.check_ins_completed} out of ${report.total_days} check-ins (${report.completion_rate.toFixed(1)}%). Their conversations have been ${this.getQualityDescription(report.average_conversation_quality)} and they've shown good cultural engagement (${report.cultural_engagement_score.toFixed(1)}%). ${report.concerns.length > 0 ? `Areas of attention: ${report.concerns.join(', ')}.` : 'No specific concerns this week.'} ${report.positive_notes.length > 0 ? `Positive highlights: ${report.positive_notes.slice(0, 2).join(', ')}.` : ''}`;
  }

  private getQualityDescription(score: number): string {
    if (score >= 3.5) return 'excellent';
    if (score >= 2.5) return 'good';
    if (score >= 1.5) return 'fair';
    return 'poor';
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    try {
      for (const [id, task] of this.taskQueue) {
        try {
          await task();
          this.taskQueue.delete(id);
        } catch (error) {
          console.error(`Failed to process queued task ${id}:`, error);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  private async processPendingTasks(): Promise<void> {
    try {
      const pendingTasks = await AsyncStorage.getItem('pending_bg_tasks');
      if (pendingTasks) {
        const tasks = JSON.parse(pendingTasks);
        console.log('Processing pending background tasks:', tasks.length);
        // Process pending tasks...
        await AsyncStorage.removeItem('pending_bg_tasks');
      }
    } catch (error) {
      console.error('Failed to process pending tasks:', error);
    }
  }

  private async handleCheckInResponse(data: { scheduleId: string }): Promise<void> {
    console.log('Check-in completed:', data.scheduleId);
    
    // Update schedule
    await supabase
      .from('check_in_schedules')
      .update({
        last_check_in: new Date().toISOString(),
        missed_count: 0
      })
      .eq('id', data.scheduleId);

    // Record positive wellness indicator
    await supabase
      .from('wellness_indicators')
      .upsert({
        user_id: data.userId,
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in_completed: true,
        conversation_quality: 'good', // Default, will be updated by conversation
        mood_indicators: { responsive: true },
        cultural_engagement: { traditional_greetings_used: data.requiresFamily }
      }, { onConflict: 'user_id,date' });
  }

  private async handleReminderResponse(data: any): Promise<void> {
    console.log('Reminder acknowledged:', data.scheduleId);
    // User acknowledged reminder, no immediate action needed
  }

  private async handleEmergencyResponse(data: any): Promise<void> {
    console.log('Emergency response received:', data.userId);
    
    // Cancel escalation if user responds to emergency notification
    await supabase
      .from('caregiver_alerts')
      .update({ is_resolved: true, resolved_by: 'user_response' })
      .eq('user_id', data.userId)
      .eq('is_resolved', false);
    
    // Record positive wellness indicator
    await supabase
      .from('wellness_indicators')
      .upsert({
        user_id: data.userId,
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in_completed: true,
        conversation_quality: 'fair',
        mood_indicators: { responsive: true },
        positive_notes: ['Responded to emergency check-in']
      }, { onConflict: 'user_id,date' });
  }

  private async handleFamilyUpdateResponse(data: any): Promise<void> {
    console.log('Family update acknowledged:', data.notificationId);
    
    // Mark family notification as read
    await supabase
      .from('family_notifications')
      .update({ is_read: true })
      .eq('id', data.notificationId);
  }

  async addTaskToQueue(taskId: string, task: () => Promise<void>): Promise<void> {
    this.taskQueue.set(taskId, task);
  }

  async cancelScheduledNotifications(userId: string): Promise<void> {
    // Cancel all scheduled notifications for user
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Mark as cancelled in database
    await supabase
      .from('scheduled_notifications')
      .update({ is_active: false })
      .eq('user_id', userId);
  }

  async getActiveSchedules(userId: string): Promise<CheckInSchedule[]> {
    const { data, error } = await supabase
      .from('check_in_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  async updateSchedule(scheduleId: string, updates: Partial<CheckInSchedule>): Promise<void> {
    await supabase
      .from('check_in_schedules')
      .update(updates)
      .eq('id', scheduleId);
  }

  async getNotificationStats(userId: string, days: number = 7): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data: logs, error } = await supabase
      .from('notification_delivery_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const total = logs?.length || 0;
    const delivered = logs?.filter((log: NotificationDeliveryLog) => log.status === 'delivered').length || 0;
    const failed = logs?.filter((log: NotificationDeliveryLog) => log.status === 'failed').length || 0;

    return {
      total,
      delivered,
      failed,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0
    };
  }
}

export const backgroundScheduler = BackgroundScheduler.getInstance();