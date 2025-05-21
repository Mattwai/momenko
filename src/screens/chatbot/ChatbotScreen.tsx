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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ChatbotScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
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
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <Button mode="outlined" onPress={() => navigation.navigate('CognitiveAssessment')} style={{ margin: 16 }}>
        Start Cognitive Assessment
      </Button>
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
            ]}
          >
            <LargeText> {msg.text} </LargeText>
          </Animatable.View>
        ))}
      </ScrollView>
      <View style={styles.talkButtonContainer}>
        <Button
          mode="contained"
          icon="microphone"
          onPress={handleTalk}
          style={styles.talkButton}
          labelStyle={{ fontSize: 22 }}
        >
          Talk
        </Button>
        <RepeatButton onPress={handleRepeat} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'flex-end',
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