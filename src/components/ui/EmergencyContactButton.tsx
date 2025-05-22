import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const EmergencyContactButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={styles.touchable}
    onPress={onPress}
    accessibilityLabel="Emergency Contact"
    accessibilityRole="button"
    activeOpacity={0.85}
  >
    <LinearGradient
      colors={["#EF4444", "#F87171"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.button}
    >
      <Icon name="phone" size={32} color="#fff" style={styles.icon} />
      <Text style={styles.text}>Emergency</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    margin: 4,
  },
  button: {
    minWidth: 140,
    maxWidth: 200,
    height: 88,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: '#fff',
  },
  icon: {
    marginBottom: 4,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default EmergencyContactButton; 