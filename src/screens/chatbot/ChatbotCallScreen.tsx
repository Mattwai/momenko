import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { PreferredLanguage } from '../../types';
import { useCulturalContext } from '../../contexts/CulturalContext';
import VoiceInputIndicator from '../../components/ui/VoiceInputIndicator';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, no-undef
const AVATAR_BG = require('../../../assets/chatbot_avatar.jpg');

const ChatbotCallScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile } = useCulturalContext();
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; isFinal: boolean }>>([]);

  // Initialize voice recognition with cultural preferences
  const {
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    audioState,
    detectedLanguage,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    preferredLanguage: culturalProfile.preferredLanguage as PreferredLanguage,
    silenceThreshold: 3, // 3 seconds of silence before auto-stop
    autoStop: true,
    onTranscriptUpdate: (text, isFinal) => {
      setTranscripts(prev => [...prev, { text, isFinal }]);
    },
    onLanguageDetected: (language) => {
      console.log('Detected language:', language);
    },
    onError: (err) => {
      Alert.alert(
        'Voice Recognition Error',
        err,
        [{ text: 'OK', onPress: handleEndCall }]
      );
    },
  });

  // Handle call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEndCall = useCallback(() => {
    stopListening();
    navigation.navigate('Main', { screen: 'Chatbot' });
  }, [navigation, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Format call duration as HH:MM:SS
  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h !== '00' ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // Get culturally appropriate status text
  const getStatusText = () => {
    if (error) return '';
    if (isListening) {
      switch (culturalProfile.preferredLanguage) {
        case 'mi':
          return 'Kei te whakarongo...';
        case 'zh':
          return '正在聆听...';
        case 'en':
        default:
          return 'Listening...';
      }
    }
    return '';
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
        <Text style={styles.timeText} accessibilityRole="text">
          {formatDuration(callSeconds)}
        </Text>

        {/* Status text */}
        <Text style={styles.statusText} accessibilityRole="text">
          {getStatusText()}
        </Text>

        {/* Voice wave animation */}
        {isListening && (
          <View style={styles.waveContainer} accessibilityLabel="Voice input waves">
            <VoiceInputIndicator active={isListening} />
          </View>
        )}

        {/* Transcript display */}
        <View style={styles.transcriptContainer}>
          {transcripts.slice(-3).map((transcript, index) => (
            <Animatable.Text
              key={index}
              animation="fadeIn"
              style={[
                styles.transcriptText,
                transcript.isFinal ? styles.finalTranscript : styles.interimTranscript,
              ]}
            >
              {transcript.text}
            </Animatable.Text>
          ))}
          {interimTranscript && (
            <Animatable.Text
              animation="fadeIn"
              style={[styles.transcriptText, styles.interimTranscript]}
            >
              {interimTranscript}
            </Animatable.Text>
          )}
        </View>

        {/* Call controls */}
        <View style={styles.callControls}>
          <TouchableOpacity
            onPress={toggleListening}
            style={[styles.callButton, isListening ? styles.muteButton : styles.unmuteButton]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Mute microphone' : 'Unmute microphone'}
            activeOpacity={0.7}
          >
            <Icon
              name={isListening ? 'microphone-off' : 'microphone'}
              size={54}
              color="#fff"
              style={{ alignSelf: 'center' }}
            />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  avatar: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 48,
  },
  statusText: {
    fontSize: 24,
    color: '#fff',
    marginTop: 16,
    fontWeight: '500',
  },
  waveContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    marginVertical: 24,
  },
  transcriptContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  transcriptText: {
    fontSize: 20,
    marginVertical: 8,
    textAlign: 'center',
    color: '#fff',
  },
  interimTranscript: {
    opacity: 0.7,
  },
  finalTranscript: {
    fontWeight: 'bold',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 48,
    gap: 24,
  },
  callButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  muteButton: {
    backgroundColor: '#EF4444',
  },
  unmuteButton: {
    backgroundColor: '#10B981',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
});

export default ChatbotCallScreen; 