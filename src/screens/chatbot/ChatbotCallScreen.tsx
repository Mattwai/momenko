import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '../../contexts/ChatContext';
// Fix the import to use the available expo-av
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, no-undef
const AVATAR_BG = require('../../../assets/chatbot_avatar.jpg');

const ChatbotCallScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isListening, isSpeaking, startListening, stopListening, transcript, refreshUserSession } = useChat();
  const [callSeconds, setCallSeconds] = useState(0);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [soundDetected, setSoundDetected] = useState(false);
  
  // Configure audio session for speech recognition
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request permissions first
        const permission = await Audio.requestPermissionsAsync();
        const granted = permission.status === 'granted';
        setAudioPermissionGranted(granted);
        
        if (granted) {
          // Configure audio session properly for both recording and playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
          
          console.log('Audio session configured successfully');
          // Start listening after audio is configured
          startListening();
        } else {
          console.warn('Audio permissions not granted');
        }
      } catch (error) {
        console.error('Error configuring audio session:', error);
      }
    };

    setupAudio();
  }, []);

  // Start voice recognition when screen loads
  useEffect(() => {
    // First ensure we have a valid user session before starting voice recognition
    const initializeChat = async () => {
      console.log('Initializing ChatbotCallScreen...');
      try {
        // Refresh user session to ensure we have a valid user ID
        await refreshUserSession();
        // Wait a moment to ensure audio session is configured
        // then start listening if permissions are granted
        setTimeout(() => {
          if (audioPermissionGranted) {
            console.log('Starting voice recognition in ChatbotCallScreen');
            startListening();
          } else {
            console.warn('Audio permissions not granted, cannot start voice recognition');
          }
        }, 1000);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
    // Timer for call duration
    const durationTimer = globalThis.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      stopListening();
      globalThis.clearInterval(durationTimer);
    };
  }, [audioPermissionGranted]);

  // Add sound detection effect
  useEffect(() => {
    let soundTimer: NodeJS.Timeout | null = null;
    
    if (transcript) {
      setSoundDetected(true);
      if (soundTimer) clearTimeout(soundTimer);
      soundTimer = setTimeout(() => setSoundDetected(false), 300);
    }
    
    return () => {
      if (soundTimer) clearTimeout(soundTimer);
    };
  }, [transcript]);

  const handleEndCall = () => {
    stopListening();
    navigation.navigate('Main', { screen: 'Chatbot' });
  };

  const toggleMicrophone = () => {
    if (isListening) {
      stopListening();
    } else {
      // Refresh session before starting to listen
      refreshUserSession().then(() => {
        startListening();
      });
    }
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
        
        {/* Transcript display */}
        {transcript ? (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}
        
        {/* Voice activity indicator */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Ready'}
          </Text>
        </View>
        
        {/* Voice wave animation */}
        <View style={styles.waveContainer} accessibilityLabel="Voice input waves">
          {[1, 2, 3].map((i) => (
            <Animatable.View
              key={i}
              animation={soundDetected || isSpeaking ? {
                0: { height: 24 },
                0.5: { height: 56 },
                1: { height: 24 }
              } : undefined}
              duration={1000}
              iterationCount="infinite"
              style={[
                styles.wave,
                { 
                  height: soundDetected || isSpeaking ? 24 : 12,
                  backgroundColor: isSpeaking ? '#6366F1' : '#fff',
                  opacity: isListening ? 1 : 0.5
                }
              ]}
            />
          ))}
        </View>
        
        {/* Call controls */}
        <View style={styles.callControls}>
          <TouchableOpacity
            onPress={toggleMicrophone}
            style={[styles.callButton, isListening ? styles.muteButton : styles.unmuteButton]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Mute microphone' : 'Unmute microphone'}
            activeOpacity={0.7}
          >
            <Icon name={isListening ? 'microphone-off' : 'microphone'} size={54} color="#fff" style={{ alignSelf: 'center' }} />
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
  transcriptContainer: {
    position: 'absolute',
    top: 120,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 16,
    width: '80%',
    alignSelf: 'center',
  },
  transcriptText: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
  statusContainer: {
    position: 'absolute',
    top: 200,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default ChatbotCallScreen; 