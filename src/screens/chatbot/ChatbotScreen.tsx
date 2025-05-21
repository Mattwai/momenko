import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, useTheme } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ChatbotScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const theme = useTheme();

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'This is a simulated AI response.',
        isUser: false,
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
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
            <Text style={styles.messageText}>{msg.text}</Text>
          </Animatable.View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          style={styles.input}
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSend}
              disabled={!message.trim()}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
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
  inputContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    backgroundColor: 'white',
  },
});

export default ChatbotScreen; 