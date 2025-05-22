import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';

const ProgressIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.text}>Thinking...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  text: {
    marginTop: 8,
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default ProgressIndicator; 