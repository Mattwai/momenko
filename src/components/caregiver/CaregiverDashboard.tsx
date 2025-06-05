import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import {
  Card,
  Button,
  FAB,
  Portal,
  Dialog,
  TextInput,
} from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, subDays, isToday } from "date-fns";
import { supabase } from "../../services/supabase";
import {
  notificationService as _notificationService,
  backgroundScheduler as _backgroundScheduler,
} from "../../services/notifications";
import {
  CaregiverAlert,
  WellnessIndicator,
  CheckInSchedule,
  FamilyNotification as _FamilyNotification,
} from "../../types/notifications";
import { CulturalGroup } from "../../types/cultural";
import { theme } from "../../theme";

const { width: _width } = Dimensions.get("window");

interface PatientOverview {
  id: string;
  fullName: string;
  culturalGroup: CulturalGroup;
  lastCheckIn: string | null;
  currentWellnessScore: number;
  alertsCount: number;
  checkInStreak: number;
}

interface ConversationSummary {
  id: string;
  date: string;
  quality: "poor" | "fair" | "good" | "excellent";
  duration: number;
  culturalElements: string[];
  concerns: string[];
  positiveNotes: string[];
  moodIndicators: {
    anxious: boolean;
    confused: boolean;
    content: boolean;
    agitated: boolean;
    responsive: boolean;
  };
}

