import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ConversationHistory from '../../components/ui/ConversationHistory';
import { useCulturalContext } from '../../contexts/CulturalContext';
import { RootStackParamList } from '../../../App';

interface ConversationMessage {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  culturalContext?: string;
  emotions?: string[];
  language: 'en' | 'mi' | 'zh';
}

interface ConversationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  culturalProfile: string;
  summary?: string;
  tags?: string[];
}

const ConversationHistoryScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile } = useCulturalContext();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    // TODO: Load from actual storage/database
    // For now, create sample data
    const sampleSessions: ConversationSession[] = [
      {
        id: '1',
        startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000), // 15 minutes later
        culturalProfile: culturalProfile.culturalGroup,
        summary: 'Discussed daily activities and shared memories about gardening',
        messages: [
          {
            id: 'm1',
            content: culturalProfile.culturalGroup === 'maori' ? 'Kia ora! Pēhea koe i tēnei rā?' : 
                     culturalProfile.culturalGroup === 'chinese' ? '您好！今天过得怎么样？' : 
                     'Hello! How are you feeling today?',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            isUser: false,
            culturalContext: 'respectful greeting',
            language: culturalProfile.preferredLanguage
          },
          {
            id: 'm2',
            content: 'I\'m doing well, thank you. I was just thinking about my garden.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000),
            isUser: true,
            language: 'en'
          },
          {
            id: 'm3',
            content: 'That sounds wonderful! Tell me more about your garden. What do you like to grow?',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000),
            isUser: false,
            culturalContext: 'encouraging engagement',
            language: culturalProfile.preferredLanguage
          }
        ]
      },
      {
        id: '2',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
        culturalProfile: culturalProfile.culturalGroup,
        summary: 'Talked about family memories and upcoming celebrations',
        messages: [
          {
            id: 'm4',
            content: culturalProfile.culturalGroup === 'maori' ? 'Kia ora anō! He aha ngā kōrero mō tō whānau?' : 
                     culturalProfile.culturalGroup === 'chinese' ? '您好！想聊聊家人吗？' : 
                     'Good morning! Would you like to talk about your family?',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            isUser: false,
            culturalContext: 'family-centered conversation',
            language: culturalProfile.preferredLanguage
          },
          {
            id: 'm5',
            content: 'Yes, my granddaughter is visiting next week. I\'m so excited!',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000),
            isUser: true,
            language: 'en'
          }
        ]
      }
    ];

    setSessions(sampleSessions);
  };

  const handleSessionSelect = (session: ConversationSession) => {
    Alert.alert(
      'Session Details',
      `Conversation from ${session.startTime.toLocaleDateString()}\n\n${session.summary}`,
      [{ text: 'OK' }]
    );
  };

  const handleExportSession = async (session: ConversationSession) => {
    try {
      // TODO: Implement actual export functionality
      const exportData = {
        sessionId: session.id,
        date: session.startTime.toISOString(),
        duration: session.endTime ? 
          Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) : 0,
        messageCount: session.messages.length,
        summary: session.summary,
        culturalProfile: session.culturalProfile,
        messages: session.messages.map(m => ({
          timestamp: m.timestamp.toISOString(),
          speaker: m.isUser ? 'User' : 'Assistant',
          content: m.content,
          language: m.language,
          culturalContext: m.culturalContext
        }))
      };

      Alert.alert(
        'Export Successful',
        'Conversation has been prepared for your healthcare provider. The export includes:\n\n' +
        `• Session summary\n• ${session.messages.length} messages\n• Cultural context notes\n• ${Math.round((session.endTime?.getTime() || Date.now() - session.startTime.getTime()) / (1000 * 60))} minute duration`,
        [{ text: 'OK' }]
      );

      console.log('Export data:', JSON.stringify(exportData, null, 2));
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export conversation. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleShareWithFamily = async (session: ConversationSession) => {
    try {
      // TODO: Implement actual sharing functionality
      Alert.alert(
        'Share with Family',
        `Share conversation from ${session.startTime.toLocaleDateString()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => {
              Alert.alert(
                'Shared Successfully',
                'Conversation has been shared with your family members according to your privacy preferences.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Sharing Error', 'Failed to share conversation. Please try again.');
      console.error('Sharing error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="Conversation History" 
          titleStyle={{ fontSize: textSize === 'extra-large' ? 24 : textSize === 'large' ? 20 : 18 }}
        />
        <Appbar.Action 
          icon="cog" 
          onPress={() => {
            // TODO: Navigate to settings or show settings modal
            Alert.alert('Settings', 'Settings will be available in the next update.');
          }} 
        />
      </Appbar.Header>

      <ConversationHistory
        sessions={sessions}
        onSessionSelect={handleSessionSelect}
        onExportSession={handleExportSession}
        onShareWithFamily={handleShareWithFamily}
        isHighContrast={isHighContrast}
        textSize={textSize}
        showCulturalIndicators={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default ConversationHistoryScreen;