# Voice Communication Services

This directory contains the voice communication services used in the Momenko app for speech recognition and synthesis.

## Overview

The voice communication system combines two key APIs:

- **DeepSeek API** - For high-quality speech recognition (speech-to-text)
- **ElevenLabs API** - For natural-sounding voice synthesis (text-to-speech)

## Architecture

The system is organized into the following components:

1. **VoiceCommunicationService** - Core service that integrates speech recognition and synthesis
2. **AudioManager** - Handles audio recording and playback
3. **useVoiceCommunication** - React hook for easy integration in components

## Setup Requirements

1. **API Keys**: Obtain API keys for both services and add to `.env.development`:
   ```
   DEEPSEEK_API_KEY=your_deepseek_key
   DEEPSEEK_API_URL=https://api.deepseek.com
   ELEVEN_LABS_API_KEY=your_elevenlabs_key
   ```

2. **Development Build**: This service requires a development build (not Expo Go) to access native voice capabilities.

## DeepSeek API Integration

The service uses two DeepSeek endpoints:

- **REST API**: `https://api.deepseek.com/v1/audio/transcribe`
- **WebSocket API**: `wss://api.deepseek.com/v1/audio/streaming`

The WebSocket API provides real-time transcription with interim results, while the REST API is used for processing recorded audio files.

## ElevenLabs API Integration

Voice synthesis uses the ElevenLabs streaming endpoint:

- **Voice Synthesis**: `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream`

Default voices are configured for different languages:
- English: "Rachel" voice (EXAVITQu4vr4xnSDxMaL)
- Chinese: "Chinese" voice (21m00Tcm4TlvDq8ikWAM)
- Māori: "Adam" voice (pNInz6obpgDQGcFmaJgB)

## Usage Example

```typescript
import { VoiceCommunicationService } from '../services/voice/VoiceCommunicationService';

// Create instance
const voiceService = new VoiceCommunicationService({
  preferredLanguage: 'en',
  onTranscriptUpdate: (text, isFinal) => {
    console.log(`Transcript: ${text}, Final: ${isFinal}`);
  },
  onError: (error) => {
    console.error('Voice error:', error);
  }
});

// Start listening
await voiceService.startListening();

// Speak text
await voiceService.speak('Hello, how can I help you today?');

// Stop listening
await voiceService.stopListening();

// Clean up resources
await voiceService.cleanup();
```

## React Hook Usage

For React components, use the provided hook:

```typescript
import { useVoiceCommunication } from '../../hooks/useVoiceCommunication';

function MyComponent() {
  const {
    isListening,
    isSpeaking,
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    speak
  } = useVoiceCommunication({
    preferredLanguage: 'en',
    onTranscriptUpdate: (text, isFinal) => {
      // Handle transcript updates
    }
  });
  
  // Use the voice services in your component
}
```

## API Options

### VoiceCommunicationService Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| preferredLanguage | 'en' \| 'zh' \| 'mi' | The language for speech recognition |
| voiceId | string | (Optional) ElevenLabs voice ID |
| modelId | string | (Optional) DeepSeek model ID |
| stability | number | (Optional) Voice stability (0.0-1.0) |
| similarityBoost | number | (Optional) Voice similarity boost (0.0-1.0) |
| onTranscriptUpdate | function | Callback for transcript updates |
| onError | function | Callback for errors |
| onSpeechStart | function | Callback when speech synthesis starts |
| onSpeechEnd | function | Callback when speech synthesis ends |

## Troubleshooting

Common issues and solutions:

1. **WebSocket Connection Errors**: Check your DeepSeek API key and network connection.

2. **No Audio Output**: Verify ElevenLabs API key and voice ID.

3. **Recording Errors**: If you see "Only one Recording object can be prepared at a given time", make sure to properly clean up between recording sessions.

For detailed troubleshooting, see the [VOICE_TROUBLESHOOTING.md](../../../VOICE_TROUBLESHOOTING.md) guide.

## Performance Considerations

- Audio recording and streaming can use significant battery and data
- API usage may incur costs from both DeepSeek and ElevenLabs
- Consider implementing rate limiting or caching for production use

## References

- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference)