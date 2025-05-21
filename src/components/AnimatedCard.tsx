import React from 'react';
import { StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Surface } from 'react-native-paper';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedCard = ({ children, delay = 0 }: AnimatedCardProps) => {
  return (
    <Animatable.View
      animation="fadeInUp"
      duration={800}
      delay={delay}
      useNativeDriver
    >
      <Surface style={styles.card} elevation={2}>
        {children}
      </Surface>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
  },
}); 