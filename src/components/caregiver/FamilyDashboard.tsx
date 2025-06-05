import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Card, Button, Switch, Chip, Divider as _Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays, isToday, differenceInDays as _differenceInDays } from 'date-fns';
import { LineChart, BarChart as _BarChart } from 'react-native-chart-kit';
import { supabase } from '../../services/supabase';
import { notificationService } from '../../services/notifications';
import {
  FamilyNotification,
  WellnessIndicator,
  CheckInSchedule,
  NotificationPreferences,
} from '../../types/notifications';
import { CulturalGroup } from '../../types/cultural';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

interface LovedOneProfile {
  id: string;
  fullName: string;
  culturalGroup: CulturalGroup;
  relationship: string;
  lastCheckIn: string | null;
  wellnessScore: number;
  checkInStreak: number;
  recentConcerns: string[];
  positiveHighlights: string[];
}

interface WeeklySummary {
  weekStart: string;
  checkInsCompleted: number;
  totalDays: number;
  completionRate: number;
  averageQuality: number;
  culturalEngagement: number;
  concerns: string[];
  positives: string[];
}

const FamilyDashboard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [lovedOne, setLovedOne] = useState<LovedOneProfile | null>(null);
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [wellnessData, setWellnessData] = useState<WellnessIndicator[]>([]);
  const [schedules, setSchedules] = useState<CheckInSchedule[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [_loading, _setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'settings'>('overview');

  const loadDashboardData = useCallback(async () => {
    try {
      _setLoading(true);
      await Promise.all([
        loadLovedOneProfile(),
        loadFamilyNotifications(),
        loadWeeklySummaries(),
        loadWellnessData(),
        loadCheckInSchedules(),
        loadNotificationPreferences(),
      ]);
    } catch (error) {
      console.error('Failed to load family dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      _setLoading(false);
    }
  }, []);

  const loadLovedOneProfile = async () => {
    // Get current user's emergency contact relationship
    const { data: contactData } = await supabase
      .from('emergency_contacts')
      .select(`
        relationship,
        users (
          id,
          full_name,
          cultural_profiles (cultural_group),
          check_in_schedules (last_check_in, missed_count)
        )
      `)
      .single();

    if (contactData?.users) {
      const user = contactData.users;
      const recentWellness = await getRecentWellnessData(user.id);
      
      setLovedOne({
        id: user.id,
        fullName: user.full_name,
        culturalGroup: user.cultural_profiles?.cultural_group || 'western',
        relationship: contactData.relationship,
        lastCheckIn: user.check_in_schedules?.[0]?.last_check_in || null,
        wellnessScore: calculateWellnessScore(recentWellness),
        checkInStreak: calculateCheckInStreak(recentWellness),
        recentConcerns: extractConcerns(recentWellness),
        positiveHighlights: extractPositives(recentWellness),
      });
    }
  };

  const loadFamilyNotifications = async () => {
    if (!lovedOne) return;

    const { data, error } = await supabase
      .from('family_notifications')
      .select('*')
      .eq('user_id', lovedOne.id)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) throw error;
    setNotifications(data || []);
  };

  const loadWeeklySummaries = async () => {
    if (!lovedOne) return;

    const { data, error } = await supabase
      .from('wellness_reports')
      .select('*')
      .eq('user_id', lovedOne.id)
      .order('week_start', { ascending: false })
      .limit(8);

    if (error) throw error;
    setWeeklySummaries(data || []);
  };

  const loadWellnessData = async () => {
    if (!lovedOne) return;

    const { data, error } = await supabase
      .from('wellness_indicators')
      .select('*')
      .eq('user_id', lovedOne.id)
      .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    if (error) throw error;
    setWellnessData(data || []);
  };

  const loadCheckInSchedules = async () => {
    if (!lovedOne) return;

    const { data, error } = await supabase
      .from('check_in_schedules')
      .select('*')
      .eq('user_id', lovedOne.id);

    if (error) throw error;
    setSchedules(data || []);
  };

  const loadNotificationPreferences = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    setNotificationPrefs(data);
  };

  const getRecentWellnessData = async (userId: string) => {
    const { data } = await supabase
      .from('wellness_indicators')
      .select('*')
      .eq('user_id', userId)
      .gte('date', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    return data || [];
  };

  const calculateWellnessScore = (indicators: WellnessIndicator[]): number => {
    if (indicators.length === 0) return 0;

    const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
    const avgQuality = indicators.reduce((sum, ind) => 
      sum + (qualityMap[ind.conversation_quality as keyof typeof qualityMap] || 0), 0
    ) / indicators.length;

    const completionRate = indicators.filter(ind => ind.check_in_completed).length / indicators.length;
    
    return Math.round(((avgQuality / 4) * 0.6 + completionRate * 0.4) * 100);
  };

  const calculateCheckInStreak = (indicators: WellnessIndicator[]): number => {
    let streak = 0;
    for (let i = 0; i < indicators.length; i++) {
      if (indicators[i].check_in_completed) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const extractConcerns = (indicators: WellnessIndicator[]): string[] => {
    const allConcerns = indicators.flatMap(ind => ind.concerns || []);
    return [...new Set(allConcerns)].slice(0, 3);
  };

  const extractPositives = (indicators: WellnessIndicator[]): string[] => {
    const allPositives = indicators.flatMap(ind => ind.positive_notes || []);
    return [...new Set(allPositives)].slice(0, 3);
  };

  const getCulturalGreeting = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'Kia ora';
      case 'chinese': return '你好';
      default: return 'Hello';
    }
  };

  const getFamilyTerm = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'whānau';
      case 'chinese': return '家人';
      default: return 'family';
    }
  };

  const getCulturalColor = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return '#2E7D32';
      case 'chinese': return '#C62828';
      default: return theme.colors.primary;
    }
  };

  const getWellnessColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    if (score >= 40) return '#FF5722';
    return '#F44336';
  };

  const handleNotificationToggle = async (type: string, enabled: boolean) => {
    if (!notificationPrefs) return;

    const updatedPrefs = {
      ...notificationPrefs,
      typePreferences: {
        ...notificationPrefs.typePreferences,
        [type]: {
          ...notificationPrefs.typePreferences[type as keyof typeof notificationPrefs.typePreferences],
          enabled,
        },
      },
    };

    await notificationService.updateNotificationPreferences(notificationPrefs.userId, updatedPrefs);
    setNotificationPrefs(updatedPrefs);
  };

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from('family_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const prepareChartData = () => {
    const last30Days = wellnessData.slice(0, 30).reverse();
    return {
      labels: last30Days.map(data => format(new Date(data.date), 'M/d')),
      datasets: [{
        data: last30Days.map(data => data.check_in_completed ? 1 : 0),
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      }]
    };
  };

  const renderOverviewTab = () => (
    <>
      {/* Loved One Status */}
      {lovedOne && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <View>
                <Text style={styles.profileName}>{lovedOne.fullName}</Text>
                <Text style={styles.profileRelationship}>Your {lovedOne.relationship}</Text>
                <Text style={[styles.culturalGreeting, { color: getCulturalColor(lovedOne.culturalGroup) }]}>
                  {getCulturalGreeting(lovedOne.culturalGroup)}, {getFamilyTerm(lovedOne.culturalGroup)}
                </Text>
              </View>
              <View style={[styles.wellnessIndicator, { backgroundColor: getWellnessColor(lovedOne.wellnessScore) }]}>
                <Text style={styles.wellnessScore}>{lovedOne.wellnessScore}</Text>
                <Text style={styles.wellnessLabel}>Wellness</Text>
              </View>
            </View>

            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Check-in</Text>
                <Text style={styles.statusValue}>
                  {lovedOne.lastCheckIn 
                    ? isToday(new Date(lovedOne.lastCheckIn)) 
                      ? 'Today' 
                      : format(new Date(lovedOne.lastCheckIn), 'MMM d')
                    : 'Not yet'
                  }
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Daily Streak</Text>
                <Text style={styles.statusValue}>{lovedOne.checkInStreak} days</Text>
              </View>
            </View>

            {lovedOne.recentConcerns.length > 0 && (
              <View style={styles.concernsSection}>
                <Text style={styles.concernsTitle}>Recent Areas of Care</Text>
                {lovedOne.recentConcerns.map((concern, index) => (
                  <Chip key={index} style={styles.concernChip} textStyle={styles.concernText}>
                    {concern}
                  </Chip>
                ))}
              </View>
            )}

            {lovedOne.positiveHighlights.length > 0 && (
              <View style={styles.positivesSection}>
                <Text style={styles.positivesTitle}>Positive Highlights</Text>
                {lovedOne.positiveHighlights.map((positive, index) => (
                  <Chip key={index} style={styles.positiveChip} textStyle={styles.positiveText}>
                    {positive}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Recent Updates */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Recent Updates</Text>
          {notifications.slice(0, 5).map(notification => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationItem, !notification.isRead && styles.unreadNotification]}
              onPress={() => markNotificationRead(notification.id)}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationTime}>
                  {format(new Date(notification.timestamp), 'MMM d, HH:mm')}
                </Text>
              </View>
              <Text style={styles.notificationContent} numberOfLines={3}>
                {notification.content}
              </Text>
              {notification.culturalContext && (
                <Text style={styles.culturalNote}>
                  Cultural note: {notification.culturalContext}
                </Text>
              )}
            </TouchableOpacity>
          ))}
          {notifications.length === 0 && (
            <Text style={styles.emptyState}>No recent updates</Text>
          )}
        </Card.Content>
      </Card>

      {/* This Week Summary */}
      {weeklySummaries.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>This Week's Summary</Text>
            <View style={styles.weeklySummary}>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {weeklySummaries[0].checkInsCompleted}/{weeklySummaries[0].totalDays}
                  </Text>
                  <Text style={styles.summaryLabel}>Check-ins</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {weeklySummaries[0].completionRate.toFixed(0)}%
                  </Text>
                  <Text style={styles.summaryLabel}>Completion</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {weeklySummaries[0].culturalEngagement.toFixed(0)}%
                  </Text>
                  <Text style={styles.summaryLabel}>Cultural Engagement</Text>
                </View>
              </View>
              {weeklySummaries[0].concerns.length > 0 && (
                <Text style={styles.weeklyNote}>
                  Areas of care: {weeklySummaries[0].concerns.join(', ')}
                </Text>
              )}
              {weeklySummaries[0].positives.length > 0 && (
                <Text style={styles.weeklyPositive}>
                  Highlights: {weeklySummaries[0].positives.join(', ')}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      )}
    </>
  );

  const renderTrendsTab = () => (
    <>
      {/* Check-in Trend Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>30-Day Check-in Trend</Text>
          {wellnessData.length > 0 ? (
            <LineChart
              data={prepareChartData()}
              width={width - 64}
              height={220}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#4CAF50'
                }
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text style={styles.emptyState}>No data available</Text>
          )}
        </Card.Content>
      </Card>

      {/* Weekly Trends */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Weekly Progress</Text>
          {weeklySummaries.map((summary, _index) => (
            <View key={summary.weekStart} style={styles.weeklyTrendItem}>
              <Text style={styles.weekLabel}>
                Week of {format(new Date(summary.weekStart), 'MMM d')}
              </Text>
              <View style={styles.trendMetrics}>
                <View style={styles.trendMetric}>
                  <Text style={styles.trendValue}>{summary.completionRate.toFixed(0)}%</Text>
                  <Text style={styles.trendLabel}>Completion</Text>
                </View>
                <View style={styles.trendMetric}>
                  <Text style={styles.trendValue}>{summary.culturalEngagement.toFixed(0)}%</Text>
                  <Text style={styles.trendLabel}>Engagement</Text>
                </View>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    </>
  );

  const renderSettingsTab = () => (
    <>
      {/* Notification Preferences */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          <Text style={styles.settingsSubtitle}>
            Choose what updates you'd like to receive about {lovedOne?.fullName}
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Summaries</Text>
              <Text style={styles.settingDescription}>Weekly summary of check-ins and wellness</Text>
            </View>
            <Switch
              value={notificationPrefs?.typePreferences?.family_update?.enabled || false}
              onValueChange={(enabled) => handleNotificationToggle('family_update', enabled)}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Concern Alerts</Text>
              <Text style={styles.settingDescription}>Immediate notifications for health concerns</Text>
            </View>
            <Switch
              value={notificationPrefs?.typePreferences?.emergency?.enabled || false}
              onValueChange={(enabled) => handleNotificationToggle('emergency', enabled)}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Milestone Celebrations</Text>
              <Text style={styles.settingDescription}>Positive achievements and milestones</Text>
            </View>
            <Switch
              value={notificationPrefs?.typePreferences?.cultural_celebration?.enabled || false}
              onValueChange={(enabled) => handleNotificationToggle('cultural_celebration', enabled)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Check-in Schedule */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Check-in Schedules</Text>
          {schedules.map(schedule => (
            <View key={schedule.id} style={styles.scheduleItem}>
              <Text style={styles.scheduleName}>{schedule.name}</Text>
              <Text style={styles.scheduleDetails}>
                {schedule.recurrence} at {schedule.preferredTime}
              </Text>
              <Text style={styles.scheduleStatus}>
                {schedule.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          ))}
          <Button mode="outlined" style={styles.scheduleButton}>
            Suggest Schedule Changes
          </Button>
        </Card.Content>
      </Card>

      {/* Cultural Resources */}
      {lovedOne && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Cultural Understanding Resources</Text>
            <Text style={styles.settingsSubtitle}>
              Learn more about {lovedOne.culturalGroup} cultural practices in dementia care
            </Text>
            <View style={styles.resourcesList}>
              <TouchableOpacity style={styles.resourceItem}>
                <Icon name="book" size={20} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Communication Guidelines</Text>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceItem}>
                <Icon name="family-restroom" size={20} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Family Role & Involvement</Text>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceItem}>
                <Icon name="psychology" size={20} color={theme.colors.primary} />
                <Text style={styles.resourceText}>Spiritual & Cultural Care</Text>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Dashboard</Text>
        <Text style={styles.headerSubtitle}>Stay connected with your loved one's care</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Icon name="dashboard" size={20} color={selectedTab === 'overview' ? 'white' : theme.colors.onSurfaceVariant} />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'trends' && styles.activeTab]}
          onPress={() => setSelectedTab('trends')}
        >
          <Icon name="trending-up" size={20} color={selectedTab === 'trends' ? 'white' : theme.colors.onSurfaceVariant} />
          <Text style={[styles.tabText, selectedTab === 'trends' && styles.activeTabText]}>
            Trends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'settings' && styles.activeTab]}
          onPress={() => setSelectedTab('settings')}
        >
          <Icon name="settings" size={20} color={selectedTab === 'settings' ? 'white' : theme.colors.onSurfaceVariant} />
          <Text style={[styles.tabText, selectedTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'trends' && renderTrendsTab()}
        {selectedTab === 'settings' && renderSettingsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    marginLeft: 8,
    color: theme.colors.onSurfaceVariant,
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  profileRelationship: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  culturalGreeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  wellnessIndicator: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  wellnessScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  wellnessLabel: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  concernsSection: {
    marginBottom: 12,
  },
  concernsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  concernChip: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    marginRight: 8,
    marginBottom: 4,
  },
  concernText: {
    color: '#F44336',
    fontSize: 12,
  },
  positivesSection: {
    marginBottom: 12,
  },
  positivesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  positiveChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    marginRight: 8,
    marginBottom: 4,
  },
  positiveText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  notificationItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  unreadNotification: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  notificationContent: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  culturalNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.primary,
    marginTop: 4,
  },
  emptyState: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  weeklySummary: {
    marginTop: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  weeklyNote: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 4,
  },
  weeklyPositive: {
    fontSize: 13,
    color: '#4CAF50',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weeklyTrendItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  trendMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendMetric: {
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  trendLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  scheduleItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleDetails: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  scheduleStatus: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  scheduleButton: {
    marginTop: 8,
  },
  resourcesList: {
    marginTop: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  resourceText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    color: theme.colors.onSurface,
  },
});

export default FamilyDashboard;