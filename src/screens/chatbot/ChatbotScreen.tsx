import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useChat } from '../../contexts/ChatContext';

const ChatbotScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { messages, isProcessing, refreshUserSession, loadMessages } = useChat();
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Refresh user session and load messages when the screen loads
  useEffect(() => {
    const initialize = async () => {
      console.log('Initializing ChatbotScreen...');
      try {
        await refreshUserSession();
        await loadMessages();
      } catch (error) {
        console.error('Error initializing ChatbotScreen:', error);
      }
    };

    initialize();
  }, []);

  const handleTalk = () => {
    navigation.navigate('ChatbotCall');
  };

  const renderChatView = () => (
    <View style={styles.chatCard}>
      <Text style={styles.sectionHeader} accessibilityRole="header">Conversations</Text>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer} 
        contentContainerStyle={styles.messagesContent} 
        accessibilityLabel="Chat transcript"
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
            <Text style={[styles.messageText, { fontSize: 28, color: msg.isUser ? '#fff' : '#111827', lineHeight: 36 }]}>{msg.text}</Text>
          </Animatable.View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <View style={styles.headerSection}>
        <Text style={styles.greetingText}>I'm here to help you today.</Text>
      </View>
      <ProgressIndicator visible={isProcessing} />
      {renderChatView()}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          onPress={handleTalk}
          style={[styles.fab, { width: 96, height: 96, borderRadius: 48, backgroundColor: '#6366F1' }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Start call"
          activeOpacity={0.7}
        >
          <Icon name="phone" size={54} color="#fff" style={{ alignSelf: 'center' }} />
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
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
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
    fontSize: 22,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
    padding: 0,
    margin: 0,
  },
  fab: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#3730A3',
    textAlign: 'left',
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  headerSection: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 26,
    color: '#6366F1',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 0,
  },
  chatCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatbotScreen; 