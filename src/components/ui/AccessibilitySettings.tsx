import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  highContrast: boolean;
  largeText: boolean;
  onToggleHighContrast: () => void;
  onToggleLargeText: () => void;
}

const AccessibilitySettings: React.FC<Props> = ({ highContrast, largeText, onToggleHighContrast, onToggleLargeText }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessibility Options</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>High Contrast</Text>
        <Switch value={highContrast} onValueChange={onToggleHighContrast} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Large Text</Text>
        <Switch value={largeText} onValueChange={onToggleLargeText} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginVertical: 16,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 8,
  },
  settingLabel: {
    fontSize: 18,
    color: '#1F2937',
  },
});

export default AccessibilitySettings; 