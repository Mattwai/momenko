# Momenko - Cognitive Health App

An app for elderly users with dementia that uses AI to provide cognitive stimulation therapy and personalized conversations.

## Development Setup

### Prerequisites
- Node.js 16+
- Yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: XCode and CocoaPods
- For Android: Android Studio with SDK tools

### Installation
1. Clone the repository
2. Install dependencies: `yarn install`
3. Install native dependencies: `yarn add @react-native-voice/voice react-native-tts`

## Running the App

### Development Build (Recommended for Voice Features)
Voice recognition and text-to-speech require native modules that aren't supported in Expo Go. Use a development build instead:

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
⚠️ Voice recognition and TTS won't work in Expo Go.

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
- Text-to-speech uses react-native-tts
- The app is built with React Native and Expo

## Troubleshooting

### Voice Recognition Issues
- Ensure microphone permissions are granted
- Try using a development build instead of Expo Go
- Check the console for speech recognition errors

### TTS Issues
- Verify TTS is properly initialized
- Use available voices from `Tts.voices()` rather than hardcoded ones
- Break long text into sentences for more reliable TTS