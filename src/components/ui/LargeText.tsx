import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

const LargeText: React.FC<TextProps> = ({ style, children, ...props }) => (
  <Text style={[styles.largeText, style]} {...props}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  largeText: {
    fontSize: 32,
    color: '#1F2937', // High contrast dark color
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LargeText; 