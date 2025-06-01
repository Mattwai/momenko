# Phase 3: Cultural Intelligence & Conversation

## Overview

Phase 3 implements a comprehensive cultural intelligence and conversation management system for Momenko, providing culturally-aware AI interactions that adapt to Māori, Chinese, and Western cultural contexts. This phase focuses on respectful, stigma-aware communication with appropriate family involvement levels.

## Architecture

### Core Components

```
src/services/cultural/
├── CulturalContextService.ts      # Cultural adaptation engine
├── SpeechCacheService.ts          # Intelligent phrase caching
└── index.ts                       # Service exports

src/hooks/
└── useConversationState.ts       # Conversation state management

src/contexts/
└── CulturalContext.tsx           # Enhanced cultural context provider

src/components/
└── CulturalIntelligenceDemo.tsx  # Demo and testing component
```

## Step 7: Cultural Context System

### CulturalContextService

The `CulturalContextService` provides cultural adaptation capabilities with profiles for three main cultural groups:

#### Cultural Profiles

**Māori Profile:**
- Terminology: `mate wareware` (dementia), `whānau` (family)
- Communication: Indirect, respectful
- Family Structure: Whānau-centered
- Spiritual Aspects: Journey-based perspective
- Stigma Level: Low

**Chinese Profile:**
- Terminology: `痴呆症` (dementia), `家庭` (family)
- Communication: Hierarchical, respectful
- Family Structure: Filial piety-based
- Spiritual Aspects: Karma concepts
- Stigma Level: High (requires sensitive handling)

**Western Profile:**
- Terminology: Direct medical terms
- Communication: Direct medical approach
- Family Structure: Individual-focused
- Spiritual Aspects: Optional
- Stigma Level: Moderate

#### Key Features

1. **Automatic Cultural Detection:**
```typescript
detectCulturalPreferences(
  userId: string, 
  conversationHistory: string[],
  languageUsage: Record<PreferredLanguage, number>
): CulturalGroup
```

2. **Response Adaptation:**
```typescript
getAdaptedResponse(
  culturalGroup: CulturalGroup,
  context: ConversationContext,
  baseMessage: string,
  variables?: Record<string, string>
): string
```

3. **Terminology Mapping:**
```typescript
adaptTerminology(message: string, culturalGroup: CulturalGroup): string
```

4. **Family Involvement Guidance:**
```typescript
getFamilyInvolvementLevel(
  culturalGroup: CulturalGroup, 
  context: ConversationContext
): 'high' | 'medium' | 'low'
```

5. **Stigma Handling Strategies:**
```typescript
getStigmaHandlingStrategy(culturalGroup: CulturalGroup): {
  directness: 'high' | 'medium' | 'low';
  familyInvolvement: 'required' | 'recommended' | 'optional';
  terminologyPreference: 'medical' | 'euphemistic' | 'cultural';
}
```

## Step 8: Smart Caching System

### SpeechCacheService

The `SpeechCacheService` implements intelligent phrase caching with cultural awareness and usage analytics.

#### Cultural Phrase Sets

Each cultural group has predefined phrase collections:

**Categories:**
- Greetings (morning, afternoon, evening, general)
- Responses (acknowledgments, comfort, encouragement, understanding)
- Check-ins (wellbeing, memory, mood, needs)
- Transitions (topic change, ending, clarification)

#### Key Features

1. **Cache Warming:**
```typescript
warmCacheForUser(culturalGroup: CulturalGroup, userId: string): Promise<void>
```

2. **Usage Analytics:**
```typescript
interface CacheUsageAnalytics {
  phraseId: string;
  useCount: number;
  lastUsed: Date;
  contextFrequency: Record<ConversationContext, number>;
  timeOfDayUsage: Record<string, number>;
  userSatisfactionScore: number;
}
```

3. **Cultural Appropriateness Validation:**
```typescript
validateCulturalAppropriateness(
  content: string,
  culturalGroup: CulturalGroup
): { isAppropriate: boolean; concerns: string[] }
```

4. **Phrase Retrieval:**
```typescript
getCachedPhrase(
  content: string,
  culturalGroup: CulturalGroup,
  context: ConversationContext
): Promise<CachedPhrase | null>
```

5. **Cache Optimization:**
```typescript
optimizeCache(): Promise<void>
```

#### Example Cultural Phrases

**Māori:**
- Greetings: `Kia ora`, `Tēnā koe`, `Ata mārie`
- Comfort: `Kia kaha`, `Kei konei au`, `He tautoko tēnei`
- Understanding: `Mārama ana`, `Mōhio ana au`, `Kia aroha`

