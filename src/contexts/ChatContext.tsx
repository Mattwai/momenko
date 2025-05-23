/* global console */
import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import AIService from '../services/ai/AIService';
import ElevenLabsService from '../services/ai/ElevenLabsService';
import AudioPlayerService from '../services/audio/AudioPlayerService';
import { fetchChatHistory, addChatMessage } from '../services/supabase/chat';
import { supabase } from '../services/supabase/supabaseClient';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

interface ChatContextType {
  messages: Message[];
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef('');
  const processingTranscriptRef = useRef(false);
  const recognitionAttempts = useRef(0);

  // Function to refresh user session - can be called from screens when needed
  const refreshUserSession = async () => {
    console.log('Refreshing user session...');
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      
      if (data.session?.user) {
        const newUserId = data.session.user.id;
        setUserId(newUserId);
        console.log('User ID refreshed:', newUserId);
      } else {
        console.warn('No user session found during refresh');
      }
    } catch (err) {
      console.error('Exception during session refresh:', err);
    }
  };

  // Initialize voice recognition and ElevenLabs
  useEffect(() => {
    const initServices = async () => {
      try {
        const initialized = await ElevenLabsService.initializeVoice();
        if (!initialized) {
          console.error('Failed to initialize ElevenLabs');
        }
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initServices();
    
    // Set up Voice Recognition events
    Voice.onSpeechStart = () => {
      console.log('Speech started');
      setIsListening(true);
      recognitionAttempts.current = 0;
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
    };
    
    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      setIsListening(false);
      
      if (transcript && !processingTranscriptRef.current) {
        processSpeechResult(transcript);
      }
    };
    
    Voice.onSpeechResults = handleSpeechResults;
    
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Voice recognition error:', e);
      setIsListening(false);
      
      // Don't retry on permission errors or when max attempts reached
      if (e.error?.message === 'not authorized' || 
          e.error?.code === '7' || 
          e.error?.code === '1101' || // Speech service access error
          recognitionAttempts.current >= 5) {
        console.log('Not retrying voice recognition due to:', e.error?.message || 'max attempts reached');
        return;
      }
      
      recognitionAttempts.current += 1;
      const backoffDelay = Math.min(1000 * Math.pow(2, recognitionAttempts.current), 5000);
      
      console.log(`Retrying voice recognition in ${backoffDelay}ms (attempt ${recognitionAttempts.current})`);
      setTimeout(() => {
        if (!isListening) startListening();
      }, backoffDelay);
    };
    
    // Initial authentication check
    refreshUserSession();
    
    // Set up auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setUserId(session?.user?.id || null);
      }
    );
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      AudioPlayerService.stopPlaying();
      subscription.unsubscribe();
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);
  
  // Load messages when user changes
  useEffect(() => {
    if (userId) {
      console.log('User ID changed, loading messages for:', userId);
      loadMessages();
    }
  }, [userId]);
  
  // Handle speech recognition results
  const handleSpeechResults = (e: SpeechResultsEvent) => {
    if (!e.value?.[0]) return;

    const text = e.value[0];
    setTranscript(text);
    lastTranscriptRef.current = text;
    
    // If AI is speaking, stop it to handle interruption
    if (isSpeaking) {
      AudioPlayerService.stopPlaying();
      setIsSpeaking(false);
    }
    
    // Clear existing timeout and set a new one
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    
    // Set timeout to process result if no new speech is detected
    speechTimeoutRef.current = setTimeout(async () => {
      if (!processingTranscriptRef.current && lastTranscriptRef.current) {
        console.log('User finished speaking at', Date.now());
        await stopListening(); // Ensure we stop listening before processing
        processSpeechResult(lastTranscriptRef.current);
      }
    }, 500);
  };
  
  // Process speech results and send to AI
  const processSpeechResult = async (text: string) => {
    if (!text || processingTranscriptRef.current) return;
    
    processingTranscriptRef.current = true;
    try {
      console.log('Processing speech:', text);
      
      // Ensure we have a valid user ID
      if (!userId) {
        console.log('No user ID available, attempting to refresh session...');
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id;
        
        if (!currentUserId) {
          console.error('No user session available after refresh');
          return;
        }
        
        setUserId(currentUserId);
      }
      
      // Process speech if we have valid text and user ID
      if (text.length > 2 && userId) {
        await sendMessage(text);
      }
    } catch (error) {
      console.error('Error processing speech:', error);
    } finally {
      processingTranscriptRef.current = false;
      lastTranscriptRef.current = '';
      setTranscript('');
      
      // Restart listening after processing completes
      if (!isListening) {
        setTimeout(() => startListening(), 500);
      }
    }
  };
  
  // Load chat history from Supabase
  const loadMessages = async () => {
    if (!userId) {
      console.error('Cannot load messages: No user ID available');
      return;
    }
    
    try {
      setIsProcessing(true);
      const { data, error } = await fetchChatHistory(userId);
      
      if (data && !error) {
        const formattedMessages = data.map((msg, index) => ({
          id: msg.id || String(index),
          text: msg.message,
          isUser: msg.sender === 'user'
        }));
        
        setMessages(formattedMessages);
        console.log(`Loaded ${formattedMessages.length} messages from history`);
      } else if (error) {
        console.error('Error loading chat history:', error);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Start voice recognition
  const startListening = async () => {
    try {
      // First destroy any existing instance
      await Voice.destroy();
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for cleanup
      
      // Reset state
      processingTranscriptRef.current = false;
      lastTranscriptRef.current = '';
      setTranscript('');
      recognitionAttempts.current = 0;
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      // Ensure we have the latest user session before starting speech recognition
      if (!userId) {
        await refreshUserSession();
      }

      // Configure voice recognition with higher sensitivity
      await Voice.start('en-US', {
        partial: true, // Get partial results
        continuous: true, // Keep listening
        onPartialResults: true, // Enable partial results
        speechDetectionMinimumThreshold: 0.1, // Lower threshold for speech detection
        speechDetectionThreshold: 0.3, // Lower threshold for confirmed speech
      });
      
      setIsListening(true);
      console.log('Voice recognition started with high sensitivity at', Date.now());
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      
      // Try again after a delay if failed
      if (recognitionAttempts.current < 3) {
        recognitionAttempts.current += 1;
        setTimeout(() => {
          if (!isListening) startListening();
        }, 800);
      }
    }
  };
  
  // Stop voice recognition
  const stopListening = async () => {
    try {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      
      setIsListening(false);
      
      // Process any final transcript after stopping
      if (lastTranscriptRef.current && !processingTranscriptRef.current) {
        processSpeechResult(lastTranscriptRef.current);
      }
      
      // Ensure Voice is properly destroyed
      await Voice.stop();
      await Voice.destroy();
      console.log('Voice recognition stopped and destroyed');
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
    }
  };
  
  // Send a message (text or voice) and get AI response
  const sendMessage = async (text: string) => {
    if (!userId || !text.trim() || isProcessing) {
      console.error('Cannot send message:', 
        !userId ? 'No user ID' : 
        !text.trim() ? 'Empty message' : 
        'Already processing');
      
      if (!userId) {
        await refreshUserSession();
        if (!userId) {
          console.error('Still no user ID after refresh');
          return;
        }
      } else {
        return;
      }
    }
    
    try {
      setIsProcessing(true);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        text,
        isUser: true
      };
      
      console.log('Adding user message to UI:', text);
      setMessages(prev => [...prev, userMessage]);
      
      console.log('Adding user message to database for user:', userId);
      const { error: dbError } = await addChatMessage(userId, text, 'user');
      if (dbError) {
        console.error('Error adding user message to database:', dbError);
      }
      
      console.log('Sending message to AI at', Date.now());
      const aiResponse = await AIService.generatePersonalizedResponse(userId, text);
      console.log('AI response received at', Date.now(), 'Length:', aiResponse?.length || 0);
      
      if (aiResponse) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          isUser: false
        };
        
        console.log('Adding bot message to UI');
        setMessages(prev => [...prev, botMessage]);
        
        console.log('Adding bot message to database');
        const { error: botDbError } = await addChatMessage(userId, aiResponse, 'bot');
        if (botDbError) {
          console.error('Error adding bot message to database:', botDbError);
        }
        
        // Use ElevenLabs for speech synthesis
        try {
          setIsSpeaking(true);
          
          // Split response into sentences for more natural speech
          const sentences = ElevenLabsService.splitIntoSentences(aiResponse);
          console.log('Speaking response with', sentences.length, 'sentences');
          
          for (const sentence of sentences) {
            if (sentence.trim()) {
              console.log('Generating speech for:', sentence.trim().substring(0, 30) + '...');
              const audioBuffer = await ElevenLabsService.textToSpeech(sentence.trim());
              
              if (audioBuffer) {
                console.log('Playing audio buffer of size:', audioBuffer.byteLength);
                await AudioPlayerService.playAudioBuffer(audioBuffer);
              } else {
                console.error('Failed to generate speech for sentence');
              }
            }
          }
        } catch (speechError) {
          console.error('Speech synthesis error:', speechError);
        } finally {
          setIsSpeaking(false);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
      setTranscript('');
      
      if (!isListening) {
        setTimeout(() => startListening(), 500);
      }
    }
  };
  
  // Provide context values
  const contextValue: ChatContextType = {
    messages,
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    sendMessage,
    loadMessages,
    refreshUserSession
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 