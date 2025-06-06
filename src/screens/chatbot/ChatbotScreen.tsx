import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import VoiceInterface from '../../components/ui/VoiceInterface';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCulturalContext } from '../../contexts/CulturalContext';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  culturalContext?: string;
}

const ChatbotScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile, getCulturalGreeting, getAdaptedResponse } = useCulturalContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  
  // Voice interface states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Accessibility preferences
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');
  const [showCulturalIndicators, setShowCulturalIndicators] = useState(true);

  // Initialize greeting message
  useEffect(() => {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                     new Date().getHours() < 18 ? 'afternoon' : 'evening';
    const greeting = getCulturalGreeting(timeOfDay);
    
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: greeting,
        isUser: false,
        timestamp: new Date(),
        culturalContext: 'greeting'
      };
      setMessages([welcomeMessage]);
    }
  }, [culturalProfile, getCulturalGreeting, messages.length]);

  const handleStartListening = () => {
    setIsListening(true);
    // Navigate to call screen for actual voice interaction
    navigation.navigate('ChatbotCall');
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handleTalk = () => {
    navigation.navigate('ChatbotCall');
  };

  const handleViewHistory = () => {
    navigation.navigate('ConversationHistory');
  };

  const addMessage = (text: string, isUser: boolean, culturalContext?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
      culturalContext
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleQuickResponse = (response: string) => {
    addMessage(response, true);
    setThinking(true);
    
    // Simulate AI response
    setTimeout(() => {
      const adaptedResponse = getAdaptedResponse(
        "That's wonderful to hear! Tell me more about that.",
        'casual',
        { userInput: response }
      );
      addMessage(adaptedResponse, false, 'supportive_response');
      setThinking(false);
    }, 2000);
  };

  // Get cultural theme colors
  const getCulturalColors = () => {
    const baseColors = isHighContrast ? {
      maori: { primary: '#000000', secondary: '#FFFFFF', accent: '#FF0000', background: '#FFFFFF' },
      chinese: { primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', background: '#FFFFFF' },
      western: { primary: '#000000', secondary: '#FFFFFF', accent: '#0066CC', background: '#FFFFFF' }
    } : {
      maori: { primary: '#8B4513', secondary: '#F5DEB3', accent: '#228B22', background: '#FFF8DC' },
      chinese: { primary: '#DC143C', secondary: '#FFD700', accent: '#FF6347', background: '#FFF5EE' },
      western: { primary: '#6366F1', secondary: '#E0E7FF', accent: '#8B5CF6', background: '#F9FAFB' }
    };
    
    return baseColors[culturalProfile.culturalGroup];
  };

  const colors = getCulturalColors();

  // Text size mappings
  const getTextSizes = () => ({
    small: { title: 18, body: 14, caption: 12 },
    medium: { title: 22, body: 18, caption: 14 },
    large: { title: 26, body: 22, caption: 16 },
    'extra-large': { title: 32, body: 28, caption: 20 }
  })[textSize];

  const textSizes = getTextSizes();

  const renderChatView = () => (
    <View style={[styles.chatCard, { backgroundColor: colors.background }]}>
      <Text 
        style={[
          styles.sectionHeader, 
          { 
            fontSize: textSizes.title, 
            color: colors.primary,
            backgroundColor: colors.secondary 
          }
        ]} 
        accessibilityRole="header"
      >
        Recent Conversations
      </Text>
      <ScrollView 
        style={styles.messagesContainer} 
        contentContainerStyle={styles.messagesContent} 
        accessibilityLabel="Chat transcript"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, index) => (
          <Animatable.View
            key={msg.id}
            animation="fadeInUp"
            delay={index * 100}
            style={[
              styles.messageBubble,
              msg.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text 
              style={[
                styles.messageText, 
                { 
                  fontSize: textSizes.body, 
                  color: msg.isUser ? '#FFFFFF' : colors.primary,
                  lineHeight: textSizes.body * 1.4
                }
              ]}
            >
              {msg.text}
            </Text>
            {showCulturalIndicators && msg.culturalContext && (
              <Text 
                style={[
                  styles.contextText,
                  { 
                    fontSize: textSizes.caption,
                    color: msg.isUser ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                  }
                ]}
              >
                {msg.culturalContext}
              </Text>
            )}
            <Text 
              style={[
                styles.timestampText,
                { 
                  fontSize: textSizes.caption - 2,
                  color: msg.isUser ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
                }
              ]}
            >
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Animatable.View>
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text 
        style={[
          styles.quickActionsTitle,
          { 
            fontSize: textSizes.body,
            color: colors.primary
          }
        ]}
      >
        Quick Responses
      </Text>
      <View style={styles.quickActionsGrid}>
        {[
          "I'm feeling good today",
          "I'd like to talk about my family",
          "Tell me about my health",
          "I need some support"
        ].map((response, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.quickActionButton,
              { 
                backgroundColor: isHighContrast ? colors.primary : colors.secondary,
                borderColor: colors.primary
              }
            ]}
            onPress={() => handleQuickResponse(response)}
            accessibilityRole="button"
            accessibilityLabel={`Quick response: ${response}`}
          >
            <Text 
              style={[
                styles.quickActionText,
                { 
                  fontSize: textSizes.caption,
                  color: isHighContrast ? colors.secondary : colors.primary
                }
              ]}
            >
              {response}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top","left","right"]}>
      {/* Header with Controls */}
      <View style={styles.headerSection}>
        <View style={styles.accessibilityControls}>
          <Surface style={styles.controlsPanel} elevation={2}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: isHighContrast ? colors.accent : colors.primary }]}
              onPress={() => setIsHighContrast(!isHighContrast)}
              accessibilityLabel={`Toggle high contrast mode. Currently ${isHighContrast ? 'on' : 'off'}`}
            >
              <Icon 
                name="contrast-circle" 
                size={16} 
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
                size={16} 
                color={colors.secondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: showCulturalIndicators ? colors.accent : '#9CA3AF' }]}
              onPress={() => setShowCulturalIndicators(!showCulturalIndicators)}
              accessibilityLabel={`Toggle cultural indicators. Currently ${showCulturalIndicators ? 'on' : 'off'}`}
            >
              <Icon 
                name="palette" 
                size={16} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </Surface>
        </View>
        
        <TouchableOpacity
          style={[styles.historyButton, { backgroundColor: colors.secondary, borderColor: colors.primary }]}
          onPress={handleViewHistory}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View conversation history"
        >
          <Icon name="history" size={20} color={colors.primary} />
          <Text style={[styles.historyButtonText, { fontSize: textSizes.caption, color: colors.primary }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
      
      <ProgressIndicator visible={thinking} />
      
      {/* Main Voice Interface */}
      <VoiceInterface
        onStartListening={handleTalk}
        onStopListening={handleStopListening}
        isListening={isListening}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        isHighContrast={isHighContrast}
        textSize={textSize}
        showCulturalIndicators={showCulturalIndicators}
      />
      
      {/* Quick Actions */}
      {!isListening && !isProcessing && !isSpeaking && (
        <View style={styles.bottomSection}>
          {renderQuickActions()}
        </View>
      )}
      
      {/* Chat History (if there are messages) */}
      {messages.length > 1 && (
        <View style={styles.chatSection}>
          {renderChatView()}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  accessibilityControls: {
    flex: 1,
  },
  controlsPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  historyButtonText: {
    fontWeight: '600',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  quickActionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickActionText: {
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  chatSection: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    maxHeight: 300,
  },
  chatCard: {
    borderRadius: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontWeight: 'bold',
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    borderRadius: 12,
    marginBottom: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    maxHeight: 200,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  messageText: {
    lineHeight: 20,
  },
  contextText: {
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  timestampText: {
    marginTop: 4,
    opacity: 0.6,
    textAlign: 'right',
  },
});

export default ChatbotScreen; 