**Chinese:**
- Greetings: `您好`, `早上好`, `您辛苦了`
- Comfort: `别担心`, `我理解`, `会好起来的`
- Understanding: `我理解`, `我懂您的意思`

**Western:**
- Greetings: `Hello`, `How are you?`, `Good morning`
- Comfort: `I'm here for you`, `It's okay`, `You're not alone`
- Understanding: `I understand`, `I hear you`, `That makes sense`

## Step 9: Conversation State Management

### useConversationState Hook

Comprehensive conversation management with cultural awareness.

#### Core Features

1. **Conversation Lifecycle:**
```typescript
startConversation(culturalProfile: CulturalProfile): Promise<void>
endConversation(): Promise<void>
pauseConversation(): void
resumeConversation(): void
```

2. **Message Management:**
```typescript
addMessage(
  content: string, 
  speaker: 'user' | 'assistant', 
  metadata?: Partial<ConversationMessage>
): Promise<void>
```

3. **Cultural Adaptation:**
```typescript
getAdaptedResponse(
  baseMessage: string, 
  variables?: Record<string, string>
): Promise<string>

getCulturallyAppropriateGreeting(): Promise<string>
```

4. **Family Involvement:**
```typescript
getFamilyInvolvementGuidance(): {
  level: 'high' | 'medium' | 'low';
  guidance: string;
}

checkFamilyInvolvementRequirement(): boolean
suggestFamilyInvolvement(): string | null
```

5. **Privacy & Cultural Sensitivity:**
```typescript
shouldShareInformation(
  informationType: 'medical' | 'personal' | 'family'
): boolean

getPrivacyGuidance(): string
```

6. **Context Management:**
```typescript
setConversationContext(context: ConversationContext): void
setEmotionalState(state: EmotionalState): void
setConversationMode(mode: ConversationMode): void
```

7. **Interruption Handling:**
```typescript
interface ConversationInterruption {
  timestamp: Date;
  context: ConversationContext;
  messageIndex: number;
  reason: 'user_initiated' | 'technical' | 'emergency' | 'timeout';
}
```

8. **Analytics & Summary:**
```typescript
getConversationSummary(): {
  messageCount: number;
  duration: number;
  emotionalJourney: EmotionalState[];
  contextSwitches: ConversationContext[];
}
```

## Enhanced Cultural Context Provider

### Updated CulturalContext

The enhanced `CulturalContext` integrates with the new services:

```typescript
interface CulturalContextType {
  // Core profile management
  culturalProfile: CulturalProfile;
  updateCulturalProfile: (profile: Partial<CulturalProfile>) => void;
  setPreferredLanguage: (language: PreferredLanguage) => void;
  
  // Cultural adaptation methods
  getAdaptedResponse: (baseMessage: string, context: ConversationContext, variables?: Record<string, string>) => string;
  getCulturalGreeting: (timeOfDay?: 'morning' | 'afternoon' | 'evening') => string;
  getFamilyInvolvementGuidance: () => { level: 'high' | 'medium' | 'low'; guidance: string };
  adaptTerminology: (message: string) => string;
  
  // Cultural detection
  detectCulturalPreferences: (conversationHistory: string[], languageUsage: Record<PreferredLanguage, number>) => Promise<CulturalGroup>;
  
  // Cache management
  warmSpeechCache: () => Promise<void>;
  getCachedPhrase: (content: string, context: ConversationContext) => Promise<any>;
  
  // Cultural sensitivity
  validateCulturalAppropriateness: (content: string) => { isAppropriate: boolean; concerns: string[] };
  getStigmaHandlingStrategy: () => { directness: 'high' | 'medium' | 'low'; familyInvolvement: 'required' | 'recommended' | 'optional'; terminologyPreference: 'medical' | 'euphemistic' | 'cultural' };
}
```

## Usage Examples

### Basic Cultural Adaptation

```typescript
import { useCulturalContext } from '../contexts/CulturalContext';

const MyComponent = () => {
  const { getAdaptedResponse, culturalProfile } = useCulturalContext();
  
  const handleMessage = () => {
    const baseMessage = "How is your memory today?";
    const adapted = getAdaptedResponse(baseMessage, 'memory');
    // Returns culturally appropriate version based on current profile
  };
};
```

### Conversation Management

