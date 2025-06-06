import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native';
import { Text, Surface, Portal, Modal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';
import { useCulturalContext } from '../../contexts/CulturalContext';

interface VoiceInterfaceProps {
  onStartListening: () => void;
  onStopListening?: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isHighContrast?: boolean;
  textSize?: 'small' | 'medium' | 'large' | 'extra-large';
  showCulturalIndicators?: boolean;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onStartListening,
  onStopListening,
  isListening,
  isProcessing,
  isSpeaking,
  isHighContrast = false,
  textSize = 'large',
  showCulturalIndicators = true
}) => {
  const { culturalProfile, getCulturalGreeting } = useCulturalContext();
  const [greeting, setGreeting] = useState('');
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnimations = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.7),
    new Animated.Value(0.4),
    new Animated.Value(0.6)
  ]).current;

  // Determine current conversation state
  const conversationState: ConversationState = 
    isSpeaking ? 'speaking' : 
    isProcessing ? 'processing' : 
    isListening ? 'listening' : 'idle';

  // Cultural theme colors
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
    small: { title: 24, body: 18, button: 16 },
    medium: { title: 28, body: 22, button: 20 },
    large: { title: 32, body: 26, button: 24 },
    'extra-large': { title: 40, body: 32, button: 28 }
  })[textSize];

  const textSizes = getTextSizes();

  // Initialize greeting
  useEffect(() => {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                     new Date().getHours() < 18 ? 'afternoon' : 'evening';
    setGreeting(getCulturalGreeting(timeOfDay));
  }, [culturalProfile]);

  // Listening pulse animation
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Speaking wave animation
  useEffect(() => {
    if (isSpeaking) {
      const animations = waveAnimations.map((anim: Animated.Value, index: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400 + (index * 100),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400 + (index * 100),
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      animations.forEach((anim: Animated.CompositeAnimation) => anim.start());
      return () => animations.forEach((anim: Animated.CompositeAnimation) => anim.stop());
    }
  }, [isSpeaking]);

  const handleMainButtonPress = () => {
    // Haptic feedback for accessibility
    Vibration.vibrate(50);
    
    if (isListening) {
      onStopListening?.();
    } else {
      onStartListening();
    }
  };

  const getMainButtonIcon = () => {
    switch (conversationState) {
      case 'listening': return 'microphone';
      case 'processing': return 'brain';
      case 'speaking': return 'account-voice';
      default: return 'microphone-outline';
    }
  };

  const getStateText = () => {
    const stateTexts = {
      maori: {
        idle: 'Tēnā koe - Pēhea koe?',
        listening: 'Kei te whakarongo...',
        processing: 'Kei te whakaaroaro...',
        speaking: 'Kei te kōrero...'
      },
      chinese: {
        idle: '您好 - 我在这里倾听',
        listening: '正在聆听...',
        processing: '正在思考...',
        speaking: '正在说话...'
      },
      western: {
        idle: 'Ready to Listen',
        listening: 'Listening...',
        processing: 'Processing...',
        speaking: 'Speaking...'
      }
    };
    
    return stateTexts[culturalProfile.culturalGroup][conversationState];
  };

  const renderProcessingIndicator = () => {
    if (!isProcessing) return null;

    const ProcessingComponent = showCulturalIndicators ? (
      culturalProfile.culturalGroup === 'maori' ? 
        // Koru spiral for Māori
        <Animatable.View animation="rotate" iterationCount="infinite" duration={2000}>
          <Icon name="spiral" size={60} color={colors.primary} />
        </Animatable.View> :
        culturalProfile.culturalGroup === 'chinese' ?
        // Yin-yang for Chinese
        <Animatable.View animation="rotate" iterationCount="infinite" duration={1500}>
          <Icon name="yin-yang" size={60} color={colors.primary} />
        </Animatable.View> :
        // Gear for Western
        <Animatable.View animation="rotate" iterationCount="infinite" duration={1000}>
          <Icon name="cog" size={60} color={colors.primary} />
        </Animatable.View>
    ) : (
      <Animatable.View animation="rotate" iterationCount="infinite" duration={1000}>
        <Icon name="brain" size={60} color={colors.primary} />
      </Animatable.View>
    );

    return (
      <View style={styles.processingContainer}>
        {ProcessingComponent}
      </View>
    );
  };

  const renderSpeakingWaves = () => {
    if (!isSpeaking) return null;

    return (
      <View style={styles.waveContainer}>
        {waveAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.wave,
              {
                backgroundColor: colors.primary,
                transform: [{ scaleY: anim }],
                marginHorizontal: 2,
              }
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isHighContrast ? '#000000' : colors.secondary }]}>
      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text 
          style={[
            styles.greetingText, 
            { 
              fontSize: textSizes.title, 
              color: isHighContrast ? '#FFFFFF' : colors.primary 
            }
          ]}
          accessibilityRole="header"
          accessibilityLabel={`Cultural greeting: ${greeting}`}
        >
          {greeting}
        </Text>
      </View>

      {/* State Indicator */}
      <View style={styles.stateContainer}>
        <Text 
          style={[
            styles.stateText, 
            { 
              fontSize: textSizes.body, 
              color: isHighContrast ? '#FFFFFF' : colors.primary 
            }
          ]}
          accessibilityLabel={`Current state: ${getStateText()}`}
        >
          {getStateText()}
        </Text>
        
        {renderProcessingIndicator()}
        {renderSpeakingWaves()}
      </View>

      {/* Main Voice Button */}
      <Surface 
        style={[
          styles.mainButtonContainer, 
          { backgroundColor: isHighContrast ? '#FFFFFF' : colors.primary }
        ]}
        elevation={5}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { 
                backgroundColor: isListening 
                  ? (isHighContrast ? '#FF0000' : '#EF4444')
                  : (isHighContrast ? '#000000' : colors.primary)
              }
            ]}
            onPress={handleMainButtonPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop listening' : 'Start conversation'}
            accessibilityHint="Tap to start or stop voice conversation"
          >
            <Icon 
              name={getMainButtonIcon()} 
              size={80} 
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>
      </Surface>

      {/* Conversation Instructions */}
      <View style={styles.instructionsContainer}>
        <Text 
          style={[
            styles.instructionsText, 
            { 
              fontSize: textSizes.body,
              color: isHighContrast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'
            }
          ]}
          accessibilityRole="text"
        >
          {isListening ? 'Speak naturally - I\'m listening' : 
           isSpeaking ? 'Please wait while I respond' :
           isProcessing ? 'Processing your message...' :
           'Tap the button to start our conversation'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  greetingContainer: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
  },
  greetingText: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  stateContainer: {
    position: 'absolute',
    top: 140,
    alignItems: 'center',
    minHeight: 100,
  },
  stateText: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  processingContainer: {
    marginTop: 10,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginTop: 10,
  },
  wave: {
    width: 8,
    height: 40,
    borderRadius: 4,
  },
  mainButtonContainer: {
    borderRadius: 100,
    padding: 8,
  },
  mainButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionsText: {
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.9,
  },
});

export default VoiceInterface;