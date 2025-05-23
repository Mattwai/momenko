# Momenko - Cognitive Health App

An app for elderly users with dementia that uses AI to provide cognitive stimulation therapy and personalized conversations.

## Development Setup

### Prerequisites
- Node.js 16+
- Yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: XCode and CocoaPods
- For Android: Android Studio with SDK tools
- ElevenLabs API key (for natural voice synthesis)

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```bash
AI_API_KEY=your_ai_api_key
AI_API_URL=your_ai_api_url
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
```

### Installation
1. Clone the repository
2. Install dependencies: `yarn install`
3. Install native dependencies: `yarn add @react-native-voice/voice expo-av`

## Running the App

### Development Build (Recommended for Voice Features)
Voice recognition and natural speech synthesis require native modules that aren't supported in Expo Go. Use a development build instead:

#### iOS Development Build
```bash
# Create a development build
npx expo prebuild

# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS device or simulator
npx expo run:ios --device
```

#### Android Development Build
```bash
# Create a development build
npx expo prebuild

# Run on Android device or emulator
npx expo run:android
```

### Using Expo Go (Limited Features)
```bash
# Start the Expo development server
yarn start
```
⚠️ Voice recognition and natural speech won't work in Expo Go.

## Testing on Physical Devices

### iOS Development Build on Physical Device
1. Connect your iPhone to your Mac
2. Open `ios/momenko.xcworkspace` in Xcode
3. Select your device in the device dropdown
4. Click the play button to build and run

### Android Development Build on Physical Device
1. Connect your Android device with USB debugging enabled
2. Run: `npx expo run:android`

### Expo Go on Physical Device
1. Run: `npx expo start`
2. Scan the QR code with your device's camera
3. (Voice features won't work)

## Development Notes

- The chatbot uses Supabase for message storage
- Voice recognition uses @react-native-voice/voice 
- Natural speech synthesis uses ElevenLabs API
- The app is built with React Native and Expo

## Voice Features

### ElevenLabs Integration
The app uses ElevenLabs' advanced text-to-speech API for natural and human-like voice synthesis. This provides:
- High-quality, natural-sounding voice
- Emotional expression and proper intonation
- Consistent voice personality
- Elderly-friendly speech patterns and pacing

To customize the voice:
1. Log in to your ElevenLabs account
2. Choose or create a voice that suits your needs
3. Update the `voiceId` in `src/services/ai/ElevenLabsService.ts`

## Troubleshooting

### Voice Recognition Issues
- Ensure microphone permissions are granted
- Try using a development build instead of Expo Go
- Check the console for speech recognition errors

### Speech Synthesis Issues
- Verify your ElevenLabs API key is correctly set in `.env`
- Check network connectivity
- Monitor API usage limits
- Look for errors in the console