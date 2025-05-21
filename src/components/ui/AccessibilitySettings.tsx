import React, { useState } from 'react';
import { View, StyleSheet, Modal, Switch, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  highContrast: boolean;
  largeText: boolean;
  onToggleHighContrast: () => void;
  onToggleLargeText: () => void;
}

const AccessibilitySettings: React.FC<Props> = ({ highContrast, largeText, onToggleHighContrast, onToggleLargeText }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)} accessibilityLabel="Accessibility Settings" accessibilityRole="button">
        <Icon name="eye" size={24} color="#6366F1" style={styles.icon} />
        <Text style={styles.text}>Accessibility</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Accessibility Settings</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>High Contrast</Text>
              <Switch value={highContrast} onValueChange={onToggleHighContrast} />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Large Text</Text>
              <Switch value={largeText} onValueChange={onToggleLargeText} />
            </View>
            <Button mode="contained" onPress={() => setVisible(false)} style={styles.closeButton}>Close</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-end',
    margin: 8,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: 300,
    alignItems: 'center',
  },
  modalTitle: {
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
  closeButton: {
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
});

export default AccessibilitySettings; 