import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity as _TouchableOpacity, Alert } from 'react-native';
import { Text, Appbar, SegmentedButtons, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import VoiceInterface from '../../components/ui/VoiceInterface';
import ConversationHistory from '../../components/ui/ConversationHistory';
import SettingsPreferences from '../../components/ui/SettingsPreferences';
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

const Phase4UIDemo = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile, setPreferredLanguage } = useCulturalContext();
  
  const [activeTab, setActiveTab] = useState('voice');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');
  
  // Voice interface demo states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Sample conversation data
  const sampleSessions: ConversationSession[] = [
    {
      id: '1',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
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
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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

  const handleStartListening = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        setTimeout(() => {
          setIsSpeaking(false);
        }, 3000);
      }, 2000);
    }, 3000);
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const handleEmergencyContact = () => {
    Alert.alert(
      'Emergency Contact Demo',
      'This would call your emergency contact in a real app.',
      [{ text: 'OK' }]
    );
  };

  const handleSessionSelect = (session: ConversationSession) => {
    Alert.alert(
      'Session Selected',
      `Session from ${session.startTime.toLocaleDateString()}\n\n${session.summary}`,
      [{ text: 'OK' }]
    );
  };

  const handleExportSession = (session: ConversationSession) => {
    Alert.alert(
      'Export Demo',
      `This would export the conversation from ${session.startTime.toLocaleDateString()} for healthcare providers.`,
      [{ text: 'OK' }]
    );
  };

  const handleShareWithFamily = (session: ConversationSession) => {
    Alert.alert(
      'Share Demo',
      `This would share the conversation from ${session.startTime.toLocaleDateString()} with family members according to cultural privacy norms.`,
      [{ text: 'OK' }]
    );
  };

  const handleSettingsChange = (settings: { isHighContrast?: boolean; textSize?: 'small' | 'medium' | 'large' | 'extra-large' }) => {
    console.log('Settings changed:', settings);
    if (settings.isHighContrast !== undefined) {
      setIsHighContrast(settings.isHighContrast);
    }
    if (settings.textSize !== undefined) {
      setTextSize(settings.textSize);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'voice':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.sectionTitle, { fontSize: textSize === 'extra-large' ? 24 : 20 }]}>
              Voice Interface Demo
            </Text>
            <Text style={[styles.description, { fontSize: textSize === 'extra-large' ? 18 : 14 }]}>
              Experience the culturally-adaptive voice interface with accessibility features.
            </Text>
            <View style={styles.voiceContainer}>
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
            </View>
          </View>
        );
      
      case 'history':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.sectionTitle, { fontSize: textSize === 'extra-large' ? 24 : 20 }]}>
              Conversation History Demo
            </Text>
            <Text style={[styles.description, { fontSize: textSize === 'extra-large' ? 18 : 14 }]}>
              Browse conversation history with cultural sensitivity and family sharing options.
            </Text>
            <ConversationHistory
              sessions={sampleSessions}
              onSessionSelect={handleSessionSelect}
              onExportSession={handleExportSession}
              onShareWithFamily={handleShareWithFamily}
              isHighContrast={isHighContrast}
              textSize={textSize}
              showCulturalIndicators={true}
            />
          </View>
        );
      
      case 'settings':
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.sectionTitle, { fontSize: textSize === 'extra-large' ? 24 : 20 }]}>
              Settings & Preferences Demo
            </Text>
            <Text style={[styles.description, { fontSize: textSize === 'extra-large' ? 18 : 14 }]}>
              Customize cultural profiles, accessibility options, and privacy settings.
            </Text>
            <SettingsPreferences
              isHighContrast={isHighContrast}
              textSize={textSize}
              onSettingsChange={handleSettingsChange}
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="Phase 4: UI & Experience" 
          titleStyle={{ fontSize: textSize === 'extra-large' ? 20 : 16 }}
        />
      </Appbar.Header>

      {/* Quick Controls */}
      <Surface style={styles.controlsSection} elevation={1}>
        <Text style={[styles.controlsTitle, { fontSize: textSize === 'extra-large' ? 18 : 14 }]}>
          Demo Controls
        </Text>
        <View style={styles.controlsRow}>
          <Button
            mode={isHighContrast ? 'contained' : 'outlined'}
            onPress={() => setIsHighContrast(!isHighContrast)}
            style={styles.controlButton}
            labelStyle={{ fontSize: textSize === 'extra-large' ? 16 : 12 }}
          >
            High Contrast: {isHighContrast ? 'ON' : 'OFF'}
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              const sizes: Array<'small' | 'medium' | 'large' | 'extra-large'> = ['small', 'medium', 'large', 'extra-large'];
              const currentIndex = sizes.indexOf(textSize);
              const nextIndex = (currentIndex + 1) % sizes.length;
              setTextSize(sizes[nextIndex]);
            }}
            style={styles.controlButton}
            labelStyle={{ fontSize: textSize === 'extra-large' ? 16 : 12 }}
          >
            Text: {textSize.toUpperCase()}
          </Button>
        </View>
        <View style={styles.cultureButtons}>
          <Button
            mode={culturalProfile.culturalGroup === 'maori' ? 'contained' : 'outlined'}
            onPress={() => setPreferredLanguage('mi')}
            style={styles.cultureButton}
            labelStyle={{ fontSize: textSize === 'extra-large' ? 14 : 10 }}
          >
            Māori
          </Button>
          <Button
            mode={culturalProfile.culturalGroup === 'chinese' ? 'contained' : 'outlined'}
            onPress={() => setPreferredLanguage('zh')}
            style={styles.cultureButton}
            labelStyle={{ fontSize: textSize === 'extra-large' ? 14 : 10 }}
          >
            Chinese
          </Button>
          <Button
            mode={culturalProfile.culturalGroup === 'western' ? 'contained' : 'outlined'}
            onPress={() => setPreferredLanguage('en')}
            style={styles.cultureButton}
            labelStyle={{ fontSize: textSize === 'extra-large' ? 14 : 10 }}
          >
            Western
          </Button>
        </View>
      </Surface>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'voice',
              label: 'Voice Interface',
              style: { flex: 1 }
            },
            {
              value: 'history',
              label: 'History',
              style: { flex: 1 }
            },
            {
              value: 'settings',
              label: 'Settings',
              style: { flex: 1 }
            }
          ]}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  controlsSection: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  controlsTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
  },
  cultureButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cultureButton: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  voiceContainer: {
    height: 500,
    marginBottom: 20,
  },
});

export default Phase4UIDemo;