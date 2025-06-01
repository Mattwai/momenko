# Momenko Development Build Guide

## Development Build Requirements

This guide explains how to set up and use the Momenko development build with real-time voice capabilities. The development build provides:

- Native speech recognition through DeepSeek API
- High-quality voice synthesis with ElevenLabs
- Real-time WebSocket voice communication
- Natural conversational AI integration

## Prerequisites

Before using the development build, ensure you have:

- Node.js (v18+)
- Yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode (14+) installed
- For Android: Android Studio with SDK tools
- DeepSeek API key (required for speech recognition)
- ElevenLabs API key (required for voice synthesis)

## Environment Setup

1. Make sure your `.env.development` file is properly configured:

```
APP_ENV=development
DEBUG_MODE=true
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
```

## Creating a Development Build

### 1. Install Dependencies

```bash
cd momenko
yarn install
```

### 2. Update Expo SDK Configuration

Ensure the following dependencies are included in your package.json:

```json
"dependencies": {
  "expo-file-system": "^15.0.0",
  "expo-dev-client": "^3.0.0",
  "buffer": "^6.0.3"
}
```

If any are missing:

```bash
yarn add expo-file-system expo-dev-client buffer
```

### 3. Create Development Build

#### For iOS:

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

#### For Android:

```bash
npx expo prebuild --platform android
npx expo run:android
```

This creates native project files in the `ios/` and `android/` directories and runs the app.

## Using Real-Time Voice Features

After switching to a development build, your app will automatically use the real native speech recognition with the DeepSeek and ElevenLabs integration.

### Key Features in Development Build:

1. **DeepSeek Speech Recognition**: Accurate, real-time speech-to-text conversion
2. **WebSocket Communication**: Real-time processing with DeepSeek AI
3. **ElevenLabs Voices**: High-quality natural-sounding speech synthesis
4. **Silence Detection**: Automatically stops listening when the user stops speaking

## Configuration Options

You can customize the voice behavior in `src/config/index.ts`:

```typescript
voice: {
  autoStopOnSilence: true,
  defaultSilenceTimeout: 3, // seconds
  maxTranscriptLength: 5000,
  recognitionTimeoutMs: 300000, // 5 minutes
}
```

## Testing the Voice Communication

1. Open the Voice Debug Screen to verify all components are working
2. Test voice recognition and TTS with the Manual Voice Test controls
3. Verify that both speech recognition and voice synthesis are working

## Troubleshooting

### Common Issues

1. **Build Errors**:
   - Run `yarn install` to ensure all dependencies are installed
   - Try `npx expo prebuild --clean` to reset the native projects

2. **"DeepSeek API error" or "WebSocket connection failed"**:
   - Check your internet connection
   - Verify your DeepSeek API key is correctly set in .env.development
   - Confirm the DeepSeek API URL is correct

3. **"ElevenLabs API error"**:
   - Verify your ElevenLabs API key is correctly set
   - Check your API usage quota
   - Ensure you're using a valid voice ID

4. **No sound from ElevenLabs voices**:
   - Ensure device volume is turned up
   - Check that audio permissions are granted
   - Try a different voice ID in the configuration

5. **Speech Recognition Not Working**:
   - Ensure microphone permissions are granted
   - Check internet connection (required for DeepSeek API)
   - Restart the app after granting permissions

### Debug Tools

Use the Voice Debug Screen to run diagnostics and identify any issues with your setup.

## Voice Service Architecture

The app uses a two-part voice architecture:
1. **DeepSeek API** for speech recognition (speech-to-text)
2. **ElevenLabs API** for voice synthesis (text-to-speech)

These services work together to enable natural conversations with high-quality voices.

## Additional Resources

- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference/text-to-speech)
- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [Expo Development Client Guide](https://docs.expo.dev/development/create-development-builds/)

## Performance Considerations

- Real-time voice communication uses significant data and battery
- Monitor API usage to avoid unexpected costs (both services have usage limits)
- Consider caching frequently used voice responses for better performance

Happy developing!