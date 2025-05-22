import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, no-undef
const AVATAR_BG = require('../../../assets/chatbot_avatar.jpg');

const ChatbotCallScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [listening, setListening] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const handleEndCall = () => {
    navigation.navigate('Main', { screen: 'Chatbot' });
  };

  // Format call duration as HH:MM:SS
  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h !== '00' ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.callScreenWrapper} edges={["left","right"]}>
      <ImageBackground
        source={AVATAR_BG}
        style={styles.callContainer}
        imageStyle={styles.avatar}
        resizeMode="cover"
        accessible
        accessibilityLabel="Chatbot avatar background"
      >
        {/* Call duration display */}
        <Text style={styles.timeText} accessibilityRole="text">{formatDuration(callSeconds)}</Text>
        {/* Voice wave animation */}
        {listening && (
          <View style={styles.waveContainer} accessibilityLabel="Voice input waves">
            {[1, 2, 3].map((i) => (
              <Animatable.View
                key={i}
                animation={{
                  0: { height: 24 },
                  0.5: { height: 56 },
                  1: { height: 24 }
                }}
                duration={1000}
                iterationCount="infinite"
                style={styles.wave}
              />
            ))}
          </View>
        )}
        {/* Call controls */}
        <View style={styles.callControls}>
          <TouchableOpacity
            onPress={() => setListening(!listening)}
            style={[styles.callButton, listening ? styles.muteButton : styles.unmuteButton]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Mute microphone' : 'Unmute microphone'}
            activeOpacity={0.7}
          >
            <Icon name={listening ? 'microphone-off' : 'microphone'} size={54} color={listening ? '#fff' : '#fff'} style={{ alignSelf: 'center' }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleEndCall}
            style={[styles.callButton, styles.endCallButton]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Hang up call"
            activeOpacity={0.7}
          >
            <Icon name="phone-off" size={54} color="#fff" style={{ alignSelf: 'center' }} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  callScreenWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  callContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    position: 'absolute',
    top: 72,
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    alignSelf: 'center',
    letterSpacing: 2,
    zIndex: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    justifyContent: 'center',
    zIndex: 2,
  },
  wave: {
    width: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginHorizontal: 10,
  },
  callControls: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
  callButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 56,
    elevation: 6,
  },
  muteButton: {
    backgroundColor: '#6366F1',
  },
  unmuteButton: {
    backgroundColor: '#10B981', // green for unmuted
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  iconButtonContent: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatbotCallScreen; 