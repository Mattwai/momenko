/* global console */
import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import AIService from '../services/ai/AIService';
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
  
  // Add speech timeout refs to handle cases where onSpeechEnd isn't triggered
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

  // Initialize TTS and Voice Recognition
  useEffect(() => {
    // Initialize TTS
    const initTts = async () => {
      try {
        // Initialize with default settings
        await Tts.setDefaultLanguage('en-US');
        
        // Get available voices
        const voices = await Tts.voices();
        const availableVoices = voices.filter(v => !v.networkConnectionRequired && v.notInstalled === false);
        
        // Select an appropriate voice - prefer a female voice if available
        const femaleVoice = availableVoices.find(v => 
          v.id.includes('female') || 
          v.id.includes('Samantha') || 
          v.id.toLowerCase().includes('female')
        );
        
        if (femaleVoice) {
          await Tts.setDefaultVoice(femaleVoice.id);
          console.log(`Using voice: ${femaleVoice.id}`);
        } else if (availableVoices.length > 0) {
          await Tts.setDefaultVoice(availableVoices[0].id);
          console.log(`Using voice: ${availableVoices[0].id}`);
        }
        
        // Set slower rate for elderly users
        await Tts.setDefaultRate(0.48);
        await Tts.setDefaultPitch(1.0);
      } catch (err) {
        console.error('TTS initialization error:', err);
      }
    };
    
    initTts();
    
    // Use only supported TTS event types
    Tts.addEventListener('tts-start', () => {
      console.log('TTS started speaking');
      setIsSpeaking(true);
    });
    Tts.addEventListener('tts-finish', () => {
      console.log('TTS finished speaking');
      setIsSpeaking(false);
    });
    Tts.addEventListener('tts-cancel', () => {
      console.log('TTS speech canceled');
      setIsSpeaking(false);
    });
    
    // Set up Voice Recognition events with better timeout handling
    Voice.onSpeechStart = () => {
      console.log('Speech started');
      setIsListening(true);
      recognitionAttempts.current = 0;
      
      // Clear any existing timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
    };
    
    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      setIsListening(false);
      
      // Process current transcript if we have content
      if (transcript && !processingTranscriptRef.current) {
        processSpeechResult(transcript);
      }
    };
    
    Voice.onSpeechResults = handleSpeechResults;
    
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Voice recognition error:', e);
      setIsListening(false);
      
      // Increment attempts counter
      recognitionAttempts.current += 1;
      
      // Restart voice recognition after error, with backoff if multiple failures
      if (e.error?.message !== 'not authorized' && e.error?.code !== '7' && recognitionAttempts.current < 5) {
        const backoffDelay = Math.min(1000 * recognitionAttempts.current, 5000);
        setTimeout(() => {
          startListening();
        }, backoffDelay);
      }
    };
    
    // Initial authentication check
    refreshUserSession();
    
    // Set up auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setUserId(session?.user?.id || null);
        if (session?.user?.id) {
          console.log('User ID set from auth state change:', session.user.id);
        } else {
          console.warn('No user ID in auth state change');
        }
      }
    );
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.stop();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
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
  
  // Handle speech recognition results with improved timeout logic
  const handleSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value[0]) {
      const text = e.value[0];
      setTranscript(text);
      lastTranscriptRef.current = text;
      
      // If AI is speaking, stop it to handle interruption
      if (isSpeaking) {
        Tts.stop();
        setIsSpeaking(false);
      }
      
      // Clear existing timeout and set a new one
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      
      // Set timeout to process result if no new speech is detected for 0.5 second (reduced from 1s)
      speechTimeoutRef.current = setTimeout(() => {
        if (!processingTranscriptRef.current && lastTranscriptRef.current) {
          console.log('User finished speaking at', Date.now());
          processSpeechResult(lastTranscriptRef.current);
        }
      }, 500);
    }
  };
  
  // Process speech results and send to AI
  const processSpeechResult = async (text: string) => {
    if (!text || processingTranscriptRef.current) return;
    
    processingTranscriptRef.current = true;
    try {
      console.log('Processing speech:', text);
      
      // Check if we have a user ID, if not try refreshing the session
      let currentUserId = userId;
      if (!currentUserId) {
        console.log('No user ID available, attempting to refresh session...');
        await refreshUserSession();
        // Fetch the session directly to get the latest userId
        const { data, error } = await supabase.auth.getSession();
        if (data?.session?.user?.id) {
          currentUserId = data.session.user.id;
        }
      }
      
      // Process speech more aggressively - any meaningful content is processed
      // Changed criteria to process even shorter phrases
      if (text.length > 2) {
        if (currentUserId) {
          await sendMessage(text);
        } else {
          console.error('Cannot process speech: No user ID available after refresh');
        }
      }
    } finally {
      processingTranscriptRef.current = false;
      lastTranscriptRef.current = '';
      setTranscript('');
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
      if (isListening) {
        console.log('Already listening, not starting again.');
        return;
      }
      // Ensure we have the latest user session before starting speech recognition
      if (!userId) {
        await refreshUserSession();
      }
      
      processingTranscriptRef.current = false;
      lastTranscriptRef.current = '';
      setTranscript('');
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      
      // Force destroy and recreate to avoid issues
      if (recognitionAttempts.current > 3) {
        await Voice.destroy();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      await Voice.start('en-US');
      console.log('Voice recognition started at', Date.now());
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      // Try again after a delay if failed
      setTimeout(() => {
        if (!isListening) startListening();
      }, 800);
    }
  };
  
  // Stop voice recognition
  const stopListening = async () => {
    try {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      
      await Voice.stop();
      console.log('Voice recognition stopped');
      setIsListening(false);
      console.log('isListening set to false in stopListening');
      
      // Process any final transcript after stopping
      if (lastTranscriptRef.current && !processingTranscriptRef.current) {
        processSpeechResult(lastTranscriptRef.current);
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      setIsListening(false);
      console.log('isListening set to false in stopListening (error case)');
    }
  };
  
  // Send a message (text or voice) and get AI response
  const sendMessage = async (text: string) => {
    if (!userId || !text.trim() || isProcessing) {
      console.error('Cannot send message:', 
        !userId ? 'No user ID' : 
        !text.trim() ? 'Empty message' : 
        'Already processing');
      
      // If the issue is no user ID, try to refresh the session
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
      
      // Add user message to UI and database
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
      
      // Get AI response
      console.log('Sending message to AI at', Date.now());
      const aiResponse = await AIService.generatePersonalizedResponse(userId, text);
      console.log('AI response received at', Date.now());
      console.log('Received AI response:', aiResponse ? aiResponse.substring(0, 50) + '...' : 'No response');
      
      if (aiResponse) {
        // Add AI response to UI and database
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
        
        // Speak the response with error handling
        try {
          // Break long responses into sentences to improve TTS stability
          const sentences = aiResponse.match(/[^.!?]+[.!?]+/g) || [aiResponse];
          
          console.log(`Speaking ${sentences.length} sentences with TTS`);
          for (const sentence of sentences) {
            if (sentence.trim()) {
              console.log('TTS speaking at', Date.now());
              console.log('Speaking sentence:', sentence.trim().substring(0, 30) + '...');
              await Tts.speak(sentence.trim());
            }
          }
        } catch (ttsError) {
          console.error('TTS speak error:', ttsError);
          // Continue execution even if TTS fails
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
      setTranscript('');
      
      // Restart listening after processing completes
      if (!isListening) {
        setTimeout(() => startListening(), 500); // 500ms delay to avoid double start
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