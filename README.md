# Chrome on AITuber

Browser-only AITuber chat app built with React and Vite. It uses Chrome Built-in AI (Gemini Nano / Prompt API) for Japanese responses, piper-plus WASM for speech synthesis, and a 4-sprite avatar for lip-sync and blinking animation.

[日本語版 README](./README.ja.md)

## Features

- Browser-only operation with no application server
- Japanese chat powered by Chrome Built-in AI / `LanguageModel`
- Browser TTS with piper-plus WASM, OpenJTalk, and ONNX Runtime Web
- 4-sprite avatar animation with mouth movement and random blinking
- Two display modes: chat mode and broadcast mode (green background)
- YouTube Live comment pickup via YouTube Data API v3
- Twitch chat pickup via EventSub WebSocket + OAuth implicit flow
- Custom avatar registration from 4 uploaded images
- Local persistence for settings and chat history with `localStorage`
- Custom avatar storage in `IndexedDB`

## Requirements

- Google Chrome 138+
- Node.js 18+
- `npm`

Chrome Built-in AI must be enabled before the app can answer messages:

1. Open `chrome://flags`
2. Enable `#optimization-guide-on-device-model`
3. Enable `#prompt-api-for-gemini-nano`
4. Restart Chrome
5. Wait for the on-device model download to finish

## Setup

1. Clone the repository and install dependencies

```bash
git clone https://github.com/shinshin86/chrome-on-aituber.git
cd chrome-on-aituber
npm install
```

2. Prepare TTS assets if you want voice playback

The full piper TTS assets are not committed to this repository. When you clone this project yourself, you need to place the required files under `public/piper/`.

- `public/piper/piper-global-loader.js`

You need to prepare the rest of the `public/piper/` asset set yourself. Without those assets, the chat UI can still load, but TTS will not work correctly.

Prepare the assets as follows.

1. `piper-plus` from [ayutaz/piper-plus](https://github.com/ayutaz/piper-plus)
   Clone or download the `dev` branch, then copy:
   - `src/wasm/openjtalk-web/dist/` -> `public/piper/dist/`
   - `src/wasm/openjtalk-web/src/` -> `public/piper/src/`
   - `src/wasm/openjtalk-web/assets/` -> `public/piper/assets/`
2. `onnxruntime-web` from [npm](https://www.npmjs.com/package/onnxruntime-web)
   Copy these files into `public/piper/dist/`:
   - `dist/ort.min.js`
   - `dist/ort-wasm.wasm`
   - `dist/ort-wasm-simd.wasm`
3. Tsukuyomi model from [ayousanz/piper-plus-tsukuyomi-chan](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan)
   Place these files into `public/piper/models/`:
   - `tsukuyomi-wavlm-300epoch.onnx`
   - `config.json` renamed to `tsukuyomi-config.json`

`scripts/package-piper-assets.sh` is not a setup script. It only packages an already-prepared `public/piper/` directory into `piper-assets.tar.gz` for GitHub Releases / CI deployment. `scripts/release-piper-assets.sh` also uploads that asset to a GitHub Release.

Both scripts are intended for a local release/build environment where `gh` is already authenticated.

If you need that packaging flow, use:

```bash
./scripts/package-piper-assets.sh
./scripts/release-piper-assets.sh
```

3. Start the development server

```bash
npm run dev
```

Open the Vite URL in Chrome, usually `http://localhost:5173`.

## Usage

- Type in the bottom input and press `Enter` to send
- Use `Shift+Enter` for a newline
- Open settings from the bottom bar
- Press `Ctrl+S` / `Cmd+S` to toggle settings quickly
- Switch to broadcast mode for a centered avatar-only layout with a green background
- Reset the current conversation from the settings panel
- Enable or disable TTS and change speech speed
- Register custom avatars by uploading 4 images:
  - mouth closed / eyes open
  - mouth closed / eyes closed
  - mouth open / eyes open
  - mouth open / eyes closed

## Streaming Integration

### YouTube Live

Fill these fields in the settings panel:

- `YouTube API Key`
- `Live ID`
- polling interval
- enable toggle

`Live ID` means the YouTube video ID from the live URL. Example:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` -> `dQw4w9WgXcQ`

The app fetches live chat comments in the browser, filters duplicates and older comments, then forwards one selected comment to the AI.

### Twitch

Fill these fields in the settings panel:

- `Twitch Client ID`
- channel name
- polling interval

Then click `Connect to Twitch` and complete OAuth in the browser. The access token is stored locally in the browser and used to subscribe to `channel.chat.message` over EventSub WebSocket.

## Build

```bash
npm run build
npm run preview
```

The Vite dev server already sends:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Set the same headers in production hosting for WASM / `SharedArrayBuffer` support.

## Project Structure

```text
src/
├── components/
│   ├── Avatar/
│   ├── Chat/
│   ├── License/
│   ├── Manual/
│   ├── Settings/
│   └── Toast/
├── hooks/
│   ├── useBlink.ts
│   ├── useChat.ts
│   ├── useInterval.ts
│   ├── useSettings.ts
│   ├── useTwitchComments.ts
│   └── useYoutubeComments.ts
├── services/
│   ├── avatar/
│   ├── llm/
│   ├── storage/
│   ├── tts/
│   ├── twitch/
│   └── youtube/
└── types/
```

## Notes

- Settings, chat history, API keys, and Twitch access tokens are stored in the local browser.
