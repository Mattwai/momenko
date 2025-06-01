import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState,
} from "react-native";
import { Text } from "react-native-paper";
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
  const { culturalProfile } = useCulturalContext();
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcripts, setTranscripts] = useState<
    Array<{ text: string; isFinal: boolean }>
  >([]);
  const isScreenMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize voice communication with cultural preferences
  const {
    isListening,
    isSpeaking,
    interimTranscript,
    finalTranscript: _finalTranscript,
    error,
    audioState: _audioState,
    detectedLanguage: _detectedLanguage,
    isInitialized,
    isSimulatedTranscription,
    startListening,
    stopListening,
    speak: _speak,
    stopSpeaking,
  } = useVoiceCommunication({
    preferredLanguage: culturalProfile.preferredLanguage as PreferredLanguage,
    silenceThreshold: 3, // 3 seconds of silence before auto-stop
    autoStop: true,
    enableTTS: true, // Enable text-to-speech for responses
    onTranscriptUpdate: (text, isFinal) => {
      setTranscripts((prev) => [...prev, { text, isFinal }]);
    },
    onLanguageDetected: (language) => {
      console.log("Detected language:", language);
    },
    onError: (err) => {
      Alert.alert("Voice Recognition Error", err, [
        { text: "OK", onPress: handleEndCall },
      ]);
    },
  });

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
        console.log('Audio mode configured for call screen');
      } catch (err) {
        console.warn('Failed to set audio mode:', err);
      }
    };
    
    setupAudio();
  }, []);

  // Initialize voice only when the screen is focused and clean up when it's not
  useFocusEffect(
    useCallback(() => {
      isScreenMounted.current = true;
      
      // Track app state changes to handle background/foreground transitions
      const appStateSubscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          // App came back to foreground - nothing to do, already mounted
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App went to background - stop voice services
          stopListening();
          stopSpeaking();
        }
      });
      
      // BackHandler to properly clean up when user presses back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isScreenMounted.current) {
          handleEndCall();
          return true;
        }
        return false;
      });
      
      return () => {
        // Mark component as unmounted first
        isScreenMounted.current = false;
        
        // Clear timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Stop voice services
        stopListening();
        stopSpeaking();
        
        // Remove listeners
        backHandler.remove();
        appStateSubscription.remove();
        
        // Reset audio mode when leaving
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        }).catch(err => console.warn('Error resetting audio mode:', err));
      };
    }, [stopListening, stopSpeaking])
  );

  // Handle call timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isScreenMounted.current) {
        setCallSeconds((prev) => prev + 1);
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

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
      // Set audio mode again just to be sure
      Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(err => console.warn('Error setting audio mode before listening:', err));
      
      // Short delay to ensure audio mode has applied
      setTimeout(() => {
        startListening();
      }, 200);
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
      return isSimulatedTranscription ? "Speaking... (ElevenLabs)" : "Speaking...";
    }
    return isSimulatedTranscription ? "Using device transcription" : "";
  };

  return (
    <SafeAreaView style={styles.callScreenWrapper} edges={["left", "right"]}>
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

        {/* Voice recognition info */}
        {isSimulatedTranscription && (
          <View style={styles.deviceBanner}>
            <Text style={styles.deviceText}>
              Using device transcription with ElevenLabs voice
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
            <Animatable.Text
              key={index}
              animation="fadeIn"
              style={[
                styles.transcriptText,
                transcript.isFinal
                  ? styles.finalTranscript
                  : styles.interimTranscript,
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
            style={[
              styles.callButton,
              isListening ? styles.muteButton : styles.unmuteButton,
              (!isInitialized || isSpeaking) ? styles.disabledButton : null
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              isListening ? "Stop listening" : "Start listening"
            }
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
          <TouchableOpacity
            onPress={handleEndCall}
            style={[styles.callButton, styles.endCallButton]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Hang up call"
            activeOpacity={0.7}
          >
            <Icon
              name="phone-off"
              size={54}
              color="#fff"
              style={{ alignSelf: "center" }}
            />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  callScreenWrapper: {
    flex: 1,
    backgroundColor: "#000",
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
    fontSize: 32,
    color: "#fff",
    fontWeight: "bold",
    marginTop: 48,
  },
  statusText: {
    fontSize: 24,
    color: "#fff",
    marginTop: 16,
    fontWeight: "500",
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
  transcriptText: {
    fontSize: 20,
    marginVertical: 8,
    textAlign: "center",
    color: "#fff",
  },
  interimTranscript: {
    opacity: 0.7,
  },
  finalTranscript: {
    fontWeight: "bold",
  },
  callControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingBottom: 48,
    gap: 24,
  },
  callButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6366F1",
  },
  muteButton: {
    backgroundColor: "#EF4444",
  },
  unmuteButton: {
    backgroundColor: "#10B981",
  },
  endCallButton: {
    backgroundColor: "#EF4444",
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
    backgroundColor: "#888",
  },
});

export default ChatbotCallScreen;