```typescript
import { useConversationState } from '../hooks/useConversationState';

const ConversationComponent = () => {
  const {
    startConversation,
    addMessage,
    getCulturallyAppropriateGreeting,
    getFamilyInvolvementGuidance
  } = useConversationState('user123');
  
  const initializeConversation = async () => {
    await startConversation(culturalProfile);
    const greeting = await getCulturallyAppropriateGreeting();
    await addMessage(greeting, 'assistant');
  };
};
```

### Cultural Detection

```typescript
const detectUserCulture = async () => {
  const history = ['Hello', 'How is my whānau?', 'Kia ora'];
  const langUsage = { en: 8, mi: 4, zh: 0 };
  
  const detected = await detectCulturalPreferences(history, langUsage);
  // Returns 'maori' based on whānau usage and mi language
};
```

## Cultural Considerations

### Māori Cultural Guidelines

1. **Whānau Centrality**: Always consider family involvement in healthcare decisions
2. **Spiritual Journey**: Frame dementia as a spiritual journey rather than medical condition
3. **Respectful Communication**: Use indirect, respectful language patterns
4. **Cultural Terms**: Prefer `mate wareware` over clinical terminology

### Chinese Cultural Guidelines

1. **Face-Saving**: Avoid direct medical terminology that may cause shame
2. **Hierarchical Respect**: Address family elders with appropriate titles
3. **Filial Piety**: Emphasize family responsibility and honor
4. **Stigma Awareness**: Use euphemistic language for sensitive topics

### Western Cultural Guidelines

1. **Individual Autonomy**: Respect personal choice and independence
2. **Medical Directness**: Use clear, medical terminology when appropriate
3. **Privacy Rights**: Emphasize individual control over information sharing
4. **Professional Approach**: Maintain clinical but empathetic tone

## Testing

### CulturalIntelligenceDemo Component

The demo component provides comprehensive testing for all Phase 3 features:

```typescript
<CulturalIntelligenceDemo />
```

**Features tested:**
- Cultural profile switching
- Message adaptation
- Greeting generation
- Family involvement guidance
- Cultural detection
- Cache warming and retrieval
- Conversation state management
- Privacy and sensitivity features

### Test Scenarios

1. **Cultural Switching**: Test adaptation when changing between cultures
2. **Message Adaptation**: Verify appropriate terminology and tone changes
3. **Family Involvement**: Confirm appropriate guidance levels
4. **Cache Performance**: Monitor cache hit rates and optimization
5. **Detection Accuracy**: Validate cultural preference detection
6. **Privacy Compliance**: Ensure appropriate information sharing levels

## Integration Guide

### 1. Initialize Services

```typescript
import { initializeCulturalServices } from '../services/cultural';

const services = await initializeCulturalServices('userId', 'culturalGroup');
```

### 2. Wrap App with Providers

```typescript
import { CulturalProvider } from '../contexts/CulturalContext';

<CulturalProvider>
  <YourApp />
</CulturalProvider>
```

### 3. Use in Components

```typescript
const { culturalProfile, getAdaptedResponse } = useCulturalContext();
const { startConversation, addMessage } = useConversationState(userId);
```

## Performance Considerations

### Cache Management

- **Auto-warming**: Priority phrases pre-generated on user login
- **Usage analytics**: Track phrase popularity for optimization
- **Expiration**: 30-day automatic cache cleanup
- **Size limits**: Configurable per-culture cache limits

### Cultural Detection

- **Incremental learning**: Updates detection based on ongoing conversations
- **Lightweight scoring**: Efficient pattern matching algorithms
- **Fallback handling**: Graceful degradation to default profiles

## Future Enhancements

### Planned Features

1. **Additional Cultures**: Pacific Islander, Indian, European variants
2. **Advanced ML Detection**: Neural network-based cultural preference learning
3. **Voice Pattern Analysis**: Accent and speech pattern cultural indicators
4. **Community Feedback**: Cultural consultant validation system
5. **Adaptive Learning**: Personal preference learning within cultural frameworks

### Extensibility

The system is designed for easy extension:

```typescript
culturalService.registerNewCulture(
  'pacific_islander',
  culturalProfile,
  responsePatterns,
  conversationFlow
);
```

## Commit Commands

Before committing changes, ensure the build is successful and there are no linting errors:

```bash
yarn lint
yarn build  # or appropriate build command
```

Then commit with appropriate cultural intelligence prefix:

```bash
git add .
git commit -m "Feat(cultural): implement Phase 3 cultural intelligence system with adaptive conversation management"
```

Don't forget to commit!