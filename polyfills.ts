import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import process from 'process';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
import type { AudioContextType } from './src/types/global';

// Ensure WebSocket is available (React Native provides it natively)
if (typeof globalThis.WebSocket === 'undefined') {
  throw new Error('WebSocket is not available in this React Native environment.');
}

// Buffer polyfill
globalThis.Buffer = Buffer;

// Process polyfill
if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}

// TextEncoder and TextDecoder polyfills if needed
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Streams API polyfills
if (typeof globalThis.ReadableStream === 'undefined') {
  Object.assign(globalThis, {
    ReadableStream,
    WritableStream,
    TransformStream
  });
}

// Audio Context polyfill
if (typeof globalThis.AudioContext === 'undefined' && typeof (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext === 'undefined') {
  // Simple mock for AudioContext since we're using expo-av for actual audio handling
  class MockAudioContext implements AudioContextType {
    readonly baseLatency = 0;
    readonly outputLatency = 0;
    readonly destination = {} as AudioDestinationNode;
    readonly sampleRate = 44100;
    readonly state = 'running' as AudioContextState;
    readonly listener = {} as AudioListener;

    constructor() {
      console.warn('AudioContext is not available in React Native, using mock implementation');
    }

    close() { return Promise.resolve(); }
    createBuffer() { return {} as AudioBuffer; }
    createBufferSource() { return {} as AudioBufferSourceNode; }
    createMediaElementSource() { return {} as MediaElementAudioSourceNode; }
    createGain() { return {} as GainNode; }
    createMediaStreamDestination() { return { stream: {} as MediaStream }; }
    createMediaStreamSource() { return {} as MediaStreamAudioSourceNode; }
  }

  Object.assign(globalThis, {
    AudioContext: MockAudioContext as unknown as typeof AudioContext
  });
}