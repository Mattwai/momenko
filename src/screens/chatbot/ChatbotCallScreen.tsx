import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState as _AppState,
  Vibration,
} from "react-native";
import { Text, Surface, Button } from "react-native-paper";
import * as Animatable from "react-native-animatable";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVoiceCommunication } from "../../hooks/useVoiceCommunication";
import { PreferredLanguage } from "../../types";
import { useCulturalContext } from "../../contexts/CulturalContext";
import VoiceInputIndicator from "../../components/ui/VoiceInputIndicator";
import { Audio } from 'expo-av';

import AVATAR_BG from "../../../assets/chatbot_avatar.jpg";

const ChatbotCallScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile, getCulturalGreeting, getAdaptedResponse } = useCulturalContext();
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcripts, setTranscripts] = useState<
    Array<{ text: string; isFinal: boolean; timestamp: Date }>
  >([]);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const isScreenMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle navigation back with cleanup
  const handleNavigateBack = useCallback(() => {
    navigation.navigate("Main", { screen: "Chatbot" });
  }, [navigation]);

  // Initialize voice communication with cultural preferences
  const {
    isListening,
    isSpeaking,
    interimTranscript,
    finalTranscript: _finalTranscript,
    error,
    audioState: _audioState,
    isInitialized,
    isSimulatedTranscription,
    startListening,
    stopListening,
    speak: _speak,
    stopSpeaking,
  } = useVoiceCommunication({
    preferredLanguage: culturalProfile.preferredLanguage as PreferredLanguage,
    enableTTS: true, // Enable text-to-speech for responses
    onTranscriptUpdate: (text, isFinal) => {
      console.log('📝 Transcript update:', { text, isFinal });
      setTranscripts((prev) => [...prev, { text, isFinal, timestamp: new Date() }]);
      
      // Auto-generate cultural response for final transcripts
      if (isFinal && text.trim()) {
        const adaptedResponse = getAdaptedResponse(
          "Thank you for sharing that with me. How else can I help you today?",
          'casual',
          { userInput: text }
        );
        console.log('Generated cultural response:', adaptedResponse);
      }
    },
    onError: (err) => {
      console.error('❌ Voice communication error:', err);
      Alert.alert("Voice Recognition Error", err, [
        { text: "OK", onPress: handleNavigateBack },
      ]);
    },
  });

  const handleEndCall = useCallback(() => {
    // Prevent multiple calls
    if (!isScreenMounted.current) return;
    
    // First mark component as unmounted to prevent further state updates
    isScreenMounted.current = false;
    
    // Clear the timer first to stop updates
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop all voice services (wrap in try/catch to prevent navigation blocking)
    const cleanup = async () => {
      try {
        if (isListening) await stopListening();
        if (isSpeaking) await stopSpeaking();
        
        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (err) {
        console.warn('Error during call cleanup:', err);
      } finally {
        // Always navigate back regardless of cleanup errors
        navigation.navigate("Main", { screen: "Chatbot" });
      }
    };
    
    // Execute cleanup
    cleanup();
  }, [navigation, stopListening, stopSpeaking, isListening, isSpeaking]);

  // Set up audio mode once at the beginning
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('🔊 Audio mode configured for call screen');
      } catch (err) {
        console.warn('❌ Failed to set audio mode:', err);
      }
    };
    
    setupAudio();
  }, []);

  // Initialize voice only when the screen is focused and clean up when it's not
  useFocusEffect(
    useCallback(() => {
      isScreenMounted.current = true;
      
      // BackHandler to properly clean up when user presses back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isScreenMounted.current) {
          handleEndCall();
          return true;
        }
        return false;
      });
      
      return () => {
        isScreenMounted.current = false;
        backHandler.remove();
      };
    }, [handleEndCall])
  );

  // Handle call timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Auto-start listening when initialized
  useEffect(() => {
    if (isInitialized && !isListening && !isSpeaking && isScreenMounted.current) {
      console.log('🎤 Auto-starting listening on initialization');
      const timer = setTimeout(() => {
        if (isScreenMounted.current && !isListening && !isSpeaking) {
          startListening();
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  const toggleListening = useCallback(() => {
    if (!isScreenMounted.current) return;
    
    // Disable the toggle if not initialized
    if (!isInitialized) {
      Alert.alert(
        "Voice Service Not Ready",
        "Please wait a moment before trying again.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening, isInitialized]);

  // Format call duration as HH:MM:SS
  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return h !== "00" ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // Get culturally appropriate status text
  const getStatusText = () => {
    if (error) return "";
    if (isListening) {
      const baseText = (() => {
        switch (culturalProfile.preferredLanguage) {
          case "mi":
            return "Kei te whakarongo...";
          case "zh":
            return "正在聆听...";
          case "en":
          default:
            return "Listening...";
        }
      })();
      return isSimulatedTranscription ? `${baseText} (Device)` : baseText;
    }
    if (isSpeaking) {
      const responseText = (() => {
        switch (culturalProfile.preferredLanguage) {
          case "mi":
            return "Kei te kōrero...";
          case "zh":
            return "正在说话...";
          case "en":
          default:
            return "Speaking...";
        }
      })();
      return isSimulatedTranscription ? `${responseText} (ElevenLabs)` : responseText;
    }
    if (callSeconds === 0) {
      return getCulturalGreeting(
        new Date().getHours() < 12 ? 'morning' : 
        new Date().getHours() < 18 ? 'afternoon' : 'evening'
      );
    }
    return isSimulatedTranscription ? "Using device transcription" : "";
  };

  // Get cultural theme colors
  const getCulturalColors = () => {
    const baseColors = isHighContrast ? {
      maori: { primary: '#000000', secondary: '#FFFFFF', accent: '#FF0000' },
      chinese: { primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700' },
      western: { primary: '#000000', secondary: '#FFFFFF', accent: '#0066CC' }
    } : {
      maori: { primary: '#8B4513', secondary: '#F5DEB3', accent: '#228B22' },
      chinese: { primary: '#DC143C', secondary: '#FFD700', accent: '#FF6347' },
      western: { primary: '#6366F1', secondary: '#E0E7FF', accent: '#8B5CF6' }
    };
    
    return baseColors[culturalProfile.culturalGroup];
  };

  const colors = getCulturalColors();

  // Text size mappings
  const getTextSizes = () => ({
    small: { title: 28, body: 18, caption: 14 },
    medium: { title: 32, body: 22, caption: 16 },
    large: { title: 36, body: 26, caption: 18 },
    'extra-large': { title: 44, body: 32, caption: 22 }
  })[textSize];

  const textSizes = getTextSizes();

  return (
    <SafeAreaView style={styles.callScreenWrapper} edges={["left", "right"]}>
      <ImageBackground
        source={AVATAR_BG}
        style={[styles.callContainer, { backgroundColor: colors.secondary }]}
        imageStyle={styles.avatar}
        resizeMode="cover"
        accessible
        accessibilityLabel="Chatbot avatar background"
      >
        {/* Accessibility Controls */}
        <View style={styles.accessibilityControls}>
          <Surface style={styles.controlsPanel} elevation={2}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: isHighContrast ? colors.accent : colors.primary }]}
              onPress={() => setIsHighContrast(!isHighContrast)}
              accessibilityLabel={`Toggle high contrast mode. Currently ${isHighContrast ? 'on' : 'off'}`}
            >
              <Icon 
                name="contrast-circle" 
                size={20} 
                color={isHighContrast ? '#FFFFFF' : colors.secondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                const sizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = ['small', 'medium', 'large', 'extra-large'];
                const currentIndex = sizes.indexOf(textSize);
                const nextIndex = (currentIndex + 1) % sizes.length;
                setTextSize(sizes[nextIndex]);
              }}
              accessibilityLabel={`Change text size. Currently ${textSize}`}
            >
              <Icon 
                name="format-size" 
                size={20} 
                color={colors.secondary} 
              />
            </TouchableOpacity>
          </Surface>
        </View>
        {/* Call duration display */}
        <Text 
          style={[
            styles.timeText, 
            { 
              fontSize: textSizes.title, 
              color: isHighContrast ? '#FFFFFF' : '#FFFFFF' 
            }
          ]} 
          accessibilityRole="text"
        >
          {formatDuration(callSeconds)}
        </Text>

        {/* Status text */}
        <Text 
          style={[
            styles.statusText, 
            { 
              fontSize: textSizes.body, 
              color: isHighContrast ? '#FFFFFF' : '#FFFFFF' 
            }
          ]} 
          accessibilityRole="text"
        >
          {getStatusText()}
        </Text>

        {/* Voice recognition info */}
        {isSimulatedTranscription && (
          <View style={styles.deviceBanner}>
            <Text style={styles.deviceText}>
              Using device transcription with ElevenLabs voice
            </Text>
          </View>
        )}

        {/* Debug info */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Debug: Init={isInitialized ? '✅' : '❌'} Listening={isListening ? '🎤' : '🔇'} Speaking={isSpeaking ? '🔊' : '🔇'}
            </Text>
            <Text style={styles.debugText}>
              Timer: {callSeconds}s | Mounted: {isScreenMounted.current ? '✅' : '❌'}
            </Text>
          </View>
        )}

        {/* Voice wave animation */}
        {(isListening || isSpeaking) && (
          <View
            style={styles.waveContainer}
            accessibilityLabel="Voice input waves"
          >
            <VoiceInputIndicator active={isListening || isSpeaking} />
          </View>
        )}

        {/* Transcript display */}
        <View style={styles.transcriptContainer}>
          {transcripts.slice(-3).map((transcript, index) => (
            <Animatable.View
              key={`${transcript.timestamp.getTime()}-${index}`}
              animation="fadeIn"
              style={[
                styles.transcriptBubble,
                {
                  backgroundColor: transcript.isFinal 
                    ? (isHighContrast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)')
                    : (isHighContrast ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.6)')
                }
              ]}
            >
              <Text
                style={[
                  styles.transcriptText,
                  {
                    fontSize: textSizes.body,
                    color: isHighContrast ? '#000000' : '#333333',
                    fontWeight: transcript.isFinal ? 'bold' : 'normal'
                  }
                ]}
              >
                {transcript.text}
              </Text>
              <Text 
                style={[
                  styles.timestampText,
                  { 
                    fontSize: textSizes.caption,
                    color: isHighContrast ? '#666666' : '#666666'
                  }
                ]}
              >
                {transcript.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </Animatable.View>
          ))}
          {interimTranscript && (
            <Animatable.View
              animation="fadeIn"
              style={[
                styles.transcriptBubble,
                { backgroundColor: isHighContrast ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.4)' }
              ]}
            >
              <Text
                style={[
                  styles.transcriptText,
                  {
                    fontSize: textSizes.body,
                    color: isHighContrast ? '#000000' : '#333333',
                    fontStyle: 'italic'
                  }
                ]}
              >
                {interimTranscript}
              </Text>
            </Animatable.View>
          )}
        </View>

        {/* Call controls */}
        <View style={styles.callControls}>
          <Surface 
            style={[
              styles.callButtonSurface,
              { backgroundColor: isListening ? '#EF4444' : colors.accent }
            ]}
            elevation={5}
          >
            <TouchableOpacity
              onPress={() => {
                Vibration.vibrate(50);
                toggleListening();
              }}
              style={[
                styles.callButton,
                (!isInitialized || isSpeaking) ? styles.disabledButton : null
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                isListening ? "Stop listening" : "Start listening"
              }
              accessibilityHint="Double tap to toggle voice recognition"
              activeOpacity={0.7}
              disabled={!isInitialized || isSpeaking}
            >
              <Icon
                name={isListening ? "microphone-off" : "microphone"}
                size={54}
                color="#fff"
                style={{ alignSelf: "center" }}
              />
            </TouchableOpacity>
          </Surface>
          
          <Surface 
            style={[styles.callButtonSurface, { backgroundColor: '#EF4444' }]}
            elevation={5}
          >
            <TouchableOpacity
              onPress={() => {
                Vibration.vibrate([100, 50, 100]);
                handleEndCall();
              }}
              style={styles.callButton}
              accessible
              accessibilityRole="button"
              accessibilityLabel="End conversation"
              accessibilityHint="Double tap to end the conversation"
              activeOpacity={0.7}
            >
              <Icon
                name="phone-off"
                size={54}
                color="#fff"
                style={{ alignSelf: "center" }}
              />
            </TouchableOpacity>
          </Surface>
        </View>

        {/* Conversation Summary */}
        {conversationSummary && (
          <View style={styles.summaryContainer}>
            <Surface style={styles.summaryPanel} elevation={3}>
              <Text 
                style={[
                  styles.summaryTitle,
                  { 
                    fontSize: textSizes.body,
                    color: isHighContrast ? '#000000' : colors.primary
                  }
                ]}
              >
                Conversation Highlights
              </Text>
              <Text 
                style={[
                  styles.summaryText,
                  { 
                    fontSize: textSizes.caption,
                    color: isHighContrast ? '#333333' : '#666666'
                  }
                ]}
              >
                {conversationSummary}
              </Text>
            </Surface>
          </View>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  callScreenWrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  accessibilityControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  controlsPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    padding: 4,
    gap: 4,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  avatar: {
    opacity: 0.5,
  },
  timeText: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 48,
    textAlign: 'center',
  },
  statusText: {
    color: "#fff",
    marginTop: 16,
    fontWeight: "500",
    textAlign: 'center',
  },
  waveContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 120,
    marginVertical: 24,
  },
  transcriptContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
    justifyContent: "flex-end",
    marginBottom: 24,
  },
  transcriptBubble: {
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  transcriptText: {
    textAlign: "center",
    marginBottom: 4,
  },
  timestampText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  callControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingBottom: 48,
    gap: 24,
  },
  callButtonSurface: {
    borderRadius: 48,
    elevation: 5,
  },
  callButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceBanner: {
    backgroundColor: "rgba(0, 120, 255, 0.8)",
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: "center",
  },
  deviceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  summaryContainer: {
    position: 'absolute',
    bottom: 180,
    left: 24,
    right: 24,
  },
  summaryPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  debugContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "monospace",
  },
});

export default ChatbotCallScreen;