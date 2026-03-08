declare module "/piper/src/simple_unified_api.js" {
  export class SimpleUnifiedPhonemizer {
    constructor(options?: Record<string, unknown>);
    initialize(config: {
      openjtalk: {
        jsPath: string;
        wasmPath: string;
        dictPath: string;
        voicePath: string;
      };
    }): Promise<void>;
    textToPhonemes(text: string, lang: string): Promise<string>;
    extractPhonemes(labels: string, lang: string): string[];
    dispose(): void;
  }
}
