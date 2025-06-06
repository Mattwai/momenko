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
  FlatList,
} from 'react-native';
import { Card, Button, FAB, Portal, Dialog, TextInput, Chip, Searchbar, Menu } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays, addHours as _addHours, isToday as _isToday } from 'date-fns';
import { BarChart as _BarChart, PieChart } from 'react-native-chart-kit';
import { supabase } from '../../services/supabase';
import { notificationService as _notificationService } from '../../services/notifications';
import {
  CaregiverAlert as _CaregiverAlert,
  WellnessIndicator,
  CheckInSchedule as _CheckInSchedule,
} from '../../types/notifications';
import { CulturalGroup, CulturalProfile, PreferredLanguage } from '../../types/cultural';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

interface ResidentProfile {
  id: string;
  fullName: string;
  room: string;
  culturalGroup: CulturalGroup;
  preferredLanguage: string;
  culturalProfile: CulturalProfile;
  admissionDate: string;
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    preferredLanguage: string;
  }>;
  careTeam: string[];
  currentAlerts: number;
  lastCheckIn: string | null;
  wellnessScore: number;
  culturalCarePlan: {
    id: string;
    lastUpdated: string;
    keyConsiderations: string[];
    familyInvolvement: string;
    communicationPreferences: string;
    spiritualNeeds: string;
  };
}

interface CulturalAlert {
  id: string;
  residentId: string;
  residentName: string;
  alertType: 'communication' | 'family' | 'spiritual' | 'dietary' | 'medical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  culturalContext: string;
  recommendations: string[];
  timestamp: string;
  isResolved: boolean;
  assignedStaff?: string;
}

interface ComplianceMetric {
  category: string;
  score: number;
  totalChecks: number;
  passedChecks: number;
  lastAudit: string;
  issues: string[];
}

interface EducationResource {
  id: string;
  title: string;
  culturalGroup: CulturalGroup;
  category: 'communication' | 'care_practices' | 'family_dynamics' | 'spiritual_care' | 'emergency_procedures';
  type: 'video' | 'document' | 'checklist' | 'training_module';
  duration?: string;
  completionTracking: boolean;
  staffCompleted: number;
  totalStaff: number;
}

