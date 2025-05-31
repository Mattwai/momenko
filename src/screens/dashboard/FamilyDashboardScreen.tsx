import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import PersonalizedGreeting from '../../components/ui/PersonalizedGreeting';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import LargeText from '../../components/ui/LargeText';

const FamilyDashboardScreen = () => {
  // Placeholder data
  const recentMood = 'Happy';
  const alerts = [
    'Patient missed medication reminder yesterday.',
    'Unusual mood detected: Sadness reported 2 days in a row.',
  ];
  const recentActivities = [
    { type: 'Conversation', summary: 'Talked about childhood memories.' },
    { type: 'Activity', summary: 'Completed memory game.' },
    { type: 'Conversation', summary: 'Discussed favorite foods.' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PersonalizedGreeting name="Family Member" />
      <LargeText style={styles.sectionTitle}>Patient Summary</LargeText>
      <Text style={styles.label}>Recent Mood:</Text>
      <Text style={styles.value}>{recentMood}</Text>
      <Text style={styles.label}>Cognitive Progress:</Text>
      <ProgressIndicator visible={true} />
      <LargeText style={styles.sectionTitle}>Alerts</LargeText>
      {alerts.length === 0 ? (
        <Text style={styles.value}>No alerts</Text>
      ) : (
        alerts.map((alert, idx) => (
          <Text key={idx} style={styles.alert}>{alert}</Text>
        ))
      )}
      <LargeText style={styles.sectionTitle}>Recent Activities</LargeText>
      {recentActivities.map((item, idx) => (
        <Text key={idx} style={styles.value}>{item.type}: {item.summary}</Text>
      ))}
      <Button
        mode="contained"
        style={styles.careTeamButton}
        onPress={() => {}}
        accessibilityLabel="Contact care team"
      >
        Contact Care Team
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 18,
    marginTop: 12,
    color: '#1F2937',
  },
  value: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 8,
  },
  alert: {
    color: '#EF4444',
    fontSize: 18,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  careTeamButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 8,
  },
});

export default FamilyDashboardScreen; 