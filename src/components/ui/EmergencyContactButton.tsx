import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const EmergencyContactButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.button} onPress={onPress} accessibilityLabel="Emergency Contact" accessibilityRole="button">
    <Icon name="phone" size={28} color="#fff" style={styles.icon} />
    <Text style={styles.text}>Emergency</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 32,
    margin: 8,
    alignSelf: 'center',
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default EmergencyContactButton; 