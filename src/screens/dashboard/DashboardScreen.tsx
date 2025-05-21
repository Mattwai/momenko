import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import EmergencyContactButton from '../../components/ui/EmergencyContactButton';
import FamilyContactButton from '../../components/ui/FamilyContactButton';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <Animatable.View animation="fadeInDown" duration={1000}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Welcome to Momenko
        </Text>
      </Animatable.View>
      <View style={styles.topButtonsContainer}>
        <View style={styles.topButtons}>
          <EmergencyContactButton onPress={() => {}} />
          <FamilyContactButton onPress={() => {}} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  welcome: {
    padding: 24,
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  icon: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    textAlign: 'center',
    opacity: 0.7,
  },
  topButtonsContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    width: '100%',
  },
  topButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    gap: 12,
  },
});

export default DashboardScreen; 