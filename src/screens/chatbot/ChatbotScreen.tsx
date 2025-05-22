import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import ActivityPrompt from '../../components/ui/ActivityPrompt';
import PersonalizedGreeting from '../../components/ui/PersonalizedGreeting';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

const ChatbotScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [messages] = useState<Message[]>([]);
  const [thinking] = useState(false);
  const userName = 'Alex'; // Simulated user name
  const activityPrompt = 'What is your favorite childhood memory?'; // Simulated prompt

  const handleTalk = () => {
    navigation.navigate('ChatbotCall');
  };

  const renderChatView = () => (
    <>
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} accessibilityLabel="Chat transcript">
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
            <Text style={[styles.messageText, { fontSize: 26, color: msg.isUser ? '#fff' : '#111827' }]}>{msg.text}</Text>
          </Animatable.View>
        ))}
      </ScrollView>
      <View style={styles.talkButtonContainer}>
        <Button
          mode="contained"
          icon="phone"
          onPress={handleTalk}
          style={styles.talkButton}
          labelStyle={{ fontSize: 32 }}
          accessibilityLabel="Start call"
        >
          Call
        </Button>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <Button mode="outlined" onPress={() => navigation.navigate('CognitiveAssessment')} style={{ margin: 16 }} labelStyle={{ fontSize: 22 }}>
        Start Cognitive Assessment
      </Button>
      <PersonalizedGreeting name={userName} />
      <ActivityPrompt prompt={activityPrompt} />
      <ProgressIndicator visible={thinking} />
      {renderChatView()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  talkButtonContainer: {
    padding: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  talkButton: {
    width: 220,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    marginBottom: 8,
  },
});

export default ChatbotScreen; 