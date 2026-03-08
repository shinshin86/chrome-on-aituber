# Chrome on AITuber

A browser-based AITuber chat application that runs entirely in the browser. It generates LLM responses using Gemini Nano (Chrome Built-in AI / Prompt API) and performs Japanese TTS with piper-plus WASM, synchronized with avatar lip-sync animation.

**Tech Stack**: TypeScript / React / Vite SPA

---

## Features

- **LLM Chat** — Japanese dialogue powered by Chrome Built-in AI (LanguageModel API, Chrome 138+)
- **TTS** — Japanese speech synthesis using piper-plus WASM (OpenJTalk + ONNX Runtime Web)
- **Avatar** — 4-sprite animation (mouth open/close x eyes open/close) with random blinking
- **Chat UI** — 3-column layout (AI messages / Avatar / User messages) with speech bubbles
- **Settings** — System prompt editing, TTS speech rate adjustment
- **Local Storage** — All data stored locally (LocalStorage + IndexedDB), no server required

## Prerequisites

- **Google Chrome 138+** with Built-in AI (Prompt API) enabled
  - Navigate to `chrome://flags` and enable `#optimization-guide-on-device-model` and `#prompt-api-for-gemini-nano`
  - Restart Chrome and wait for the model to download
- **Node.js 18+**

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/<your-username>/chrome-on-aituber.git
cd chrome-on-aituber
npm install
```

### 2. Set up piper-plus WASM assets

The TTS engine requires piper-plus WASM assets which are not included in this repository due to their size. Place the following files under `public/piper/`:

```
public/piper/
├── piper-global-loader.js      # ES module loader (see below)
├── dist/
│   ├── openjtalk.js             # OpenJTalk JS wrapper
│   ├── openjtalk.wasm           # OpenJTalk WASM binary
│   ├── ort.min.js               # ONNX Runtime Web
│   ├── ort-wasm.wasm            # ONNX Runtime WASM
│   └── ort-wasm-simd.wasm       # ONNX Runtime WASM (SIMD)
├── src/
│   ├── simple_unified_api.js    # piper-plus unified API
│   ├── phonemizer.js
│   ├── openjtalk_wrapper.js
│   ├── japanese_phoneme_extract.js
│   ├── dictionary-loader.js
│   ├── custom_dictionary.js
│   ├── simple_english_phonemizer.js
│   └── api.js
├── assets/
│   ├── dict/                    # NAIST Japanese dictionary for OpenJTalk
│   │   ├── sys.dic, unk.dic, char.bin, matrix.bin, ...
│   │   └── COPYING
│   └── voice/
│       └── mei_normal.htsvoice  # HTS voice file
└── models/
    ├── tsukuyomi-config.json    # Model config (phoneme_id_map, etc.)
    └── tsukuyomi-wavlm-300epoch.onnx  # TTS ONNX model
```

**Where to obtain these files:**

- **ONNX Runtime Web**: Download from [ONNX Runtime releases](https://github.com/nicl-nno/onnxruntime-web-demo/releases) or `npm install onnxruntime-web` and copy `dist/ort.min.js`, `dist/ort-wasm.wasm`, `dist/ort-wasm-simd.wasm`
- **OpenJTalk WASM**: Build from [piper-plus](https://github.com/nicl-nno/piper-plus) or use pre-built assets
- **NAIST dictionary**: Included with OpenJTalk builds
- **tsukuyomi voice model**: Download the tsukuyomi-chan ONNX model from the piper-plus model repository

The `piper-global-loader.js` file should contain:

```js
import { SimpleUnifiedPhonemizer } from './src/simple_unified_api.js';
window.__PiperPlus = { SimpleUnifiedPhonemizer };
window.dispatchEvent(new Event('piper-plus-ready'));
```

### 3. Run the development server

```bash
npm run dev
```

Open Chrome and navigate to the URL shown in the terminal (default: `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

> **Note**: The production build also requires COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) for SharedArrayBuffer support needed by WASM. Configure these in your hosting environment.

## Project Structure

```
src/
├── components/
│   ├── Avatar/       # Avatar sprite display with blink animation
│   ├── Chat/         # Chat UI (ChatLog, ChatMessage, ChatInput, BottomBar)
│   └── Settings/     # Settings modal panel
├── hooks/
│   ├── useBlink.ts   # Random eye blinking hook
│   ├── useChat.ts    # Core chat logic (LLM + TTS integration)
│   └── useSettings.ts
├── services/
│   ├── avatar/       # Avatar pack management
│   ├── llm/          # Chrome Built-in AI wrapper
│   ├── storage/      # LocalStorage + IndexedDB persistence
│   ├── tts/          # piper-plus WASM TTS engine
│   └── youtube/      # YouTube Live Chat integration (stub)
└── types/            # TypeScript type definitions
```

## License

TBD

---

[日本語版 README はこちら](./README.ja.md)
