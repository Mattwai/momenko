import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScreenReaderConfig {
  enabled: boolean;
  announcementSpeed: 'slow' | 'normal' | 'fast';
  verbosity: 'minimal' | 'standard' | 'detailed';
  culturalDescriptions: boolean;
  elderlyOptimizations: boolean;
  pauseBetweenAnnouncements: number; // milliseconds
  repeatImportantMessages: boolean;
  simplifyTechnicalTerms: boolean;
}

interface AnnouncementQueue {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  culturalContext?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface AccessibleElement {
  id: string;
  label: string;
  hint?: string;
  role: string;
  value?: string;
  state?: { [key: string]: boolean };
  culturalContext?: string;
  elderlyFriendly?: boolean;
}

interface NavigationContext {
  currentScreen: string;
  currentSection?: string;
  totalItems?: number;
  currentItem?: number;
  hasSubItems?: boolean;
  culturalMode?: string;
}

class ScreenReaderService {
  private config: ScreenReaderConfig;
  private isScreenReaderActive = false;
  private announcementQueue: AnnouncementQueue[] = [];
  private isProcessingQueue = false;
  private currentNavigationContext: NavigationContext | null = null;
  private registeredElements: Map<string, AccessibleElement> = new Map();
  private lastAnnouncementTime = 0;
  private culturalVocabulary: Map<string, { [culture: string]: string }> = new Map();

  constructor() {
    this.config = {
      enabled: false,
      announcementSpeed: 'normal',
      verbosity: 'standard',
      culturalDescriptions: true,
      elderlyOptimizations: true,
      pauseBetweenAnnouncements: 800, // Longer pauses for elderly users
      repeatImportantMessages: true,
      simplifyTechnicalTerms: true
    };

    this.initializeCulturalVocabulary();
    this.detectScreenReader();
    this.loadStoredConfig();
  }

  private initializeCulturalVocabulary(): void {
    // Cultural terms and their explanations
    this.culturalVocabulary.set('family_gathering', {
      'chinese': 'family reunion or gathering, an important cultural tradition',
      'mexican': 'familia gathering, a celebration of family bonds',
      'jewish': 'family gathering, often for holidays or Shabbat'
    });

    this.culturalVocabulary.set('traditional_food', {
      'chinese': 'traditional Chinese cuisine with cultural significance',
      'mexican': 'comida tradicional, food that represents Mexican heritage',
      'jewish': 'traditional Jewish food, often with religious significance'
    });

    this.culturalVocabulary.set('cultural_celebration', {
      'chinese': 'cultural celebration or festival',
      'mexican': 'celebración cultural, a traditional Mexican celebration',
      'jewish': 'Jewish holiday or cultural celebration'
    });

    this.culturalVocabulary.set('ancestor_respect', {
      'chinese': 'honoring ancestors, an important Chinese tradition',
      'mexican': 'respeto a los antepasados, honoring those who came before',
      'jewish': 'remembering and honoring Jewish heritage and ancestors'
    });
  }

  private async detectScreenReader(): Promise<void> {
    try {
      this.isScreenReaderActive = await AccessibilityInfo.isScreenReaderEnabled();
      this.config.enabled = this.isScreenReaderActive;

      // Listen for screen reader state changes
      AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
        this.isScreenReaderActive = isEnabled;
        this.config.enabled = isEnabled;
        
        if (isEnabled) {
          this.announceScreenReaderActivation();
        }
      });