const CaregiverDashboard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [alerts, setAlerts] = useState<CaregiverAlert[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<
    ConversationSummary[]
  >([]);
  const [_wellnessData, setWellnessData] = useState<WellnessIndicator[]>([]);
  const [checkInSchedules, setCheckInSchedules] = useState<CheckInSchedule[]>(
    [],
  );
  const [_showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CaregiverAlert | null>(
    null,
  );
  const [_loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPatients(),
        loadAlerts(),
        loadWellnessData(),
        selectedPatient && loadPatientDetails(selectedPatient),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        cultural_profiles (cultural_group),
        check_in_schedules (last_check_in),
        wellness_indicators (
          date,
          check_in_completed,
          conversation_quality
        )
      `,
      )
      .order("full_name");

    if (error) throw error;

    interface DatabaseUser {
      id: string;
      full_name: string;
      cultural_profiles: Array<{ cultural_group: string }>;
      check_in_schedules: Array<{ last_check_in: string }>;
      wellness_indicators: Array<{
        id: string;
        user_id: string;
        date: string;
        check_in_completed: boolean;
        conversation_quality: string;
        concerns: string[];
        positive_notes: string[];
        cultural_engagement: number;
        created_at: string;
        updated_at: string;
      }>;
    }

    interface RawWellnessIndicator {
      id: string;
      user_id: string;
      date: string;
      check_in_completed: boolean;
      conversation_quality: string;
      concerns: string[];
      positive_notes: string[];
      cultural_engagement: number;
      created_at: string;
      updated_at: string;
    }

    const patientsData: PatientOverview[] =
      data?.map((user: DatabaseUser) => {
        const rawWellness = user.wellness_indicators
          ?.filter(
            (w: RawWellnessIndicator) => w.date >= format(subDays(new Date(), 7), "yyyy-MM-dd"),
          )
          ?.sort((a: RawWellnessIndicator, b: RawWellnessIndicator) => b.date.localeCompare(a.date));

        // Transform raw wellness data to WellnessIndicator format
        const recentWellness: WellnessIndicator[] = rawWellness?.map((w: RawWellnessIndicator) => ({
          id: w.id,
          userId: w.user_id,
          date: w.date,
          checkInCompleted: w.check_in_completed,
          conversationQuality: w.conversation_quality,
          concerns: w.concerns || [],
          positiveNotes: w.positive_notes || [],
          culturalEngagement: w.cultural_engagement,
          createdAt: w.created_at,
          updatedAt: w.updated_at
        })) || [];

        const lastCheckIn = user.check_in_schedules?.[0]?.last_check_in;
        const wellnessScore = calculateWellnessScore(recentWellness);
        const checkInStreak = calculateCheckInStreak(recentWellness);

        return {
          id: user.id,
          fullName: user.full_name,
          culturalGroup: user.cultural_profiles?.[0]?.cultural_group || "western",
          lastCheckIn,
          currentWellnessScore: wellnessScore,
          alertsCount: 0, // Will be loaded separately
          checkInStreak,
        };
      }) || [];

    setPatients(patientsData);
    if (patientsData.length > 0 && !selectedPatient) {
      setSelectedPatient(patientsData[0].id);
    }
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from("caregiver_alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("timestamp", { ascending: false })
      .limit(20);

    if (error) throw error;
    setAlerts(data || []);
  };

  const loadPatientDetails = async (patientId: string) => {
    await Promise.all([
      loadConversationSummaries(patientId),
      loadPatientWellnessData(patientId),
      loadPatientSchedules(patientId),
    ]);
  };

  const loadConversationSummaries = async (patientId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    // Transform conversation data to summaries
    const summaries: ConversationSummary[] =
      data?.map((conv) => ({
        id: conv.id,
        date: conv.created_at,
        quality: "good", // Would be calculated from conversation analysis
        duration: 5, // Would be calculated from conversation data
        culturalElements: ["traditional greeting", "family mention"],
        concerns: [],
        positiveNotes: ["responsive", "engaged"],
        moodIndicators: {
          anxious: false,
          confused: false,
          content: true,
          agitated: false,
          responsive: true,
        },
      })) || [];

    setConversationSummaries(summaries);
  };

  const loadPatientWellnessData = async (patientId: string) => {
    const { data, error } = await supabase
      .from("wellness_indicators")
      .select("*")
      .eq("user_id", patientId)
      .gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd"))
      .order("date", { ascending: false });

    if (error) throw error;
    setWellnessData(data || []);
  };

  const loadPatientSchedules = async (patientId: string) => {
    const { data, error } = await supabase
      .from("check_in_schedules")
      .select("*")
      .eq("user_id", patientId)
      .eq("is_active", true);

    if (error) throw error;
    setCheckInSchedules(data || []);
  };

  const loadWellnessData = async () => {
    const { data, error } = await supabase
      .from("wellness_indicators")
      .select("*")
      .gte("date", format(subDays(new Date(), 7), "yyyy-MM-dd"));

    if (error) throw error;
    setWellnessData(data || []);
  };

  const calculateWellnessScore = (indicators: WellnessIndicator[]): number => {
    if (indicators.length === 0) return 0;

    const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
    const avgQuality =
      indicators.reduce(
        (sum, ind) =>
          sum +
          (qualityMap[ind.conversationQuality as keyof typeof qualityMap] ||
            0),
        0,
      ) / indicators.length;

    const completionRate =
      indicators.filter((ind) => ind.checkInCompleted).length /
      indicators.length;

    return Math.round(((avgQuality / 4) * 0.6 + completionRate * 0.4) * 100);
  };

  const calculateCheckInStreak = (indicators: WellnessIndicator[]): number => {
    let streak = 0;
    for (let i = 0; i < indicators.length; i++) {
      if (indicators[i].checkInCompleted) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getCulturalIcon = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case "maori":
        return "nature-people";
      case "chinese":
        return "language";
      default:
        return "person";
    }
  };

  const getCulturalColor = (culturalGroup: CulturalGroup): string => {
    switch (culturalGroup) {
      case "maori":
        return "#2E7D32";
      case "chinese":
        return "#C62828";
      default:
        return theme.colors.primary;
    }
  };

  const getWellnessColor = (score: number): string => {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#FF9800";
    if (score >= 40) return "#FF5722";
    return "#F44336";
  };

  const getAlertSeverityColor = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "#F44336";
      case "high":
        return "#FF5722";
      case "normal":
        return "#FF9800";
      default:
        return "#4CAF50";
    }
  };

  const handleResolveAlert = async (alertId: string, notes?: string) => {
    try {
      await supabase
        .from("caregiver_alerts")
        .update({
          is_resolved: true,
          resolved_by: "caregiver",
          resolved_at: new Date().toISOString(),
          notes: notes || "Resolved by caregiver",
        })
        .eq("id", alertId);

      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
      setShowAlertDialog(false);
      setSelectedAlert(null);
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      Alert.alert("Error", "Failed to resolve alert");
    }
  };

  const handleCreateSchedule = async () => {
    setShowScheduleDialog(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const selectedPatientData = patients.find((p) => p.id === selectedPatient);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Caregiver Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Cultural-Aware Care Management
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Patients</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientCard,
                    selectedPatient === patient.id &&
                      styles.selectedPatientCard,
                  ]}
                  onPress={() => setSelectedPatient(patient.id)}
                >
                  <View style={styles.patientHeader}>
                    <Icon
                      name={getCulturalIcon(patient.culturalGroup)}
                      size={24}
                      color={getCulturalColor(patient.culturalGroup)}
                    />
                    <Text style={styles.patientName}>{patient.fullName}</Text>
                  </View>
                  <View style={styles.patientStats}>
                    <View
                      style={[
                        styles.wellnessScore,
                        {
                          backgroundColor: getWellnessColor(
                            patient.currentWellnessScore,
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.wellnessScoreText}>
                        {patient.currentWellnessScore}
                      </Text>
                    </View>
                    <Text style={styles.patientStat}>
                      {patient.checkInStreak} day streak
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Active Alerts</Text>
              {alerts.slice(0, 3).map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.alertItem}
                  onPress={() => {
                    setSelectedAlert(alert);
                    setShowAlertDialog(true);
                  }}
                >
                  <View style={styles.alertHeader}>
                    <View
                      style={[
                        styles.alertSeverity,
                        {
                          backgroundColor: getAlertSeverityColor(
                            alert.severity,
                          ),
                        },
                      ]}
                    />
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertTime}>
                      {format(new Date(alert.timestamp), "HH:mm")}
                    </Text>
                  </View>
                  <Text style={styles.alertDescription} numberOfLines={2}>
                    {alert.description}
                  </Text>
                  {alert.culturalContext && (
                    <Text style={styles.culturalContext}>
                      Cultural Note: {alert.culturalContext}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              {alerts.length > 3 && (
                <Button mode="text" onPress={() => {}}>
                  View All Alerts ({alerts.length})
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Selected Patient Details */}
        {selectedPatientData && (
          <>
            {/* Wellness Overview */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>
                  Wellness Overview - {selectedPatientData.fullName}
                </Text>
                <View style={styles.culturalBadge}>
                  <Icon
                    name={getCulturalIcon(selectedPatientData.culturalGroup)}
                    size={16}
                    color={getCulturalColor(selectedPatientData.culturalGroup)}
                  />
                  <Text
                    style={[
                      styles.culturalText,
                      {
                        color: getCulturalColor(
                          selectedPatientData.culturalGroup,
                        ),
                      },
                    ]}
                  >
                    {selectedPatientData.culturalGroup.charAt(0).toUpperCase() +
                      selectedPatientData.culturalGroup.slice(1)}{" "}
                    Cultural Profile
                  </Text>
                </View>
                <View style={styles.wellnessGrid}>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>Wellness Score</Text>
                    <Text
                      style={[
                        styles.wellnessValue,
                        {
                          color: getWellnessColor(
                            selectedPatientData.currentWellnessScore,
                          ),
                        },
                      ]}
                    >
                      {selectedPatientData.currentWellnessScore}%
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>Check-in Streak</Text>
                    <Text style={styles.wellnessValue}>
                      {selectedPatientData.checkInStreak} days
                    </Text>
                  </View>
                  <View style={styles.wellnessItem}>
                    <Text style={styles.wellnessLabel}>Last Check-in</Text>
                    <Text style={styles.wellnessValue}>
                      {selectedPatientData.lastCheckIn
                        ? isToday(new Date(selectedPatientData.lastCheckIn))
                          ? "Today"
                          : format(
                              new Date(selectedPatientData.lastCheckIn),
                              "MMM d",
                            )
                        : "Never"}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Recent Conversations */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Recent Conversations</Text>
                {conversationSummaries.slice(0, 3).map((summary) => (
                  <View key={summary.id} style={styles.conversationItem}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationDate}>
                        {format(new Date(summary.date), "MMM d, HH:mm")}
                      </Text>
                      <View
                        style={[
                          styles.qualityBadge,
                          {
                            backgroundColor: getWellnessColor(
                              summary.quality === "excellent"
                                ? 100
                                : summary.quality === "good"
                                  ? 75
                                  : summary.quality === "fair"
                                    ? 50
                                    : 25,
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.qualityText}>
                          {summary.quality}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.conversationDuration}>
                      Duration: {summary.duration} minutes
                    </Text>
                    {summary.culturalElements.length > 0 && (
                      <Text style={styles.culturalElements}>
                        Cultural elements: {summary.culturalElements.join(", ")}
                      </Text>
                    )}
                    {summary.concerns.length > 0 && (
                      <Text style={styles.concerns}>
                        Concerns: {summary.concerns.join(", ")}
                      </Text>
                    )}
                    {summary.positiveNotes.length > 0 && (
                      <Text style={styles.positiveNotes}>
                        Positive: {summary.positiveNotes.join(", ")}
                      </Text>
                    )}
                  </View>
                ))}
              </Card.Content>
            </Card>

            {/* Check-in Schedules */}
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.cardTitle}>Check-in Schedules</Text>
                  <Button mode="outlined" onPress={handleCreateSchedule}>
                    Add Schedule
                  </Button>
                </View>
                {checkInSchedules.map((schedule) => (
                  <View key={schedule.id} style={styles.scheduleItem}>
                    <Text style={styles.scheduleName}>{schedule.name}</Text>
                    <Text style={styles.scheduleDetails}>
                      {schedule.recurrence} at {schedule.preferredTime}
                    </Text>
                    <Text style={styles.scheduleStatus}>
                      {schedule.isActive ? "Active" : "Inactive"} • Missed:{" "}
                      {schedule.missedCount}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>

            {/* Cultural Education Resources */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>
                  Cultural Education Resources
                </Text>
                <Text style={styles.resourceSubtitle}>
                  Learn about {selectedPatientData.culturalGroup} cultural
                  practices
                </Text>
                <View style={styles.resourceGrid}>
                  <TouchableOpacity style={styles.resourceItem}>
                    <Icon name="book" size={24} color={theme.colors.primary} />
                    <Text style={styles.resourceText}>
                      Communication Guidelines
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resourceItem}>
                    <Icon
                      name="family-restroom"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.resourceText}>Family Involvement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resourceItem}>
                    <Icon
                      name="psychology"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.resourceText}>
                      Spiritual Considerations
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resourceItem}>
                    <Icon
                      name="healing"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.resourceText}>Care Practices</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() =>
          Alert.alert("Quick Actions", "Choose an action", [
            { text: "Schedule Check-in", onPress: handleCreateSchedule },
            { text: "Send Family Update", onPress: () => {} },
            { text: "Create Alert", onPress: () => {} },
            { text: "Cancel", style: "cancel" },
          ])
        }
      />

      {/* Alert Dialog */}
      <Portal>
        <Dialog
          visible={showAlertDialog}
          onDismiss={() => setShowAlertDialog(false)}
        >
          <Dialog.Title>{selectedAlert?.title}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>{selectedAlert?.description}</Text>
            {selectedAlert?.culturalContext && (
              <Text style={styles.dialogCulturalContext}>
                Cultural Context: {selectedAlert.culturalContext}
              </Text>
            )}
            {selectedAlert?.suggestedActions && (
              <View style={styles.suggestedActions}>
                <Text style={styles.suggestedActionsTitle}>
                  Suggested Actions:
                </Text>
                {selectedAlert.suggestedActions.map((action, index) => (
                  <Text key={index} style={styles.suggestedAction}>
                    • {action}
                  </Text>
                ))}
              </View>
            )}
            <TextInput
              label="Resolution Notes (Optional)"
              multiline
              numberOfLines={3}
              style={styles.resolutionNotes}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAlertDialog(false)}>Cancel</Button>
            <Button
              onPress={() =>
                selectedAlert && handleResolveAlert(selectedAlert.id)
              }
            >
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
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
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
    fontWeight: "600",
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  patientCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 160,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedPatientCard: {
    borderColor: theme.colors.primary,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  patientStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wellnessScore: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wellnessScoreText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  patientStat: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  alertItem: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  alertDescription: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  culturalContext: {
    fontSize: 12,
    fontStyle: "italic",
    color: theme.colors.primary,
  },
  culturalBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  culturalText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  wellnessGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  wellnessItem: {
    flex: 1,
    alignItems: "center",
  },
  wellnessLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  wellnessValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  conversationItem: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  qualityBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  qualityText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  conversationDuration: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  culturalElements: {
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  concerns: {
    fontSize: 12,
    color: "#F44336",
    marginBottom: 2,
  },
  positiveNotes: {
    fontSize: 12,
    color: "#4CAF50",
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scheduleItem: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: "600",
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
  resourceSubtitle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  resourceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  resourceItem: {
    width: "48%",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  resourceText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    color: theme.colors.onSurface,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  dialogText: {
    fontSize: 14,
    marginBottom: 12,
  },
  dialogCulturalContext: {
    fontSize: 13,
    fontStyle: "italic",
    color: theme.colors.primary,
    marginBottom: 12,
  },
  suggestedActions: {
    marginBottom: 12,
  },
  suggestedActionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  suggestedAction: {
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 8,
  },
  resolutionNotes: {
    marginTop: 8,
  },
});

export default CaregiverDashboard;
