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

interface CustomGlobal {
  Buffer: typeof import('buffer').Buffer;
  process: NodeJS.Process;
  TextEncoder: typeof import('text-encoding').TextEncoder;
  TextDecoder: typeof import('text-encoding').TextDecoder;
  ReadableStream: typeof import('web-streams-polyfill').ReadableStream;
  WritableStream: typeof import('web-streams-polyfill').WritableStream;
  TransformStream: typeof import('web-streams-polyfill').TransformStream;
  AudioContext: {
    new(): AudioContextType;
  };
}

declare global {
  interface Window extends CustomGlobal {}
  var window: Window;
  interface globalThis extends CustomGlobal {}
}

export {}; 