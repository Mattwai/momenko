import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Ensure WebSocket is available (React Native provides it natively)
if (typeof global.WebSocket === 'undefined') {
  throw new Error('WebSocket is not available in this React Native environment.');
}

global.Buffer = Buffer;

// Polyfill process if needed
if (typeof global.process === 'undefined') {
  global.process = require('process');
}