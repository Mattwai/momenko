import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useCulturalContext } from '../contexts/CulturalContext';
import { useConversationState } from '../hooks/useConversationState';
import { CulturalGroup, ConversationContext, EmotionalState } from '../types';
import { getCulturalServices } from '../services/cultural';

export const CulturalIntelligenceDemo: React.FC = () => {
  const [selectedCulture, setSelectedCulture] = useState<CulturalGroup>('western');
  const [testMessage, setTestMessage] = useState<string>('How are you feeling today?');
  const [conversationInput, setConversationInput] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<ConversationContext>('casual');
  const [detectionHistory, setDetectionHistory] = useState<string[]>([
    'Hello, how are you?',
    'I would like to discuss my family',
    'Thank you for your help'
  ]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  const detectionInputRef = useRef<TextInput>(null);

  const {
    culturalProfile,
    setPreferredLanguage,
    getAdaptedResponse,
    getCulturalGreeting,
    getFamilyInvolvementGuidance,
    adaptTerminology,
    detectCulturalPreferences,
    warmSpeechCache,
    getCachedPhrase,
    validateCulturalAppropriateness,
    getStigmaHandlingStrategy,
    isLoading,
    error
  } = useCulturalContext();

  const {
    conversationState,
    startConversation,
    endConversation,
    addMessage,
    setConversationContext,
    getAdaptedResponse: getConversationAdaptedResponse,
    getCulturallyAppropriateGreeting,
    getFamilyInvolvementGuidance: getConversationFamilyGuidance,
    checkFamilyInvolvementRequirement,
    shouldShareInformation,
    getPrivacyGuidance,
    getConversationSummary
  } = useConversationState('demo_user');

  useEffect(() => {
    loadCacheStatistics();
  }, []);

  const loadCacheStatistics = async () => {
    const services = getCulturalServices();
    const stats = services.speechCache.getCacheStatistics();
    setCacheStats(stats);
  };

  const handleCultureChange = (culture: CulturalGroup) => {
    setSelectedCulture(culture);
    const language = culture === 'maori' ? 'mi' : culture === 'chinese' ? 'zh' : 'en';
    setPreferredLanguage(language);
  };

  const testCulturalAdaptation = () => {
    const adapted = getAdaptedResponse(testMessage, currentContext, { name: 'User' });
    const terminology = adaptTerminology(testMessage);
    const appropriateness = validateCulturalAppropriateness(testMessage);
    
    Alert.alert(
      'Cultural Adaptation Results',
      `Original: ${testMessage}\n\nAdapted: ${adapted}\n\nTerminology: ${terminology}\n\nAppropriate: ${appropriateness.isAppropriate ? 'Yes' : 'No'}\n\nConcerns: ${appropriateness.concerns.join(', ')}`
    );
  };

  const testGreetings = async () => {
    const greeting = getCulturalGreeting();
    const timeBasedGreeting = getCulturalGreeting('morning');
    
    Alert.alert(
      'Cultural Greetings',
      `General: ${greeting}\n\nMorning: ${timeBasedGreeting}`
    );
  };

  const testFamilyGuidance = () => {
    const guidance = getFamilyInvolvementGuidance();
    const stigmaStrategy = getStigmaHandlingStrategy();
    
    Alert.alert(
      'Family Involvement Guidance',
      `Level: ${guidance.level}\n\nGuidance: ${guidance.guidance}\n\nStigma Strategy:\n- Directness: ${stigmaStrategy.directness}\n- Family Involvement: ${stigmaStrategy.familyInvolvement}\n- Terminology: ${stigmaStrategy.terminologyPreference}`
    );
  };

  const testCulturalDetection = async () => {
    const languageUsage = { en: 10, mi: 2, zh: 0 };
    const detected = await detectCulturalPreferences(detectionHistory, languageUsage);
    
    Alert.alert(
      'Cultural Detection',
      `Detected Cultural Group: ${detected}\n\nBased on conversation history:\n${detectionHistory.join('\n')}`
    );
  };

  const testCacheWarming = async () => {
    await warmSpeechCache();
    await loadCacheStatistics();
    Alert.alert('Cache Warming', 'Speech cache has been warmed for current cultural profile');
  };

  const testCachedPhrase = async () => {
    const cached = await getCachedPhrase(testMessage, currentContext);
    
    Alert.alert(
      'Cached Phrase Check',
      cached 
        ? `Found cached phrase:\nID: ${cached.id}\nUse Count: ${cached.useCount}\nLast Used: ${cached.lastUsed}`
        : 'No cached phrase found for this content'
    );
  };

  const startConversationDemo = async () => {
    await startConversation(culturalProfile);
    Alert.alert('Conversation Started', 'Culturally-aware conversation has been initiated');
  };

  const addTestMessage = async () => {
    if (!conversationInput.trim()) return;
    
    await addMessage(conversationInput, 'user', {
      context: currentContext,
      emotionalState: 'neutral'
    });
    
    // Get culturally appropriate response
    const response = await getConversationAdaptedResponse(
      `Thank you for sharing. I understand you said: "${conversationInput}"`,
      { userMessage: conversationInput }
    );
    
    await addMessage(response, 'assistant', {
      context: currentContext,
      emotionalState: 'happy'
    });
    
    setConversationInput('');
  };

  const testPrivacyFeatures = () => {
    const medicalShare = shouldShareInformation('medical');
    const personalShare = shouldShareInformation('personal');
    const familyShare = shouldShareInformation('family');
    const privacyGuidance = getPrivacyGuidance();
    const familyRequired = checkFamilyInvolvementRequirement();
    
    Alert.alert(
      'Privacy & Cultural Sensitivity',
      `Medical Info Sharing: ${medicalShare ? 'Yes' : 'No'}\nPersonal Info Sharing: ${personalShare ? 'Yes' : 'No'}\nFamily Info Sharing: ${familyShare ? 'Yes' : 'No'}\n\nFamily Required: ${familyRequired ? 'Yes' : 'No'}\n\nPrivacy Guidance: ${privacyGuidance}`
    );
  };

  const getConversationStats = () => {
    const summary = getConversationSummary();
    
    Alert.alert(
      'Conversation Summary',
      `Messages: ${summary.messageCount}\nDuration: ${Math.round(summary.duration / 1000)}s\nEmotional Journey: ${summary.emotionalJourney.join(' → ')}\nContext Changes: ${summary.contextSwitches.join(' → ')}`
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cultural Intelligence Demo</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Cultural Profile Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cultural Profile</Text>
        <Text style={styles.currentProfile}>
          Current: {culturalProfile.culturalGroup} ({culturalProfile.preferredLanguage})
        </Text>
        
        <View style={styles.buttonRow}>
          {(['maori', 'chinese', 'western'] as CulturalGroup[]).map(culture => (
            <TouchableOpacity
              key={culture}
              style={[
                styles.cultureButton,
                selectedCulture === culture && styles.selectedCultureButton
              ]}
              onPress={() => handleCultureChange(culture)}
            >
              <Text style={styles.buttonText}>{culture}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message Testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message Adaptation Testing</Text>
        <TextInput
          style={styles.textInput}
          value={testMessage}
          onChangeText={setTestMessage}
          placeholder="Enter message to test cultural adaptation"
          multiline
        />
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={testCulturalAdaptation}>
            <Text style={styles.buttonText}>Test Adaptation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={testGreetings}>
            <Text style={styles.buttonText}>Test Greetings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Context Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversation Context</Text>
        <View style={styles.buttonRow}>
          {(['casual', 'medical', 'family', 'memory'] as ConversationContext[]).map(context => (
            <TouchableOpacity
              key={context}
              style={[
                styles.contextButton,
                currentContext === context && styles.selectedContextButton
              ]}
              onPress={() => {
                setCurrentContext(context);
                setConversationContext(context);
              }}
            >
              <Text style={styles.buttonText}>{context}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cultural Features Testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cultural Features</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={testFamilyGuidance}>
            <Text style={styles.buttonText}>Family Guidance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={testCulturalDetection}>
            <Text style={styles.buttonText}>Detect Culture</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={testPrivacyFeatures}>
          <Text style={styles.buttonText}>Privacy Features</Text>
        </TouchableOpacity>
      </View>

      {/* Cache Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Speech Cache Management</Text>
        {cacheStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>Total Phrases: {cacheStats.totalPhrases}</Text>
            <Text style={styles.statsText}>Average Usage: {cacheStats.averageUsage.toFixed(1)}</Text>
            <Text style={styles.statsText}>
              By Culture: Māori({cacheStats.phrasesByCulture.maori}) 
              Chinese({cacheStats.phrasesByCulture.chinese}) 
              Western({cacheStats.phrasesByCulture.western})
            </Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={testCacheWarming}>
            <Text style={styles.buttonText}>Warm Cache</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={testCachedPhrase}>
            <Text style={styles.buttonText}>Check Cache</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation State Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversation Management</Text>
        
        {!conversationState ? (
          <TouchableOpacity style={styles.actionButton} onPress={startConversationDemo}>
            <Text style={styles.buttonText}>Start Conversation</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.conversationStatus}>
              Status: {conversationState.currentMode} | Context: {conversationState.context}
            </Text>
            <Text style={styles.conversationStatus}>
              Messages: {conversationState.messages.length}
            </Text>
            
            <TextInput
              style={styles.textInput}
              value={conversationInput}
              onChangeText={setConversationInput}
              placeholder="Type a message..."
              multiline
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={addTestMessage}>
                <Text style={styles.buttonText}>Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={getConversationStats}>
                <Text style={styles.buttonText}>Get Stats</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.endButton} onPress={endConversation}>
              <Text style={styles.buttonText}>End Conversation</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Recent Messages */}
      {conversationState && conversationState.messages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          {conversationState.messages.slice(-3).map((message, index) => (
            <View key={message.id} style={styles.messageContainer}>
              <Text style={styles.messageHeader}>
                {message.speaker} ({message.context}) - {message.emotionalState}
              </Text>
              <Text style={styles.messageContent}>{message.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Detection History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detection History (Test Data)</Text>
        {detectionHistory.map((msg, index) => (
          <Text key={index} style={styles.historyItem}>• {msg}</Text>
        ))}
        <TextInput
          ref={detectionInputRef}
          style={styles.textInput}
          placeholder="Add to detection history..."
          onSubmitEditing={(e) => {
            if (e.nativeEvent.text.trim()) {
              setDetectionHistory(prev => [...prev, e.nativeEvent.text.trim()]);
              detectionInputRef.current?.clear();
            }
          }}
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  currentProfile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cultureButton: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    minWidth: 80,
  },
  selectedCultureButton: {
    backgroundColor: '#4CAF50',
  },
  contextButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 70,
  },
  selectedContextButton: {
    backgroundColor: '#2196F3',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    flex: 1,
    minWidth: 100,
    margin: 2,
  },
  endButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: '#fff',
    minHeight: 60,
  },
  statsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  conversationStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  messageContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  messageHeader: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#333',
  },
  historyItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});