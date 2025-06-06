import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Vibration } from 'react-native';
import { Text, Surface, Switch, Menu } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCulturalContext } from '../../contexts/CulturalContext';
import { CulturalGroup, PreferredLanguage } from '../../types/cultural';

interface VoiceProfile {
  id: string;
  name: string;
  culture: CulturalGroup;
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'middle' | 'elder';
  warmth: number; // 1-10 scale
}

interface FamilyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  isEmergency: boolean;
  culturalRole: 'primary' | 'secondary' | 'extended';
}

interface SettingsPreferencesProps {
  isHighContrast?: boolean;
  textSize?: 'small' | 'medium' | 'large' | 'extra-large';
  onSettingsChange?: (settings: {
    isHighContrast?: boolean;
    textSize?: 'small' | 'medium' | 'large' | 'extra-large';
    [key: string]: unknown;
  }) => void;
}

const SettingsPreferences: React.FC<SettingsPreferencesProps> = ({
  isHighContrast = false,
  textSize = 'large',
  onSettingsChange: _onSettingsChange
}) => {
  const { culturalProfile, setPreferredLanguage } = useCulturalContext();
  
  // Settings state
  const [selectedCulture, setSelectedCulture] = useState<CulturalGroup>(culturalProfile.culturalGroup);
  const [selectedLanguage, setSelectedLanguage] = useState<PreferredLanguage>(culturalProfile.preferredLanguage);
  const [selectedVoice, setSelectedVoice] = useState<string>('default');
  const [conversationFrequency, setConversationFrequency] = useState<'daily' | 'weekly' | 'as-needed'>('daily');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableHapticFeedback, setEnableHapticFeedback] = useState(true);
  const [textSizePreference, setTextSizePreference] = useState(textSize);
  const [highContrastMode, setHighContrastMode] = useState(isHighContrast);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>([]);
  const [privacyLevel, setPrivacyLevel] = useState<'open' | 'family-only' | 'private'>('family-only');
  
  // UI state
  const [cultureMenuVisible, setCultureMenuVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cultural']));

  // Voice profiles for each culture
  const voiceProfiles: VoiceProfile[] = [
    { id: 'maori-elder-f', name: 'Kuia (Elder Woman)', culture: 'maori', gender: 'female', age: 'elder', warmth: 9 },
    { id: 'maori-elder-m', name: 'Kaumātua (Elder Man)', culture: 'maori', gender: 'male', age: 'elder', warmth: 8 },
    { id: 'chinese-elder-f', name: '奶奶 (Grandmother)', culture: 'chinese', gender: 'female', age: 'elder', warmth: 9 },
    { id: 'chinese-middle-f', name: '阿姨 (Aunt)', culture: 'chinese', gender: 'female', age: 'middle', warmth: 7 },
    { id: 'western-elder-f', name: 'Caring Grandmother', culture: 'western', gender: 'female', age: 'elder', warmth: 8 },
    { id: 'western-middle-m', name: 'Friendly Doctor', culture: 'western', gender: 'male', age: 'middle', warmth: 6 },
  ];

  // Cultural colors
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
    
    return baseColors[selectedCulture];
  };

  const colors = getCulturalColors();

  // Text size mappings
  const getTextSizes = () => ({
    small: { title: 18, body: 14, caption: 12 },
    medium: { title: 22, body: 18, caption: 14 },
    large: { title: 26, body: 22, caption: 16 },
    'extra-large': { title: 32, body: 28, caption: 20 }
  })[textSizePreference];

  const textSizes = getTextSizes();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCultureChange = (culture: CulturalGroup) => {
    setSelectedCulture(culture);
    setCultureMenuVisible(false);
    
    // Auto-select appropriate language
    const defaultLanguage: PreferredLanguage = 
      culture === 'maori' ? 'mi' : 
      culture === 'chinese' ? 'zh' : 'en';
    
    setSelectedLanguage(defaultLanguage);
    setPreferredLanguage(defaultLanguage);
    
    if (enableHapticFeedback) {
      Vibration.vibrate(50);
    }
  };

  const handleLanguageChange = (language: PreferredLanguage) => {
    setSelectedLanguage(language);
    setLanguageMenuVisible(false);
    setPreferredLanguage(language);
  };

  const getAvailableVoices = () => {
    return voiceProfiles.filter(voice => voice.culture === selectedCulture);
  };

  const addFamilyContact = () => {
    Alert.prompt(
      'Add Family Contact',
      'Enter contact name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (name) => {
            if (name) {
              const newContact: FamilyContact = {
                id: Date.now().toString(),
                name,
                relationship: '',
                phoneNumber: '',
                isEmergency: false,
                culturalRole: 'secondary'
              };
              setFamilyContacts([...familyContacts, newContact]);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const removeFamilyContact = (id: string) => {
    setFamilyContacts(familyContacts.filter(contact => contact.id !== id));
  };

  const getCulturalPrivacyGuidance = () => {
    const guidance = {
      maori: {
        title: 'Whānau Privacy',
        description: 'Information sharing follows whānau protocols and collective decision-making.',
        levels: {
          'open': 'Share with extended whānau and community',
          'family-only': 'Share with immediate whānau only',
          'private': 'Individual privacy maintained'
        }
      },
      chinese: {
        title: 'Family Honor',
        description: 'Privacy settings respect family dignity and hierarchical considerations.',
        levels: {
          'open': 'Share with trusted family and community elders',
          'family-only': 'Share with immediate family members',
          'private': 'Maintain individual confidentiality'
        }
      },
      western: {
        title: 'Personal Privacy',
        description: 'Individual autonomy and consent guide information sharing.',
        levels: {
          'open': 'Share with chosen support network',
          'family-only': 'Share with immediate family',
          'private': 'Maintain strict confidentiality'
        }
      }
    };
    
    return guidance[selectedCulture];
  };

  const renderSectionHeader = (title: string, sectionKey: string, icon: string) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${title} section`}
      >
        <View style={styles.sectionHeaderContent}>
          <Icon name={icon} size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { fontSize: textSizes.title, color: colors.primary }]}>
            {title}
          </Text>
        </View>
        <Icon 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color={colors.primary} 
        />
      </TouchableOpacity>
    );
  };

  const renderCulturalSection = () => {
    if (!expandedSections.has('cultural')) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Culture Selection */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Cultural Identity
          </Text>
          <Menu
            visible={cultureMenuVisible}
            onDismiss={() => setCultureMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: colors.secondary }]}
                onPress={() => setCultureMenuVisible(true)}
              >
                <Text style={[styles.menuButtonText, { fontSize: textSizes.body, color: colors.primary }]}>
                  {selectedCulture === 'maori' ? 'Māori' : 
                   selectedCulture === 'chinese' ? 'Chinese' : 'Western'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
            }
          >
            <Menu.Item title="Māori" onPress={() => handleCultureChange('maori')} />
            <Menu.Item title="Chinese" onPress={() => handleCultureChange('chinese')} />
            <Menu.Item title="Western" onPress={() => handleCultureChange('western')} />
          </Menu>
        </View>

        {/* Language Selection */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Preferred Language
          </Text>
          <Menu
            visible={languageMenuVisible}
            onDismiss={() => setLanguageMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: colors.secondary }]}
                onPress={() => setLanguageMenuVisible(true)}
              >
                <Text style={[styles.menuButtonText, { fontSize: textSizes.body, color: colors.primary }]}>
                  {selectedLanguage === 'mi' ? 'Te Reo Māori' : 
                   selectedLanguage === 'zh' ? '中文' : 'English'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
            }
          >
            <Menu.Item title="English" onPress={() => handleLanguageChange('en')} />
            <Menu.Item title="Te Reo Māori" onPress={() => handleLanguageChange('mi')} />
            <Menu.Item title="中文" onPress={() => handleLanguageChange('zh')} />
          </Menu>
        </View>

        {/* Voice Selection */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Voice Preference
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.voiceOptions}>
              {getAvailableVoices().map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    selectedVoice === voice.id && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setSelectedVoice(voice.id)}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    { 
                      fontSize: textSizes.caption,
                      color: selectedVoice === voice.id ? '#FFFFFF' : colors.primary
                    }
                  ]}>
                    {voice.name}
                  </Text>
                  <View style={styles.warmthIndicator}>
                    {Array.from({ length: voice.warmth }, (_, i) => (
                      <Icon key={i} name="heart" size={8} color={selectedVoice === voice.id ? '#FFFFFF' : colors.accent} />
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderConversationSection = () => {
    if (!expandedSections.has('conversation')) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Conversation Frequency */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Conversation Frequency
          </Text>
          <View style={styles.frequencyOptions}>
            {['daily', 'weekly', 'as-needed'].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyOption,
                  conversationFrequency === freq && { backgroundColor: colors.accent }
                ]}
                onPress={() => setConversationFrequency(freq as 'daily' | 'weekly' | 'as-needed')}
              >
                <Text style={[
                  styles.frequencyText,
                  { 
                    fontSize: textSizes.caption,
                    color: conversationFrequency === freq ? '#FFFFFF' : colors.primary
                  }
                ]}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voice Speed */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Voice Speed: {voiceSpeed.toFixed(1)}x
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            value={voiceSpeed}
            onValueChange={setVoiceSpeed}
            step={0.1}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.secondary}
          />
        </View>

        {/* Notifications */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Enable Notifications
          </Text>
          <Switch
            value={enableNotifications}
            onValueChange={setEnableNotifications}
            color={colors.accent}
          />
        </View>
      </View>
    );
  };

  const renderAccessibilitySection = () => {
    if (!expandedSections.has('accessibility')) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Text Size */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Text Size
          </Text>
          <View style={styles.textSizeOptions}>
            {['small', 'medium', 'large', 'extra-large'].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.textSizeOption,
                  textSizePreference === size && { backgroundColor: colors.accent }
                ]}
                onPress={() => setTextSizePreference(size as 'small' | 'medium' | 'large' | 'extra-large')}
              >
                <Text style={[
                  styles.textSizeText,
                  { 
                    fontSize: size === 'small' ? 12 : size === 'medium' ? 16 : size === 'large' ? 20 : 24,
                    color: textSizePreference === size ? '#FFFFFF' : colors.primary
                  }
                ]}>
                  Aa
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* High Contrast */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            High Contrast Mode
          </Text>
          <Switch
            value={highContrastMode}
            onValueChange={setHighContrastMode}
            color={colors.accent}
          />
        </View>

        {/* Haptic Feedback */}
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { fontSize: textSizes.body, color: colors.primary }]}>
            Haptic Feedback
          </Text>
          <Switch
            value={enableHapticFeedback}
            onValueChange={setEnableHapticFeedback}
            color={colors.accent}
          />
        </View>
      </View>
    );
  };

  const renderFamilySection = () => {
    if (!expandedSections.has('family')) return null;

    return (
      <View style={styles.sectionContent}>
        {/* Add Contact Button */}
        <TouchableOpacity
          style={[styles.addContactButton, { backgroundColor: colors.accent }]}
          onPress={addFamilyContact}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={[styles.addContactText, { fontSize: textSizes.body }]}>
            Add Family Contact
          </Text>
        </TouchableOpacity>

        {/* Family Contacts List */}
        {familyContacts.map((contact) => (
          <Surface key={contact.id} style={styles.contactCard} elevation={1}>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { fontSize: textSizes.body, color: colors.primary }]}>
                {contact.name}
              </Text>
              <Text style={[styles.contactRelation, { fontSize: textSizes.caption, color: colors.primary }]}>
                {contact.relationship}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeFamilyContact(contact.id)}
              style={styles.removeButton}
            >
              <Icon name="close" size={20} color={colors.primary} />
            </TouchableOpacity>
          </Surface>
        ))}
      </View>
    );
  };

  const renderPrivacySection = () => {
    if (!expandedSections.has('privacy')) return null;

    const privacyGuidance = getCulturalPrivacyGuidance();

    return (
      <View style={styles.sectionContent}>
        <Text style={[styles.privacyDescription, { fontSize: textSizes.caption, color: colors.primary }]}>
          {privacyGuidance.description}
        </Text>

        {Object.entries(privacyGuidance.levels).map(([level, description]) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.privacyOption,
              privacyLevel === level && { backgroundColor: colors.accent }
            ]}
            onPress={() => setPrivacyLevel(level as 'open' | 'family-only' | 'private')}
          >
            <View style={styles.privacyOptionContent}>
              <Text style={[
                styles.privacyOptionTitle,
                { 
                  fontSize: textSizes.body,
                  color: privacyLevel === level ? '#FFFFFF' : colors.primary
                }
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
              </Text>
              <Text style={[
                styles.privacyOptionDescription,
                { 
                  fontSize: textSizes.caption,
                  color: privacyLevel === level ? '#FFFFFF' : colors.primary
                }
              ]}>
                {description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cultural Settings */}
      <Surface style={[styles.section, { backgroundColor: colors.secondary }]} elevation={2}>
        {renderSectionHeader('Cultural Profile', 'cultural', 'account-group')}
        {renderCulturalSection()}
      </Surface>

      {/* Conversation Settings */}
      <Surface style={[styles.section, { backgroundColor: colors.secondary }]} elevation={2}>
        {renderSectionHeader('Conversation', 'conversation', 'chat')}
        {renderConversationSection()}
      </Surface>

      {/* Accessibility Settings */}
      <Surface style={[styles.section, { backgroundColor: colors.secondary }]} elevation={2}>
        {renderSectionHeader('Accessibility', 'accessibility', 'eye')}
        {renderAccessibilitySection()}
      </Surface>

      {/* Family & Contacts */}
      <Surface style={[styles.section, { backgroundColor: colors.secondary }]} elevation={2}>
        {renderSectionHeader('Family & Contacts', 'family', 'account-multiple')}
        {renderFamilySection()}
      </Surface>

      {/* Privacy Settings */}
      <Surface style={[styles.section, { backgroundColor: colors.secondary }]} elevation={2}>
        {renderSectionHeader('Privacy', 'privacy', 'shield-account')}
        {renderPrivacySection()}
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontWeight: '600',
    marginBottom: 8,
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  menuButtonText: {
    flex: 1,
  },
  voiceOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  voiceOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    minWidth: 100,
  },
  voiceOptionText: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  warmthIndicator: {
    flexDirection: 'row',
    gap: 2,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  frequencyText: {
    fontWeight: '600',
  },
  slider: {
    marginVertical: 8,
  },
  textSizeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  textSizeOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textSizeText: {
    fontWeight: 'bold',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addContactText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: '600',
  },
  contactRelation: {
    opacity: 0.7,
  },
  removeButton: {
    padding: 4,
  },
  privacyDescription: {
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 20,
  },
  privacyOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  privacyOptionContent: {
    gap: 4,
  },
  privacyOptionTitle: {
    fontWeight: '600',
  },
  privacyOptionDescription: {
    opacity: 0.8,
    lineHeight: 18,
  },
});

export default SettingsPreferences;