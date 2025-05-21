import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import AccessibilitySettings from '../../components/ui/AccessibilitySettings';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <AccessibilitySettings
        highContrast={highContrast}
        largeText={largeText}
        onToggleHighContrast={() => setHighContrast(h => !h)}
        onToggleLargeText={() => setLargeText(l => !l)}
      />
      <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.backButton}>
        Back to Profile
      </Button>
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
  backButton: {
    marginTop: 32,
    borderRadius: 8,
    alignSelf: 'center',
  },
});

export default SettingsScreen; 