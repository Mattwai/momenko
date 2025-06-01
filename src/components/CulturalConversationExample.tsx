import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useCulturalContext } from '../contexts/CulturalContext';
import { useConversationState } from '../hooks/useConversationState';
import { CulturalGroup, ConversationContext } from '../types';

interface CulturalConversationExampleProps {
  userId: string;
  onConversationEnd?: () => void;
}

export const CulturalConversationExample: React.FC<CulturalConversationExampleProps> = ({
  userId,
  onConversationEnd
}) => {
  const [userInput, setUserInput] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    culturalProfile,
    setPreferredLanguage,
    getAdaptedResponse,
    getCulturalGreeting,
    getFamilyInvolvementGuidance,
    validateCulturalAppropriateness,
    warmSpeechCache,
    isLoading: culturalLoading
  } = useCulturalContext();

  const {
    conversationState,
    startConversation,
    endConversation,
    addMessage,
    setConversationContext,
    getCulturallyAppropriateGreeting,
    checkFamilyInvolvementRequirement,
    shouldShareInformation,
    getPrivacyGuidance,
    isLoading: conversationLoading
  } = useConversationState(userId);

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      // Warm the speech cache for better performance
      await warmSpeechCache();
      
      // Start the culturally-aware conversation
      await startConversation(culturalProfile);
      
      setIsInitialized(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize conversation');
      console.error('Conversation initialization error:', error);
    }
  };

  const handleUserMessage = async () => {
    if (!userInput.trim() || !conversationState) return;

    try {
      // Add user message to conversation
      await addMessage(userInput, 'user', {
        context: 'casual',
        emotionalState: 'neutral'
      });

      // Generate culturally appropriate response
      const baseResponse = getResponseForInput(userInput);
      const adaptedResponse = getAdaptedResponse(baseResponse, 'casual', {
        userInput: userInput,
        userName: 'friend'
      });

      // Validate cultural appropriateness
      const validation = validateCulturalAppropriateness(adaptedResponse);
      if (!validation.isAppropriate) {
        console.warn('Cultural concerns:', validation.concerns);
        // Handle concerns or provide alternative response
      }

      // Add assistant response
      await addMessage(adaptedResponse, 'assistant', {
        context: 'casual',
        emotionalState: 'happy'
      });

      setUserInput('');
    } catch (error) {
      Alert.alert('Error', 'Failed to process message');
      console.error('Message processing error:', error);
    }
  };

  const getResponseForInput = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('memory') || lowerInput.includes('forget')) {
      return "I understand your concerns about memory. This is a common experience, and there are ways we can help support you.";
    } else if (lowerInput.includes('family') || lowerInput.includes('whānau')) {
      return "Family support is very important. Would you like to discuss how your family can be involved in your care?";
    } else if (lowerInput.includes('confused') || lowerInput.includes('lost')) {
      return "It's okay to feel confused sometimes. You're not alone, and we're here to help you through this.";
    } else {
      return "Thank you for sharing that with me. How are you feeling about everything?";
    }
  };

  const handleContextSwitch = (context: ConversationContext) => {
    setConversationContext(context);
    
    // Provide guidance based on new context and culture
    const guidance = getFamilyInvolvementGuidance();
    if (guidance.level === 'high' && context === 'medical') {
      Alert.alert(
        'Family Involvement Guidance',
        guidance.guidance
      );
    }
  };

  const handleCultureChange = (culture: CulturalGroup) => {
    const language = culture === 'maori' ? 'mi' : culture === 'chinese' ? 'zh' : 'en';
    setPreferredLanguage(language);
    
    // Restart conversation with new cultural profile
    if (conversationState) {
      initializeConversation();
    }
  };

  const showPrivacyInfo = () => {
    const guidance = getPrivacyGuidance();
    const medicalShare = shouldShareInformation('medical');
    const familyRequired = checkFamilyInvolvementRequirement();
    
    Alert.alert(
      'Privacy Information',
      `${guidance}\n\nMedical info sharing: ${medicalShare ? 'Allowed' : 'Restricted'}\nFamily involvement: ${familyRequired ? 'Required' : 'Optional'}`
    );
  };

  const handleEndConversation = async () => {
    await endConversation();
    onConversationEnd?.();
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
    
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';
    
    return getCulturalGreeting(timeOfDay);
  };

  if (culturalLoading || conversationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing culturally-aware conversation...</Text>
      </View>
    );
  }

  if (!isInitialized || !conversationState) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Setting up conversation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with cultural info */}
      <View style={styles.header}>
        <Text style={styles.title}>Cultural Conversation</Text>
        <Text style={styles.subtitle}>
          Culture: {culturalProfile.culturalGroup} | Language: {culturalProfile.preferredLanguage}
        </Text>
        <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
      </View>

      {/* Culture selection */}
      <View style={styles.cultureSelector}>
        <Text style={styles.sectionTitle}>Select Culture:</Text>
        <View style={styles.buttonRow}>
          {(['maori', 'chinese', 'western'] as CulturalGroup[]).map(culture => (
            <TouchableOpacity
              key={culture}
              style={[
                styles.cultureButton,
                culturalProfile.culturalGroup === culture && styles.selectedButton
              ]}
              onPress={() => handleCultureChange(culture)}
            >
              <Text style={styles.buttonText}>{culture}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Context selection */}
      <View style={styles.contextSelector}>
        <Text style={styles.sectionTitle}>Context:</Text>
        <View style={styles.buttonRow}>
          {(['casual', 'medical', 'family', 'memory'] as ConversationContext[]).map(context => (
            <TouchableOpacity
              key={context}
              style={[
                styles.contextButton,
                conversationState.context === context && styles.selectedButton
              ]}
              onPress={() => handleContextSwitch(context)}
            >
              <Text style={styles.buttonText}>{context}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Conversation messages */}
      <ScrollView style={styles.messagesContainer}>
        {conversationState.messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.speaker === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
            <Text style={styles.messageInfo}>
              {message.speaker} • {message.context} • {message.emotionalState}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type your message..."
          multiline
          maxLength={500}
        />
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleUserMessage}
            disabled={!userInput.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={showPrivacyInfo}>
          <Text style={styles.actionButtonText}>Privacy Info</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={handleEndConversation}>
          <Text style={styles.actionButtonText}>End Conversation</Text>
        </TouchableOpacity>
      </View>

      {/* Status info */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Messages: {conversationState.messages.length} | Mode: {conversationState.currentMode}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  greeting: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cultureSelector: {
    marginBottom: 16,
  },
  contextSelector: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cultureButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    minWidth: 80,
  },
  contextButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flex: 1,
    minWidth: 70,
  },
  selectedButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageText: {
    color: '#333',
    fontSize: 16,
  },
  messageInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
  },
  endButton: {
    backgroundColor: '#f44336',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});