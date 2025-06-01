# Momenko Development Build Guide

## Why Use a Development Build?

Expo Go is great for rapid development, but it has limitations when it comes to native functionality like speech recognition. The error logs you're seeing are because Expo Go doesn't fully support the native voice APIs. A development build gives you access to:

- Native speech recognition capabilities
- Real-time WebSocket voice communication
- ElevenLabs high-quality voice synthesis
- DeepSeek AI integration for natural conversations

## Prerequisites

Before creating a development build, ensure you have:

- Node.js (v18+)
- Yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode (14+) installed
- For Android: Android Studio with SDK tools
- DeepSeek API key (for AI processing)
- ElevenLabs API key (for natural voice output)

## Environment Setup

1. Make sure your `.env.development` file is properly configured:

```
APP_ENV=development
DEBUG_MODE=true
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
AZURE_SPEECH_KEY=your_azure_key (optional)
AZURE_SPEECH_REGION=australiaeast (optional)
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

### Key Features Enabled in Development Build:

1. **Native Speech Recognition**: Uses the device's speech recognition engine
2. **WebSocket Communication**: Real-time processing with DeepSeek AI
3. **ElevenLabs Voices**: High-quality natural-sounding speech
4. **Silence Detection**: Automatically stops listening when the user stops speaking

## Configuration Options

You can customize the voice behavior in `src/config/index.ts`:

```typescript
voice: {
  autoStopOnSilence: true,
  defaultSilenceTimeout: 3, // seconds
  maxTranscriptLength: 5000,
  recognitionTimeoutMs: 300000, // 5 minutes
  useNativeSpeech: true,
  fallbackToAzure: false,
}
```

## Testing the Voice Communication

1. Open the Voice Debug Screen to verify all components are working
2. Check that "Speech Mode" shows "Native" instead of "Simulation"
3. Test voice recognition and TTS with the Manual Voice Test controls

## Troubleshooting

### Common Issues

1. **Build Errors**:
   - Run `yarn install` to ensure all dependencies are installed
   - Try `npx expo prebuild --clean` to reset the native projects

2. **"WebSocket connection failed"**:
   - Check your internet connection
   - Verify your DeepSeek API key is correctly set in .env.development

3. **"ElevenLabs API error"**:
   - Verify your ElevenLabs API key is correctly set
   - Check your API usage quota

4. **No sound from ElevenLabs voices**:
   - Ensure device volume is turned up
   - Check that audio permissions are granted
   - Try a different voice ID in the configuration

5. **Speech Recognition Not Working**:
   - Ensure microphone permissions are granted
   - Check if the device language matches your app's language setting
   - Restart the app after granting permissions

### Debug Tools

Use the Voice Debug Screen to run diagnostics and identify any issues with your setup.

## Additional Resources

- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference/text-to-speech)
- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [Expo Development Client Guide](https://docs.expo.dev/development/create-development-builds/)

## Performance Considerations

- Real-time voice communication can use significant battery and data
- Consider implementing an "offline mode" for basic functionality without API calls
- Monitor API usage to avoid unexpected costs

Happy developing!