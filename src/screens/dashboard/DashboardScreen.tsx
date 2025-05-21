import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

const DashboardScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={1000}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Welcome to Momenko
        </Text>
      </Animatable.View>
    </View>
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
});

export default DashboardScreen; 