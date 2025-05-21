import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const PersonalizedGreeting = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text style={styles.greeting}>Hello, {name}!</Text>
    <Text style={styles.subtext}>I'm here to help you today.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 26,
    color: '#6366F1',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 18,
    color: '#4B5563',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PersonalizedGreeting; 