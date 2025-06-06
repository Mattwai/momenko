import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { Text, Surface, Searchbar, IconButton, Menu, Divider, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';
import { useCulturalContext } from '../../contexts/CulturalContext';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

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

interface ConversationHistoryProps {
  sessions: ConversationSession[];
  onSessionSelect?: (session: ConversationSession) => void;
  onExportSession?: (session: ConversationSession) => void;
  onShareWithFamily?: (session: ConversationSession) => void;
  isHighContrast?: boolean;
  textSize?: 'small' | 'medium' | 'large' | 'extra-large';
  showCulturalIndicators?: boolean;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  sessions = [],
  onSessionSelect,
  onExportSession,
  onShareWithFamily,
  isHighContrast = false,
  textSize = 'large',
  showCulturalIndicators = true
}) => {
  const { culturalProfile, getFamilyInvolvementGuidance } = useCulturalContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'en' | 'mi' | 'zh'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'cultural'>('date');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [menuVisible, setMenuVisible] = useState(false);

  // Cultural colors and styling
  const getCulturalColors = () => {
    const baseColors = isHighContrast ? {
      maori: { primary: '#000000', secondary: '#FFFFFF', accent: '#FF0000', background: '#FFFFFF' },
      chinese: { primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', background: '#FFFFFF' },
      western: { primary: '#000000', secondary: '#FFFFFF', accent: '#0066CC', background: '#FFFFFF' }
    } : {
      maori: { primary: '#8B4513', secondary: '#F5DEB3', accent: '#228B22', background: '#FFF8DC' },
      chinese: { primary: '#DC143C', secondary: '#FFD700', accent: '#FF6347', background: '#FFF5EE' },
      western: { primary: '#6366F1', secondary: '#E0E7FF', accent: '#8B5CF6', background: '#F9FAFB' }
    };
    
    return baseColors[culturalProfile.culturalGroup];
  };

  const colors = getCulturalColors();

  // Text size mappings
  const getTextSizes = () => ({
    small: { title: 18, body: 14, caption: 12 },
    medium: { title: 22, body: 18, caption: 14 },
    large: { title: 26, body: 22, caption: 16 },
    'extra-large': { title: 32, body: 28, caption: 20 }
  })[textSize];

  const textSizes = getTextSizes();

  // Cultural date formatting
  const getDateLocale = () => {
    switch (culturalProfile.culturalGroup) {
      case 'chinese': return zhCN;
      default: return enUS;
    }
  };

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const sessionText = session.messages
          .map(m => m.content)
          .join(' ')
          .toLowerCase();
        if (!sessionText.includes(query)) return false;
      }

      // Language filter
      if (selectedLanguage !== 'all') {
        const hasLanguage = session.messages.some(m => m.language === selectedLanguage);
        if (!hasLanguage) return false;
      }

      return true;
    });

    // Sort sessions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.startTime.getTime() - a.startTime.getTime();
        case 'duration': {
<<<<<<< Updated upstream
          const aDuration = (a.endTime?.getTime() || Date.now()) - a.startTime.getTime();
          const bDuration = (b.endTime?.getTime() || Date.now()) - b.startTime.getTime();
=======
          const aDuration = a.endTime ? a.endTime.getTime() - a.startTime.getTime() : 0;
          const bDuration = b.endTime ? b.endTime.getTime() - b.startTime.getTime() : 0;
>>>>>>> Stashed changes
          return bDuration - aDuration;
        }
        case 'cultural':
          return a.culturalProfile.localeCompare(b.culturalProfile);
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, searchQuery, selectedLanguage, sortBy]);

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleShareWithFamily = async (session: ConversationSession) => {
    const familyGuidance = getFamilyInvolvementGuidance();
    
    if (familyGuidance.level === 'high') {
      // For cultures with high family involvement, share directly
      onShareWithFamily?.(session);
    } else {
      // Show privacy confirmation for other cultures
      Alert.alert(
        'Share with Family',
        'Would you like to share this conversation with your family members?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => onShareWithFamily?.(session) }
        ]
      );
    }
  };

  const handleExport = (session: ConversationSession) => {
    Alert.alert(
      'Export Conversation',
      'Choose export format for healthcare provider:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PDF Summary', onPress: () => onExportSession?.(session) },
        { text: 'Full Transcript', onPress: () => onExportSession?.(session) }
      ]
    );
  };

  const getCulturalIndicator = (session: ConversationSession) => {
    const indicators = {
      maori: { icon: 'leaf', color: '#228B22', label: 'Whānau-centered' },
      chinese: { icon: 'yin-yang', color: '#FFD700', label: 'Family-respectful' },
      western: { icon: 'account', color: '#6366F1', label: 'Individual-focused' }
    };
    
    return indicators[session.culturalProfile as keyof typeof indicators] || indicators.western;
  };

  const getLanguageLabel = (language: string) => {
    const labels = {
      'en': 'English',
      'mi': 'Te Reo Māori',
      'zh': '中文'
    };
    return labels[language as keyof typeof labels] || language;
  };

  const renderMessage = (message: ConversationMessage, index: number) => (
    <Animatable.View
      key={message.id}
      animation="fadeInUp"
      delay={index * 50}
      style={[
        styles.messageBubble,
        message.isUser ? styles.userMessage : styles.aiMessage,
        { backgroundColor: message.isUser ? colors.primary : colors.secondary }
      ]}
    >
      <Text 
        style={[
          styles.messageText, 
          { 
            fontSize: textSizes.body,
            color: message.isUser ? 
              (isHighContrast ? '#FFFFFF' : colors.secondary) : 
              (isHighContrast ? '#000000' : colors.primary)
          }
        ]}
      >
        {message.content}
      </Text>
      
      {showCulturalIndicators && message.culturalContext && (
        <Text 
          style={[
            styles.contextText, 
            { 
              fontSize: textSizes.caption,
              color: message.isUser ? 
                (isHighContrast ? '#CCCCCC' : colors.secondary) : 
                (isHighContrast ? '#666666' : colors.primary)
            }
          ]}
        >
          Context: {message.culturalContext}
        </Text>
      )}
      
      <Text 
        style={[
          styles.timestampText, 
          { 
            fontSize: textSizes.caption,
            color: message.isUser ? 
              (isHighContrast ? '#CCCCCC' : colors.secondary) : 
              (isHighContrast ? '#666666' : colors.primary)
          }
        ]}
      >
        {format(message.timestamp, 'HH:mm', { locale: getDateLocale() })}
      </Text>
    </Animatable.View>
  );

  const renderSession = (session: ConversationSession) => {
    const isExpanded = expandedSessions.has(session.id);
    const culturalIndicator = getCulturalIndicator(session);
    const duration = session.endTime ? 
      Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)) : 
      0;

    return (
      <Surface 
        key={session.id}
        style={[
          styles.sessionCard, 
          { backgroundColor: isHighContrast ? '#FFFFFF' : colors.background }
        ]}
        elevation={2}
      >
        <TouchableOpacity
          style={styles.sessionHeader}
          onPress={() => toggleSessionExpansion(session.id)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Conversation from ${format(session.startTime, 'PPp', { locale: getDateLocale() })}`}
        >
          <View style={styles.sessionInfo}>
            <Text 
              style={[
                styles.sessionDate, 
                { 
                  fontSize: textSizes.title,
                  color: isHighContrast ? '#000000' : colors.primary
                }
              ]}
            >
              {format(session.startTime, 'PPp', { locale: getDateLocale() })}
            </Text>
            
            <View style={styles.sessionMeta}>
              {showCulturalIndicators && (
                <Chip 
                  icon={culturalIndicator.icon}
                  style={[styles.culturalChip, { backgroundColor: culturalIndicator.color }]}
                  textStyle={{ color: '#FFFFFF', fontSize: textSizes.caption }}
                >
                  {culturalIndicator.label}
                </Chip>
              )}
              
              <Text 
                style={[
                  styles.sessionDuration, 
                  { 
                    fontSize: textSizes.caption,
                    color: isHighContrast ? '#666666' : colors.primary
                  }
                ]}
              >
                {duration} minutes • {session.messages.length} messages
              </Text>
            </View>
            
            {session.summary && (
              <Text 
                style={[
                  styles.sessionSummary, 
                  { 
                    fontSize: textSizes.body,
                    color: isHighContrast ? '#333333' : colors.primary
                  }
                ]}
                numberOfLines={2}
              >
                {session.summary}
              </Text>
            )}
          </View>
          
          <View style={styles.sessionActions}>
            <IconButton
              icon={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={30}
              iconColor={isHighContrast ? '#000000' : colors.primary}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sessionContent}>
            <ScrollView 
              style={styles.messagesScrollView}
              showsVerticalScrollIndicator={false}
            >
              {session.messages.map((message, index) => renderMessage(message, index))}
            </ScrollView>
            
            <View style={styles.sessionActionsBar}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={() => handleShareWithFamily(session)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Share with family"
              >
                <Icon name="share-variant" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { fontSize: textSizes.caption }]}>
                  Family
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleExport(session)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Export for healthcare provider"
              >
                <Icon name="download" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { fontSize: textSizes.caption }]}>
                  Export
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search and Filter Header */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[
            styles.searchbar, 
            { backgroundColor: isHighContrast ? '#FFFFFF' : colors.secondary }
          ]}
          inputStyle={{ fontSize: textSizes.body }}
        />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              size={30}
              iconColor={isHighContrast ? '#000000' : colors.primary}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item 
            title="All Languages" 
            onPress={() => { setSelectedLanguage('all'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
          <Menu.Item 
            title="English" 
            onPress={() => { setSelectedLanguage('en'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
          <Menu.Item 
            title="Te Reo Māori" 
            onPress={() => { setSelectedLanguage('mi'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
          <Menu.Item 
            title="中文" 
            onPress={() => { setSelectedLanguage('zh'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
          <Divider />
          <Menu.Item 
            title="Sort by Date" 
            onPress={() => { setSortBy('date'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
          <Menu.Item 
            title="Sort by Duration" 
            onPress={() => { setSortBy('duration'); setMenuVisible(false); }}
            titleStyle={{ fontSize: textSizes.body }}
          />
        </Menu>
      </View>

      {/* Conversations List */}
      <ScrollView 
        style={styles.sessionsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sessionsContent}
      >
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon 
              name="chat-outline" 
              size={64} 
              color={isHighContrast ? '#666666' : colors.primary} 
            />
            <Text 
              style={[
                styles.emptyText, 
                { 
                  fontSize: textSizes.title,
                  color: isHighContrast ? '#666666' : colors.primary
                }
              ]}
            >
              No conversations found
            </Text>
          </View>
        ) : (
          filteredSessions.map(renderSession)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 2,
  },
  sessionsList: {
    flex: 1,
  },
  sessionsContent: {
    padding: 16,
    gap: 12,
  },
  sessionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  culturalChip: {
    height: 24,
  },
  sessionDuration: {
    opacity: 0.7,
  },
  sessionSummary: {
    opacity: 0.8,
    lineHeight: 20,
  },
  sessionActions: {
    justifyContent: 'center',
  },
  sessionContent: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messagesScrollView: {
    maxHeight: 300,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    lineHeight: 24,
  },
  contextText: {
    marginTop: 4,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  timestampText: {
    marginTop: 4,
    opacity: 0.6,
  },
  sessionActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});

export default ConversationHistory;