      if (this.isScreenReaderActive) {
        await this.initializeForScreenReader();
      }
    } catch (error) {
      console.error('Error detecting screen reader:', error);
    }
  }

  private async initializeForScreenReader(): Promise<void> {
    if (this.config.elderlyOptimizations) {
      // Adjust settings for elderly users
      this.config.announcementSpeed = 'slow';
      this.config.verbosity = 'detailed';
      this.config.pauseBetweenAnnouncements = 1200; // Longer pauses
      this.config.repeatImportantMessages = true;
    }

    await this.announceWelcome();
    this.startAnnouncementQueue();
  }

  private announceScreenReaderActivation(): void {
    this.queueAnnouncement(
      'Screen reader detected. Cultural Companion app is optimized for accessibility.',
      'high'
    );
  }

  private async announceWelcome(): Promise<void> {
    const welcomeMessage = this.config.elderlyOptimizations
      ? 'Welcome to Cultural Companion. This app helps you connect with your cultural heritage through conversation. Navigate with simple gestures, and the app will guide you step by step.'
      : 'Welcome to Cultural Companion. Use standard navigation gestures to explore cultural conversations and memories.';

    this.queueAnnouncement(welcomeMessage, 'high');
  }

  async announce(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium', culturalContext?: string): Promise<void> {
    if (!this.config.enabled || !this.isScreenReaderActive) {
      return;
    }

    const processedMessage = this.processMessageForAnnouncement(message, culturalContext);
    this.queueAnnouncement(processedMessage, priority, culturalContext);
  }

  private processMessageForAnnouncement(message: string, culturalContext?: string): string {
    let processedMessage = message;

    // Simplify technical terms for elderly users
    if (this.config.simplifyTechnicalTerms) {
      processedMessage = processedMessage
        .replace(/AI/g, 'artificial intelligence assistant')
        .replace(/API/g, 'system')
        .replace(/UI/g, 'interface')
        .replace(/app/g, 'application')
        .replace(/sync/g, 'update')
        .replace(/cache/g, 'stored information');
    }

    // Add cultural context explanations
    if (this.config.culturalDescriptions && culturalContext) {
      processedMessage = this.addCulturalContext(processedMessage, culturalContext);
    }

    // Adjust verbosity
    if (this.config.verbosity === 'detailed') {
      processedMessage = this.addDetailedContext(processedMessage);
    } else if (this.config.verbosity === 'minimal') {
      processedMessage = this.simplifyMessage(processedMessage);
    }

    return processedMessage;
  }

  private addCulturalContext(message: string, culturalContext: string): string {
    // Check if message contains cultural terms that need explanation
    for (const [term, translations] of this.culturalVocabulary.entries()) {
      if (message.toLowerCase().includes(term.replace('_', ' '))) {
        const explanation = translations[culturalContext];
        if (explanation) {
          message += `. This refers to ${explanation}.`;
        }
      }
    }

    return message;
  }

  private addDetailedContext(message: string): string {
    if (this.currentNavigationContext) {
      const context = this.currentNavigationContext;
      let contextInfo = '';

      if (context.currentItem && context.totalItems) {
        contextInfo += ` Item ${context.currentItem} of ${context.totalItems}.`;
      }

      if (context.currentSection) {
        contextInfo += ` In ${context.currentSection} section.`;
      }

      if (context.culturalMode) {
        contextInfo += ` Cultural mode: ${context.culturalMode}.`;
      }

      return message + contextInfo;
    }

    return message;
  }

  private simplifyMessage(message: string): string {
    // Keep only essential information
    return message
      .split('.')[0] // Take first sentence
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private queueAnnouncement(
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    culturalContext?: string
  ): void {
    const announcement: AnnouncementQueue = {
      id: `announcement_${Date.now()}_${Math.random()}`,
      message,
      priority,
      culturalContext,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: priority === 'urgent' ? 3 : 1
    };

    this.announcementQueue.push(announcement);
    this.sortAnnouncementQueue();

    if (!this.isProcessingQueue) {
      this.processAnnouncementQueue();
    }
  }

  private sortAnnouncementQueue(): void {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    
    this.announcementQueue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isScreenReaderActive) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift()!;
      
      try {
        await this.makeAnnouncement(announcement.message);
        
        // Repeat important messages if configured
        if (this.config.repeatImportantMessages && announcement.priority === 'urgent') {
          await this.delay(1000);
          await this.makeAnnouncement(`Repeating: ${announcement.message}`);
        }
        
      } catch (error) {
        console.error('Error making announcement:', error);
        
        // Retry if possible
        if (announcement.retryCount < announcement.maxRetries) {
          announcement.retryCount++;
          this.announcementQueue.unshift(announcement);
          await this.delay(500);
        }
      }

      // Pause between announcements
      await this.delay(this.config.pauseBetweenAnnouncements);
    }

    this.isProcessingQueue = false;
  }

  private async makeAnnouncement(message: string): Promise<void> {
    try {
      AccessibilityInfo.announceForAccessibility(message);
      this.lastAnnouncementTime = Date.now();
    } catch (error) {
      console.error('Error in announceForAccessibility:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async announceNavigation(
    destination: string,
    context?: NavigationContext
  ): Promise<void> {
    if (context) {
      this.currentNavigationContext = context;
    }

    let message = `Navigating to ${destination}`;
    
    if (this.config.elderlyOptimizations) {
      message += '. Use simple swipe gestures to explore, or double-tap to select items.';
    }

    if (context?.culturalMode) {
      message += ` You are in ${context.culturalMode} cultural mode.`;
    }

    await this.announce(message, 'high');
  }

  async announceConversationStart(culturalContext: string): Promise<void> {
    const message = this.config.elderlyOptimizations
      ? `Starting conversation in ${culturalContext} cultural context. Speak naturally, and the app will respond with cultural understanding. You can ask about traditions, memories, or family stories.`
      : `Conversation started in ${culturalContext} mode.`;

    await this.announce(message, 'high', culturalContext);
  }

  async announceConversationEnd(duration: number): Promise<void> {
    const minutes = Math.round(duration / 60000);
    const message = `Conversation ended. Duration: ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
    
    await this.announce(message, 'medium');
  }

  async announceError(errorMessage: string, isRecoverable: boolean = true): Promise<void> {
    let message = this.config.elderlyOptimizations
      ? `There was a small problem: ${errorMessage}.`
      : `Error: ${errorMessage}`;

    if (isRecoverable) {
      message += this.config.elderlyOptimizations
        ? ' Don\'t worry, you can try again or ask for help.'
        : ' Please try again.';
    } else {
      message += this.config.elderlyOptimizations
        ? ' Please ask a family member or caregiver for assistance.'
        : ' Please contact support.';
    }

    await this.announce(message, 'urgent');
  }

  async announceSuccess(action: string): Promise<void> {
    const message = this.config.elderlyOptimizations
      ? `Great! ${action} completed successfully.`
      : `${action} successful.`;

    await this.announce(message, 'medium');
  }

  async announceVoiceInteraction(
    type: 'listening' | 'processing' | 'responding',
    culturalContext?: string
  ): Promise<void> {
    let message = '';

    switch (type) {
      case 'listening':
        message = this.config.elderlyOptimizations
          ? 'I\'m listening. Please speak clearly and take your time.'
          : 'Listening for voice input.';
        break;
      case 'processing':
        message = this.config.elderlyOptimizations
          ? 'I\'m thinking about what you said. This may take a moment.'
          : 'Processing your request.';
        break;
      case 'responding':
        message = this.config.elderlyOptimizations
          ? 'Here is my response:'
          : 'Responding.';
        break;
    }

    await this.announce(message, 'medium', culturalContext);
  }

  registerElement(element: AccessibleElement): void {
    this.registeredElements.set(element.id, element);
  }

  unregisterElement(elementId: string): void {
    this.registeredElements.delete(elementId);
  }

  async announceElementFocus(elementId: string): Promise<void> {
    const element = this.registeredElements.get(elementId);
    if (!element) return;

    let message = element.label;

    if (element.role && this.config.verbosity !== 'minimal') {
      message += `, ${element.role}`;
    }

    if (element.value) {
      message += `, current value: ${element.value}`;
    }

    if (element.hint && this.config.verbosity === 'detailed') {
      message += `. ${element.hint}`;
    }

    if (element.elderlyFriendly && this.config.elderlyOptimizations) {
      message += '. This is designed to be easy to use.';
    }

    await this.announce(message, 'low', element.culturalContext);
  }

  async announceCulturalSwitch(fromCulture: string, toCulture: string): Promise<void> {
    const message = this.config.elderlyOptimizations
      ? `Switching from ${fromCulture} to ${toCulture} cultural context. The app will now respond with ${toCulture} cultural understanding and appropriate greetings.`
      : `Cultural context changed from ${fromCulture} to ${toCulture}.`;

    await this.announce(message, 'high', toCulture);
  }

  async announceHealthcareIntegration(action: string): Promise<void> {
    const message = this.config.elderlyOptimizations
      ? `Healthcare information ${action}. Your conversations and wellness indicators are being shared with your healthcare team as configured.`
      : `Healthcare integration: ${action}.`;

    await this.announce(message, 'medium');
  }

  async announcePrivacyAction(action: string, culturalContext?: string): Promise<void> {
    let message = `Privacy setting: ${action}`;

    if (culturalContext && this.config.elderlyOptimizations) {
      message += `. This respects ${culturalContext} cultural privacy preferences.`;
    }

    await this.announce(message, 'medium', culturalContext);
  }

  updateConfig(newConfig: Partial<ScreenReaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();

    if (newConfig.enabled !== undefined && this.isScreenReaderActive) {
      const message = newConfig.enabled
        ? 'Screen reader support enabled.'
        : 'Screen reader support disabled.';
      this.announce(message, 'medium');
    }
  }

  getConfig(): ScreenReaderConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isScreenReaderActive && this.config.enabled;
  }

  async testAnnouncement(): Promise<void> {
    await this.announce(
      'This is a test announcement for the Cultural Companion app. Screen reader integration is working properly.',
      'medium'
    );
  }

  clearQueue(): void {
    this.announcementQueue = [];
  }

  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    lastAnnouncementTime: number;
  } {
    return {
      queueLength: this.announcementQueue.length,
      isProcessing: this.isProcessingQueue,
      lastAnnouncementTime: this.lastAnnouncementTime
    };
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('screen_reader_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving screen reader config:', error);
    }
  }

  private async loadStoredConfig(): Promise<void> {
    try {
      const storedConfig = await AsyncStorage.getItem('screen_reader_config');
      if (storedConfig) {
        this.config = { ...this.config, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.error('Error loading screen reader config:', error);
    }
  }

  async clearStoredData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('screen_reader_config');
      this.registeredElements.clear();
      this.clearQueue();
    } catch (error) {
      console.error('Error clearing screen reader data:', error);
    }
  }
}

export default new ScreenReaderService();