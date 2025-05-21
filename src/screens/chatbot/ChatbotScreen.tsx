import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import * as Speech from 'expo-speech';
import * as Animatable from 'react-native-animatable';
import LargeText from '../../components/ui/LargeText';
import VoiceInputIndicator from '../../components/ui/VoiceInputIndicator';
import RepeatButton from '../../components/ui/RepeatButton';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import ActivityPrompt from '../../components/ui/ActivityPrompt';
import PersonalizedGreeting from '../../components/ui/PersonalizedGreeting';
import AccessibilitySettings from '../../components/ui/AccessibilitySettings';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ChatbotScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [lastBotMessage, setLastBotMessage] = useState('');
  const userName = 'Alex'; // Simulated user name
  const activityPrompt = 'What is your favorite childhood memory?'; // Simulated prompt

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
    };
    setMessages(prev => [...prev, newMessage]);
    setThinking(true);
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'That sounds wonderful! Can you tell me more?',
        isUser: false,
      };
      setMessages(prev => [...prev, aiResponse]);
      setLastBotMessage(aiResponse.text);
      setThinking(false);
      Speech.speak(aiResponse.text, { language: 'en' });
    }, 1200);
  };

  // Placeholder for voice input
  const handleTalk = () => {
    setListening(true);
    setTimeout(() => {
      setListening(false);
      handleSend('Hello, chatbot! (voice input placeholder)');
    }, 1800);
  };

  const handleRepeat = () => {
    if (lastBotMessage) {
      Speech.speak(lastBotMessage, { language: 'en' });
    }
  };

  return (
    <View style={[styles.container, highContrast && styles.highContrastBg]}>
      <AccessibilitySettings
        highContrast={highContrast}
        largeText={largeText}
        onToggleHighContrast={() => setHighContrast(h => !h)}
        onToggleLargeText={() => setLargeText(l => !l)}
      />
      <PersonalizedGreeting name={userName} />
      <ActivityPrompt prompt={activityPrompt} />
      <View style={styles.topButtons}>
        {/* Remove EmergencyContactButton and FamilyContactButton from the topButtons section */}
      </View>
      <VoiceInputIndicator active={listening} />
      <ProgressIndicator visible={thinking} />
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg, index) => (
          <Animatable.View
            key={msg.id}
            animation="fadeInUp"
            delay={index * 100}
            style={[
              styles.messageBubble,
              msg.isUser ? styles.userMessage : styles.aiMessage,
              highContrast && styles.highContrastBubble,
            ]}
          >
            <LargeText style={[largeText && { fontSize: 24 }, highContrast && { color: '#fff' }]}> {msg.text} </LargeText>
          </Animatable.View>
        ))}
      </ScrollView>
      <View style={styles.talkButtonContainer}>
        <Button
          mode="contained"
          icon="microphone"
          onPress={handleTalk}
          style={[styles.talkButton, highContrast && { backgroundColor: '#000' }]}
          labelStyle={{ fontSize: largeText ? 22 : 18 }}
        >
          Talk
        </Button>
        <RepeatButton onPress={handleRepeat} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'flex-end',
  },
  highContrastBg: {
    backgroundColor: '#000',
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
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
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366F1',
    color: '#fff',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    color: '#111827',
  },
  highContrastBubble: {
    backgroundColor: '#222',
  },
  talkButtonContainer: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  talkButton: {
    width: 180,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    marginBottom: 8,
  },
});

export default ChatbotScreen; 