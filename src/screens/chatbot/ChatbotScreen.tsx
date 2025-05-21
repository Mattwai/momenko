import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import AIService from '../../services/ai/AIService';
import { fetchChatHistory, addChatMessage } from '../../services/supabase/chat';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const userId = 'demo-user-id'; // Replace with real user ID from auth

const ChatbotScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setInitialLoading(true);
      const { data, error } = await fetchChatHistory(userId);
      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            text: msg.message,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
          }))
        );
      }
      setInitialLoading(false);
    };
    loadHistory();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    await addChatMessage(userId, userMessage.text, 'user');
    try {
      const botText = await AIService.generateResponse(userMessage.text) ?? '';
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      await addChatMessage(userId, botMessage.text, 'bot');
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: 'Sorry, there was an error getting a response.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      await addChatMessage(userId, errorMessage.text, 'bot');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.messageCard}>
            <Card.Content>
              <Text>{item.sender === 'user' ? 'You: ' : 'Bot: '}{item.text}</Text>
            </Card.Content>
          </Card>
        )}
      />
      {loading && <ActivityIndicator size="small" style={{ margin: 8 }} />}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          style={styles.input}
          disabled={loading}
        />
        <Button mode="contained" onPress={handleSend} disabled={loading}>
          Send
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  messageCard: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
});

export default ChatbotScreen; 