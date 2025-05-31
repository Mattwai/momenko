/// <reference types="react-native" />

export interface AudioContextType {
  baseLatency: number;
  outputLatency: number;
  destination: AudioDestinationNode;
  sampleRate: number;
  state: AudioContextState;
  listener: AudioListener;
  close(): Promise<void>;
  createBuffer(): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
  createMediaElementSource(): MediaElementAudioSourceNode;
  createGain(): GainNode;
  createMediaStreamDestination(): { stream: MediaStream };
  createMediaStreamSource(): MediaStreamAudioSourceNode;
}

interface ProcessType {
  env: Record<string, string | undefined>;
  version: string;
  platform: string;
}

interface CustomGlobal {
  Buffer: typeof import('buffer').Buffer;
  process: ProcessType;
  TextEncoder: typeof import('text-encoding').TextEncoder;
  TextDecoder: typeof import('text-encoding').TextDecoder;
  ReadableStream: typeof import('web-streams-polyfill').ReadableStream;
  WritableStream: typeof import('web-streams-polyfill').WritableStream;
  TransformStream: typeof import('web-streams-polyfill').TransformStream;
  AudioContext: {
    new(): AudioContextType;
  };
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
  setInterval: (callback: () => void, delay: number) => number;
  clearInterval: (id: number) => void;
}

declare global {
  interface Window extends CustomGlobal {
    // React Native specific window properties
    ReactNativeWebView?: unknown;
    webkitAudioContext?: typeof AudioContext;
  }
  var window: Window;
  interface globalThis extends CustomGlobal {
    // Node.js/React Native global properties
    __DEV__?: boolean;
    webkitAudioContext?: typeof AudioContext;
  }
  
  // Global timer functions
  var setTimeout: (callback: () => void, delay: number) => number;
  var clearTimeout: (id: number) => void;
  var setInterval: (callback: () => void, delay: number) => number;
  var clearInterval: (id: number) => void;
}

export {}; 