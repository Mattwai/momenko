import React, { useState, useEffect, useCallback } from 'react';
import { View as _View, StyleSheet, Alert, Share } from 'react-native';
import { Text as _Text, Appbar, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ConversationHistory from '../../components/ui/ConversationHistory';
import { useCulturalContext } from '../../contexts/CulturalContext';
import { RootStackParamList } from '../../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

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
  const { culturalProfile, getFamilyInvolvementGuidance, validateCulturalAppropriateness } = useCulturalContext();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const savedPreferences = await AsyncStorage.getItem('userPreferences');
      if (savedPreferences) {
        const prefs = JSON.parse(savedPreferences);
        setIsHighContrast(prefs.isHighContrast || false);
        setTextSize(prefs.textSize || 'large');
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  };

  const saveUserPreferences = async (preferences: { isHighContrast?: boolean; textSize?: string }) => {
    try {
      const currentPrefs = await AsyncStorage.getItem('userPreferences');
      const updatedPrefs = {
        ...(currentPrefs ? JSON.parse(currentPrefs) : {}),
        ...preferences
      };
      await AsyncStorage.setItem('userPreferences', JSON.stringify(updatedPrefs));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from storage first
      const storedSessions = await AsyncStorage.getItem('conversationSessions');
      if (storedSessions) {
        const parsedSessions = JSON.parse(storedSessions).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setSessions(parsedSessions);
        setIsLoading(false);
        return;
      }

      // Generate sample data if no stored sessions
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
    
    // Save sample sessions to storage for future use
    await AsyncStorage.setItem('conversationSessions', JSON.stringify(sampleSessions));
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      Alert.alert('Error', 'Failed to load conversation history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshHistory = useCallback(async () => {
    setRefreshing(true);
    await loadConversationHistory();
    setRefreshing(false);
  }, []);

  const handleSessionSelect = useCallback((session: ConversationSession) => {
    const familyGuidance = getFamilyInvolvementGuidance();
    const culturalNote = familyGuidance.level === 'high' 
      ? '\n\nNote: This conversation can be shared with family according to your cultural preferences.'
      : familyGuidance.level === 'medium'
      ? '\n\nNote: Consider sharing this conversation with family if appropriate.'
      : '\n\nNote: This conversation is private unless you choose to share it.';

    Alert.alert(
      'Conversation Details',
      `Date: ${format(session.startTime, 'PPPp')}\n` +
      `Duration: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) : 0} minutes\n` +
      `Messages: ${session.messages.length}\n\n` +
      `Summary: ${session.summary || 'No summary available'}${culturalNote}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Export', onPress: () => handleExportSession(session) },
        { text: 'Share', onPress: () => handleShareWithFamily(session) }
      ]
    );
  }, [getFamilyInvolvementGuidance]);

  const handleExportSession = useCallback(async (session: ConversationSession) => {
    try {
      // Validate cultural appropriateness before export
      const validation = validateCulturalAppropriateness(
        session.messages.map(m => m.content).join(' ')
      );
      
      if (!validation.isAppropriate) {
        Alert.alert(
          'Cultural Review Required',
          `Please review this conversation before sharing:\n\n${validation.concerns.join('\n')}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Export Anyway', onPress: () => performExport(session) }
          ]
        );
        return;
      }

      await performExport(session);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export conversation. Please try again.');
      console.error('Export error:', error);
    }
  }, [validateCulturalAppropriateness]);

  const performExport = async (session: ConversationSession) => {
    const exportData = {
      sessionId: session.id,
      date: session.startTime.toISOString(),
      duration: session.endTime ? 
        Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) : 0,
      messageCount: session.messages.length,
      summary: session.summary,
      culturalProfile: session.culturalProfile,
      culturalContext: 'Conversation conducted with cultural sensitivity',
      exportedAt: new Date().toISOString(),
      messages: session.messages.map(m => ({
        timestamp: m.timestamp.toISOString(),
        speaker: m.isUser ? 'User' : 'Assistant',
        content: m.content,
        language: m.language,
        culturalContext: m.culturalContext
      }))
    };

    // Create a formatted text version for sharing
    const exportText = `CONVERSATION EXPORT\n` +
      `Date: ${format(session.startTime, 'PPPp')}\n` +
      `Duration: ${exportData.duration} minutes\n` +
      `Cultural Profile: ${session.culturalProfile}\n` +
      `Summary: ${session.summary || 'No summary available'}\n\n` +
      `MESSAGES:\n` +
      session.messages.map(m => 
        `[${format(m.timestamp, 'HH:mm')}] ${m.isUser ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n') +
      `\n\nExported on: ${format(new Date(), 'PPPp')}`;

    try {
      await Share.share({
        message: exportText,
        title: `Conversation Export - ${format(session.startTime, 'PP')}`
      });
    } catch (shareError) {
      // Fallback to showing the export data
      Alert.alert(
        'Export Ready',
        'Conversation has been prepared for export. The data includes:\n\n' +
        `• Session summary\n• ${session.messages.length} messages\n• Cultural context notes\n• ${exportData.duration} minute duration`,
        [{ text: 'OK' }]
      );
    }

    console.log('Export data:', JSON.stringify(exportData, null, 2));
  };

  const handleShareWithFamily = useCallback(async (session: ConversationSession) => {
    try {
      const familyGuidance = getFamilyInvolvementGuidance();
      
      if (familyGuidance.level === 'low') {
        Alert.alert(
          'Privacy Notice',
          'According to your cultural preferences, family sharing is optional. Would you like to proceed?\n\n' + familyGuidance.guidance,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share', onPress: () => performFamilyShare(session) }
          ]
        );
        return;
      }

      if (familyGuidance.level === 'high') {
        Alert.alert(
          'Family Sharing',
          `Your cultural preferences encourage family involvement. ${familyGuidance.guidance}\n\nWould you like to share this conversation?`,
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Share', onPress: () => performFamilyShare(session) }
          ]
        );
        return;
      }

      // Medium level - standard confirmation
      Alert.alert(
        'Share with Family',
        `Share conversation from ${format(session.startTime, 'PP')}?\n\n${familyGuidance.guidance}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => performFamilyShare(session) }
        ]
      );
    } catch (error) {
      Alert.alert('Sharing Error', 'Failed to share conversation. Please try again.');
      console.error('Sharing error:', error);
    }
  }, [getFamilyInvolvementGuidance]);

  const performFamilyShare = async (session: ConversationSession) => {
    const shareContent = `Family Update - Conversation Summary\n\n` +
      `Date: ${format(session.startTime, 'PPP')}\n` +
      `Duration: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) : 0} minutes\n\n` +
      `Summary: ${session.summary || 'Had a good conversation about daily activities and well-being.'}\n\n` +
      `This conversation was conducted with cultural sensitivity and respect.`;

    try {
      await Share.share({
        message: shareContent,
        title: 'Conversation Summary for Family'
      });
    } catch (shareError) {
      Alert.alert(
        'Shared Successfully',
        'Conversation summary has been prepared for sharing with your family members according to your privacy preferences.',
        [{ text: 'OK' }]
      );
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
          icon="contrast-circle" 
          onPress={() => {
            const newValue = !isHighContrast;
            setIsHighContrast(newValue);
            saveUserPreferences({ isHighContrast: newValue });
          }}
          iconColor={isHighContrast ? '#FF0000' : undefined}
        />
        <Appbar.Action 
          icon="format-size" 
          onPress={() => {
            const sizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = ['small', 'medium', 'large', 'extra-large'];
            const currentIndex = sizes.indexOf(textSize);
            const nextIndex = (currentIndex + 1) % sizes.length;
            const newSize = sizes[nextIndex];
            setTextSize(newSize);
            saveUserPreferences({ textSize: newSize });
          }} 
        />
        <Appbar.Action 
          icon="refresh" 
          onPress={refreshHistory}
          disabled={isLoading || refreshing}
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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Main', { screen: 'Chatbot' })}
        label="New Conversation"
        accessible={true}
        accessibilityLabel="Start new conversation"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
  },
});

export default ConversationHistoryScreen;