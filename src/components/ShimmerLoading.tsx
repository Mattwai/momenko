import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import Shimmer from 'react-native-shimmer';

interface ShimmerLoadingProps {
  width?: DimensionValue;
  height?: number;
}

export const ShimmerLoading = ({ width = '100%', height = 20 }: ShimmerLoadingProps) => {
  return (
    <Shimmer>
      <View style={[styles.shimmer, { width, height }]} />
    </Shimmer>
  );
};

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
}); 