import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import process from 'process';

// Ensure WebSocket is available (React Native provides it natively)
if (typeof globalThis.WebSocket === 'undefined') {
  throw new Error('WebSocket is not available in this React Native environment.');
}

globalThis.Buffer = Buffer;

// Polyfill process if needed
if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}