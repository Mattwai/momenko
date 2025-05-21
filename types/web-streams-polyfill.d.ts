declare module 'web-streams-polyfill' {
    export const ReadableStream: typeof globalThis.ReadableStream;
    export const WritableStream: typeof globalThis.WritableStream;
    export const TransformStream: typeof globalThis.TransformStream;
} 