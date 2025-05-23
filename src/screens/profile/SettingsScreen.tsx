import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import AccessibilitySettings from '../../components/ui/AccessibilitySettings';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <View style={styles.backArrowContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back to Profile"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={32} color="#6366F1" />
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <AccessibilitySettings
        highContrast={highContrast}
        largeText={largeText}
        onToggleHighContrast={() => setHighContrast(h => !h)}
        onToggleLargeText={() => setLargeText(l => !l)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
    marginTop: 16,
  },
  backArrowContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 8,
    marginLeft: 8,
    marginBottom: 0,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'transparent',
    padding: 4,
  },
});

export default SettingsScreen; 