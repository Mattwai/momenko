import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const ActivityPrompt = ({ prompt }: { prompt: string }) => (
  <View style={styles.container}>
    <Text style={styles.prompt}>{prompt}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
  },
  prompt: {
    fontSize: 20,
    color: '#3730A3',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ActivityPrompt; 