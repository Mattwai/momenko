import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VoiceInputIndicator = ({ active }: { active: boolean }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      scale.setValue(1);
    }
  }, [active]);

  if (!active) return null;
  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name="microphone" size={48} color="#6366F1" />
      </Animated.View>
      <Text style={styles.text}>Listening...</Text>
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

export default VoiceInputIndicator; 