import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Avatar, Button } from 'react-native-paper';
import * as Speech from 'expo-speech';
import * as Animatable from 'react-native-animatable';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ChatbotScreen = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
    };
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated AI response.',
        isUser: false,
      };
      Speech.speak(aiResponse.text, { language: 'en' });
    }, 1000);
  };

  // Placeholder for voice input
  const handleTalk = () => {
    // In a real app, integrate speech-to-text here
    handleSend('Hello, chatbot! (voice input placeholder)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Avatar.Icon size={96} icon="robot" style={{ backgroundColor: theme.colors.primary }} />
        <Text style={styles.callingText}>Talking to Momenko AI...</Text>
      </View>
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
            <Text style={styles.messageText}>{msg.text}</Text>
          </Animatable.View>
        ))}
      </ScrollView>
      <View style={styles.talkButtonContainer}>
        <Button
          mode="contained"
          icon="microphone"
          onPress={handleTalk}
          style={styles.talkButton}
          labelStyle={{ fontSize: 18 }}
        >
          Talk
        </Button>
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
  avatarContainer: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 16,
  },
  callingText: {
    marginTop: 12,
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
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
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
  },
  messageText: {
    color: '#1F2937',
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
  },
});

export default ChatbotScreen; 