const StaffDashboard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'residents' | 'alerts' | 'compliance' | 'education'>('overview');
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [culturalAlerts, setCulturalAlerts] = useState<CulturalAlert[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [_educationResources, setEducationResources] = useState<EducationResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedCulturalGroup, setSelectedCulturalGroup] = useState<CulturalGroup | 'all'>('all');
  const [selectedResident, setSelectedResident] = useState<ResidentProfile | null>(null);
  const [showResidentDialog, setShowResidentDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CulturalAlert | null>(null);
  const [_loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadResidents(),
        loadCulturalAlerts(),
        loadComplianceMetrics(),
        loadEducationResources(),
      ]);
    } catch (error) {
      console.error('Failed to load staff dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResidents = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        cultural_profiles (*),
        emergency_contacts (*),
        check_in_schedules (last_check_in),
        wellness_indicators (
          date,
          check_in_completed,
          conversation_quality,
          concerns
        ),
        caregiver_alerts (id, is_resolved)
      `)
      .eq('user_type', 'resident')
      .order('full_name');

    if (error) throw error;

    const residentsData: ResidentProfile[] = data?.map((user, index) => {
      const rawWellness = user.wellness_indicators
        ?.filter(w => w.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'))
        ?.sort((a, b) => b.date.localeCompare(a.date));

      // Transform wellness data to match WellnessIndicator interface
      const recentWellness: WellnessIndicator[] = rawWellness?.map(w => ({
        id: (w as { id?: string }).id || `${user.id}_${w.date}`,
        userId: user.id,
        date: w.date,
        checkInCompleted: Boolean(w.check_in_completed),
        conversationQuality: (w.conversation_quality || 'fair') as 'poor' | 'fair' | 'good' | 'excellent',
        moodIndicators: {
          anxious: false,
          confused: false,
          content: true,
          agitated: false,
          responsive: true
        },
        culturalEngagement: {
          traditionalGreetingsUsed: false,
          familyMentioned: false,
          culturalTopicsDiscussed: false,
          spiritualReferencesNoted: false
        },
        concerns: Array.isArray((w as { concerns?: string[] }).concerns) ? (w as { concerns?: string[] }).concerns : [],
        positiveNotes: Array.isArray((w as { positive_notes?: string[] }).positive_notes) ? (w as { positive_notes?: string[] }).positive_notes : [],
        createdAt: (w as { created_at?: string }).created_at || new Date().toISOString(),
        updatedAt: (w as { updated_at?: string }).updated_at || new Date().toISOString()
      })) || [];

      const wellnessScore = calculateWellnessScore(recentWellness);
      const currentAlerts = user.caregiver_alerts?.filter(alert => !alert.is_resolved).length || 0;
      const culturalProfile = user.cultural_profiles?.[0];

      return {
        id: user.id,
        fullName: user.full_name,
        room: `Room ${100 + index}`,
        culturalGroup: culturalProfile?.cultural_group || 'western',
        preferredLanguage: culturalProfile?.preferred_language || 'en',
        culturalProfile: culturalProfile || {
          id: `${user.id}_profile`,
          culturalGroup: 'western' as CulturalGroup,
          preferredLanguage: 'en' as PreferredLanguage,
          preferredTerms: {},
          communicationStyle: 'direct',
          familyInvolvementLevel: 'medium',
          spiritualConsiderations: [],
          dietaryRestrictions: [],
          holidaysObserved: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        admissionDate: '2024-01-15',
        emergencyContacts: user.emergency_contacts?.map(contact => ({
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          preferredLanguage: 'en',
        })) || [],
        careTeam: ['Dr. Smith', 'Nurse Johnson'],
        currentAlerts,
        lastCheckIn: user.check_in_schedules?.[0]?.last_check_in || null,
        wellnessScore,
        culturalCarePlan: {
          id: `plan_${user.id}`,
          lastUpdated: '2024-12-01',
          keyConsiderations: generateCulturalConsiderations(culturalProfile?.cultural_group),
          familyInvolvement: getFamilyInvolvementLevel(culturalProfile?.cultural_group),
          communicationPreferences: getCommunicationPreferences(culturalProfile?.cultural_group),
          spiritualNeeds: getSpiritualNeeds(culturalProfile?.cultural_group),
        },
      };
    }) || [];

    setResidents(residentsData);
  };

  const loadCulturalAlerts = async () => {
    const { data, error } = await supabase
      .from('caregiver_alerts')
      .select(`
        *,
        users (full_name)
      `)
      .eq('is_resolved', false)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const alertsData: CulturalAlert[] = data?.map(alert => ({
      id: alert.id,
      residentId: alert.user_id,
      residentName: alert.users?.full_name || 'Unknown',
      alertType: mapAlertType(alert.alert_type),
      severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
      message: alert.description,
      culturalContext: alert.cultural_context || '',
      recommendations: alert.suggested_actions || [],
      timestamp: alert.timestamp,
      isResolved: alert.is_resolved,
      assignedStaff: alert.caregiver_id,
    })) || [];

    setCulturalAlerts(alertsData);
  };

  const loadComplianceMetrics = async () => {
    const mockMetrics: ComplianceMetric[] = [
      {
        category: 'Cultural Communication',
        score: 92,
        totalChecks: 50,
        passedChecks: 46,
        lastAudit: '2024-11-15',
        issues: ['Missing Māori greeting protocol in 2 cases', 'Language preference not documented for 1 resident'],
      },
      {
        category: 'Family Involvement',
        score: 88,
        totalChecks: 30,
        passedChecks: 26,
        lastAudit: '2024-11-10',
        issues: ['Family contact delay in 3 emergency situations', 'Preferred communication method not followed'],
      },
      {
        category: 'Spiritual Care',
        score: 95,
        totalChecks: 25,
        passedChecks: 24,
        lastAudit: '2024-11-20',
        issues: ['Dietary restrictions not properly communicated to kitchen staff'],
      },
      {
        category: 'Documentation',
        score: 85,
        totalChecks: 40,
        passedChecks: 34,
        lastAudit: '2024-11-18',
        issues: ['Cultural preferences missing in 6 care plans', 'Language documentation incomplete'],
      },
    ];

    setComplianceMetrics(mockMetrics);
  };

  const loadEducationResources = async () => {
    const mockResources: EducationResource[] = [
      {
        id: '1',
        title: 'Māori Cultural Protocols in Healthcare',
        culturalGroup: 'maori',
        category: 'communication',
        type: 'training_module',
        duration: '45 min',
        completionTracking: true,
        staffCompleted: 23,
        totalStaff: 30,
      },
      {
        id: '2',
        title: 'Chinese Family Dynamics in Elder Care',
        culturalGroup: 'chinese',
        category: 'family_dynamics',
        type: 'video',
        duration: '30 min',
        completionTracking: true,
        staffCompleted: 18,
        totalStaff: 30,
      },
      {
        id: '3',
        title: 'Emergency Communication Guidelines',
        culturalGroup: 'maori',
        category: 'emergency_procedures',
        type: 'checklist',
        completionTracking: false,
        staffCompleted: 30,
        totalStaff: 30,
      },
      {
        id: '4',
        title: 'Spiritual Care Considerations',
        culturalGroup: 'chinese',
        category: 'spiritual_care',
        type: 'document',
        duration: '15 min',
        completionTracking: true,
        staffCompleted: 20,
        totalStaff: 30,
      },
    ];

    setEducationResources(mockResources);
  };

  const generateCulturalConsiderations = (culturalGroup: CulturalGroup): string[] => {
    switch (culturalGroup) {
      case 'maori':
        return [
          'Use traditional greetings (Kia ora)',
          'Involve whānau in care decisions',
          'Respect spiritual connections',
          'Consider holistic wellbeing approach',
        ];
      case 'chinese':
        return [
          'Show respect for family hierarchy',
          'Use formal communication style',
          'Consider face-saving approaches',
          'Involve eldest family members in decisions',
        ];
      default:
        return [
          'Direct communication preferred',
          'Individual autonomy important',
          'Medical facts presented clearly',
        ];
    }
  };

  const getFamilyInvolvementLevel = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'High - Whānau central to care decisions';
      case 'chinese': return 'High - Hierarchical family involvement';
      default: return 'Moderate - Individual choice with family support';
    }
  };

  const getCommunicationPreferences = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'Indirect, respectful, storytelling approach';
      case 'chinese': return 'Formal, hierarchical, face-saving';
      default: return 'Direct, medical terminology acceptable';
    }
  };

  const getSpiritualNeeds = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'Connection to land, ancestors, traditional healing';
      case 'chinese': return 'Harmony, balance, traditional medicine concepts';
      default: return 'Individual spiritual preferences to be discussed';
    }
  };

  const mapAlertType = (alertType: string): CulturalAlert['alertType'] => {
    const mapping: Record<string, CulturalAlert['alertType']> = {
      'missed_checkin': 'communication',
      'behavioral_change': 'medical',
      'health_concern': 'medical',
      'family_request': 'family',
      'emergency': 'medical',
    };
    return mapping[alertType] || 'communication';
  };

  const calculateWellnessScore = (indicators: WellnessIndicator[]): number => {
    if (indicators.length === 0) return 0;

    const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
    const avgQuality = indicators.reduce((sum, ind) => 
      sum + (qualityMap[ind.conversationQuality as keyof typeof qualityMap] || 0), 0
    ) / indicators.length;

    const completionRate = indicators.filter(ind => ind.checkInCompleted).length / indicators.length;
    
    return Math.round(((avgQuality / 4) * 0.6 + completionRate * 0.4) * 100);
  };

  const getCulturalIcon = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return 'nature-people';
      case 'chinese': return 'language';
      default: return 'person';
    }
  };

  const getCulturalColor = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case 'maori': return '#2E7D32';
      case 'chinese': return '#C62828';
      default: return theme.colors.primary;
    }
  };

  const getAlertSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  const getWellnessColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    if (score >= 40) return '#FF5722';
    return '#F44336';
  };

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resident.room.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCulturalGroup = selectedCulturalGroup === 'all' || 
                                resident.culturalGroup === selectedCulturalGroup;
    return matchesSearch && matchesCulturalGroup;
  });

  const handleResolveAlert = async (alertId: string, notes?: string) => {
    try {
      await supabase
        .from('caregiver_alerts')
        .update({
          is_resolved: true,
          resolved_by: 'staff',
          resolved_at: new Date().toISOString(),
          notes: notes || 'Resolved by staff',
        })
        .eq('id', alertId);

      setCulturalAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setShowAlertDialog(false);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const renderOverviewTab = () => {
    const culturalDistribution = residents.reduce((acc, resident) => {
      acc[resident.culturalGroup] = (acc[resident.culturalGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(culturalDistribution).map(([group, count], index) => ({
      name: group.charAt(0).toUpperCase() + group.slice(1),
      population: count,
      color: ['#2E7D32', '#C62828', '#1976D2'][index] || '#666',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statCardContent}>
              <Text style={styles.statNumber}>{residents.length}</Text>
              <Text style={styles.statLabel}>Total Residents</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#F44336' }]}>{culturalAlerts.length}</Text>
              <Text style={styles.statLabel}>Active Alerts</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statCardContent}>
              <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                {Math.round(complianceMetrics.reduce((sum, metric) => sum + metric.score, 0) / complianceMetrics.length)}%
              </Text>
              <Text style={styles.statLabel}>Compliance Score</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Cultural Group Distribution</Text>
            {pieData.length > 0 && (
              <PieChart
                data={pieData}
                width={width - 64}
                height={200}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Recent Cultural Alerts</Text>
            {culturalAlerts.slice(0, 3).map(alert => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertItem}
                onPress={() => {
                  setSelectedAlert(alert);
                  setShowAlertDialog(true);
                }}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertSeverity, { backgroundColor: getAlertSeverityColor(alert.severity) }]} />
                  <Text style={styles.alertTitle}>{alert.residentName}</Text>
                  <Text style={styles.alertTime}>
                    {format(new Date(alert.timestamp), 'HH:mm')}
                  </Text>
                </View>
                <Text style={styles.alertMessage} numberOfLines={2}>
                  {alert.message}
                </Text>
                <Text style={styles.culturalContext}>
                  Cultural: {alert.culturalContext}
                </Text>
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  };

  const renderResidentsTab = () => (
    <>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search residents..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setFilterMenuVisible(true)}
              icon="filter-list"
            >
              Filter
            </Button>
          }
        >
          <Menu.Item onPress={() => { setSelectedCulturalGroup('all'); setFilterMenuVisible(false); }} title="All Groups" />
          <Menu.Item onPress={() => { setSelectedCulturalGroup('maori'); setFilterMenuVisible(false); }} title="Māori" />
          <Menu.Item onPress={() => { setSelectedCulturalGroup('chinese'); setFilterMenuVisible(false); }} title="Chinese" />
          <Menu.Item onPress={() => { setSelectedCulturalGroup('western'); setFilterMenuVisible(false); }} title="Western" />
        </Menu>
      </View>

      <FlatList
        data={filteredResidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedResident(item);
              setShowResidentDialog(true);
            }}
          >
            <Card style={styles.residentCard}>
              <Card.Content>
                <View style={styles.residentHeader}>
                  <View style={styles.residentInfo}>
                    <Text style={styles.residentName}>{item.fullName}</Text>
                    <Text style={styles.residentRoom}>{item.room}</Text>
                  </View>
                  <View style={styles.residentBadges}>
                    <Chip 
                      icon={() => <Icon name={getCulturalIcon(item.culturalGroup)} size={16} color="white" />}
                      style={[styles.culturalChip, { backgroundColor: getCulturalColor(item.culturalGroup) }]}
                      textStyle={styles.chipText}
                    >
                      {item.culturalGroup}
                    </Chip>
                    <View style={[styles.wellnessChip, { backgroundColor: getWellnessColor(item.wellnessScore) }]}>
                      <Text style={styles.wellnessChipText}>{item.wellnessScore}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.residentStats}>
                  <Text style={styles.residentStat}>
                    Last check-in: {item.lastCheckIn ? format(new Date(item.lastCheckIn), 'MMM d') : 'None'}
                  </Text>
                  <Text style={styles.residentStat}>
                    Alerts: {item.currentAlerts}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Dashboard</Text>
        <Text style={styles.headerSubtitle}>Cultural-Aware Healthcare Management</Text>
      </View>

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
          style={[styles.tab, selectedTab === 'residents' && styles.activeTab]}
          onPress={() => setSelectedTab('residents')}
        >
          <Icon name="people" size={20} color={selectedTab === 'residents' ? 'white' : theme.colors.onSurfaceVariant} />
          <Text style={[styles.tabText, selectedTab === 'residents' && styles.activeTabText]}>
            Residents
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'residents' && renderResidentsTab()}
      </View>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => Alert.alert('Quick Actions', 'Choose an action', [
          { text: 'Add Cultural Alert', onPress: () => {} },
          { text: 'Schedule Training', onPress: () => {} },
          { text: 'Generate Report', onPress: () => {} },
          { text: 'Cancel', style: 'cancel' },
        ])}
      />

      <Portal>
        <Dialog visible={showResidentDialog} onDismiss={() => setShowResidentDialog(false)}>
          <Dialog.Title>{selectedResident?.fullName}</Dialog.Title>
          <Dialog.Content>
            {selectedResident && (
              <>
                <Text style={styles.dialogSection}>Cultural Profile</Text>
                <Text style={styles.dialogText}>Group: {selectedResident.culturalGroup}</Text>
                <Text style={styles.dialogText}>Language: {selectedResident.preferredLanguage}</Text>
              
                <Text style={styles.dialogSection}>Care Plan</Text>
                <Text style={styles.dialogText}>Family Involvement: {selectedResident.culturalCarePlan.familyInvolvement}</Text>
                <Text style={styles.dialogText}>Communication: {selectedResident.culturalCarePlan.communicationPreferences}</Text>
                <Text style={styles.dialogText}>Spiritual Needs: {selectedResident.culturalCarePlan.spiritualNeeds}</Text>
              
                <Text style={styles.dialogSection}>Key Considerations</Text>
                {selectedResident.culturalCarePlan.keyConsiderations.map((consideration, index) => (
                  <Text key={index} style={styles.dialogBullet}>• {consideration}</Text>
                ))}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResidentDialog(false)}>Close</Button>
            <Button onPress={() => Alert.alert('Care Plan', 'Opening care plan editor')}>
              Edit Care Plan
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog visible={showAlertDialog} onDismiss={() => setShowAlertDialog(false)}>
          <Dialog.Title>Cultural Alert</Dialog.Title>
          <Dialog.Content>
            {selectedAlert && (
              <>
                <Text style={styles.dialogText}>Resident: {selectedAlert.residentName}</Text>
                <Text style={styles.dialogText}>Type: {selectedAlert.alertType}</Text>
                <Text style={styles.dialogText}>Severity: {selectedAlert.severity}</Text>
              
                <Text style={styles.dialogSection}>Description</Text>
                <Text style={styles.dialogText}>{selectedAlert.message}</Text>
              
                <Text style={styles.dialogSection}>Cultural Context</Text>
                <Text style={styles.dialogText}>{selectedAlert.culturalContext}</Text>
              
                <TextInput
                  label="Resolution Notes"
                  multiline
                  numberOfLines={3}
                  style={styles.resolutionInput}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAlertDialog(false)}>Cancel</Button>
            <Button onPress={() => selectedAlert && handleResolveAlert(selectedAlert.id)}>
              Mark Resolved
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    marginLeft: 4,
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
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    elevation: 2,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
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
  alertItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertSeverity: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  alertMessage: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  culturalContext: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  residentCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  residentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  residentRoom: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  residentBadges: {
    alignItems: 'flex-end',
  },
  culturalChip: {
    marginBottom: 4,
  },
  chipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  wellnessChip: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wellnessChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  residentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  residentStat: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  dialogSection: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  dialogBullet: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
    marginLeft: 8,
  },
  resolutionInput: {
    marginTop: 12,
  },
});

export default StaffDashboard;