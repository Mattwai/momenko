import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text } from 'react-native-paper';
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
}

const ChatbotScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile: _culturalProfile, getFamilyInvolvementGuidance } = useCulturalContext();
  const [messages] = useState<Message[]>([]);
  const [thinking] = useState(false);
  
  // Voice interface states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Accessibility preferences (could be moved to a settings context)
  const [isHighContrast, _setIsHighContrast] = useState(false);
  const [textSize, _setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');

  const handleStartListening = () => {
    setIsListening(true);
    // TODO: Integrate with actual voice recognition
    console.log('Starting voice recognition...');
    
    // Simulate listening for demo
    setTimeout(() => {
      setIsListening(false);
      setIsProcessing(true);
      
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        
        // Simulate speaking
        setTimeout(() => {
          setIsSpeaking(false);
        }, 3000);
      }, 2000);
    }, 3000);
  };

  const handleStopListening = () => {
    setIsListening(false);
    console.log('Stopping voice recognition...');
  };

  const handleEmergencyContact = () => {
    const familyGuidance = getFamilyInvolvementGuidance();
    
    Alert.alert(
      'Emergency Contact',
      `This will call your designated emergency contact. ${familyGuidance.guidance}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          onPress: () => {
            // TODO: Get actual emergency contact from user settings
            const emergencyNumber = '111'; // Default emergency number
            Linking.openURL(`tel:${emergencyNumber}`);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleTalk = () => {
    navigation.navigate('ChatbotCall');
  };

  const handleViewHistory = () => {
    navigation.navigate('ConversationHistory');
  };

  const renderChatView = () => (
    <View style={styles.chatCard}>
      <Text style={styles.sectionHeader} accessibilityRole="header">Conversations</Text>
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} accessibilityLabel="Chat transcript">
        {[...messages].sort((a, b) => Number(b.id) - Number(a.id)).map((msg, index) => (
          <Animatable.View
            key={msg.id}
            animation="fadeInUp"
            delay={index * 100}
            style={[
              styles.messageBubble,
              msg.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text style={[styles.messageText, { fontSize: 28, color: msg.isUser ? '#fff' : '#111827', lineHeight: 36 }]}>{msg.text}</Text>
          </Animatable.View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      {/* Header with Navigation Options */}
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleViewHistory}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View conversation history"
        >
          <Icon name="history" size={24} color="#6366F1" />
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>
      
      <ProgressIndicator visible={thinking} />
      
      {/* Main Voice Interface */}
      <VoiceInterface
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onEmergencyContact={handleEmergencyContact}
        isListening={isListening}
        isProcessing={isProcessing}
        isSpeaking={isSpeaking}
        isHighContrast={isHighContrast}
        textSize={textSize}
      />
      
      {/* Chat History (if there are messages) */}
      {messages.length > 0 && (
        <View style={styles.chatSection}>
          {renderChatView()}
        </View>
      )}
      
      {/* Quick Access to Full Chat */}
      <View style={styles.quickAccessContainer}>
        <TouchableOpacity
          onPress={handleTalk}
          style={styles.quickAccessButton}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Open full conversation mode"
        >
          <Icon name="chat" size={24} color="#6366F1" />
          <Text style={styles.quickAccessText}>Full Conversation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatSection: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    maxHeight: 200,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  messageBubble: {
    maxWidth: '80%',
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
    color: '#111827',
    fontSize: 18,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#3730A3',
    textAlign: 'left',
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    marginBottom: 8,
  },
  chatCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickAccessContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 5,
  },
  quickAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  quickAccessText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  historyButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChatbotScreen; 