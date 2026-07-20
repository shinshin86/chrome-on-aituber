# Chrome on AITuber

Browser-only AITuber chat app built with React and Vite. It uses Chrome Built-in AI (Gemini Nano / Prompt API) for Japanese responses, piper-plus WASM for speech synthesis, and selectable browser-rendered avatars with lip-sync and idle animation.

[日本語版 README](./README.ja.md)

## Features

- Browser-only operation with no application server
- Japanese chat powered by Chrome Built-in AI / `LanguageModel`
- Browser TTS with piper-plus WASM, OpenJTalk, and ONNX Runtime Web
- Selectable PNGTuber, PuruPuru PNGTuber, Pet, VRM, PSD, and Inochi2D avatars
- Bundled default avatar assets for every supported format
- Custom background image with reset back to the default background
- Two display modes: chat mode and broadcast mode (green background)
- YouTube Live comment pickup via YouTube Data API v3
- Twitch chat pickup via EventSub WebSocket + OAuth implicit flow
- Custom avatar registration using each format's native files
- Local persistence for settings and chat history with `localStorage`
- Custom avatar files in `IndexedDB`, with the active avatar restored after reload

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

On first launch, if the model is not yet present on the device, Chrome requires a direct user action to begin model preparation. Use the `Prepare AI` button shown in the app before sending messages.

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
4. License notices
   `scripts/package-piper-assets.sh` copies the templates from `scripts/piper/licenses/` into `public/piper/licenses/` before packaging. If you assemble `public/piper/` manually, include that directory as well.

Piper voice credit:

> This software uses voice data made freely available by the free material character "Tsukuyomi-chan" (c) Rei Yumesaki for speech synthesis.
>
> Tsukuyomi-chan Corpus (CV. Rei Yumesaki)<br>
> https://tyc.rei-yumesaki.net/material/corpus/

`scripts/package-piper-assets.sh` is not a setup script. It only packages an already-prepared `public/piper/` directory into `piper-assets.tar.gz` for GitHub Releases / CI deployment, after copying the license templates. `scripts/release-piper-assets.sh` also uploads that asset to a GitHub Release.

Both scripts are intended for a local release/build environment where `gh` is already authenticated.

If you need that packaging flow, use:

```bash
./scripts/package-piper-assets.sh
./scripts/release-piper-assets.sh
```

The existing `piper-assets-v1` release asset does not contain `piper/licenses/`. After rebuilding the tarball with these templates, publish a new release asset and update the GitHub Actions repository variable `PIPER_ASSETS_URL` to that new URL.

To use Irodori TTS, place its `manifest.json`, WebGPU fp16 ONNX models, tokenizer files, `runtime/pipeline.mjs`, and license files under `public/irodori/`. This directory is intentionally not tracked by Git. The build recipe lives in [`scripts/irodori/`](scripts/irodori/README.md).

For the deployed site, Irodori assets are hosted in two parts because the set (~1.3GB) exceeds the GitHub Pages site limit and GitHub Release assets do not send CORS headers: the runtime (`pipeline.mjs` + ONNX Runtime wasm, served same-origin because dynamic `import()` requires a JavaScript MIME type) ships as a GitHub Release tarball extracted at build time (`IRODORI_RUNTIME_ASSETS_URL`), while models and tokenizer are downloaded by the browser directly from a public Hugging Face repository (`IRODORI_ASSETS_BASE_URL` → `VITE_IRODORI_ASSETS_BASE_URL`). Both repository variables are optional; when unset the app falls back to same-origin `irodori/`. See [`scripts/irodori/README.md`](scripts/irodori/README.md) for the release steps.

When you click `Download Irodori TTS model` in the app, the asset set is saved to browser storage, primarily IndexedDB. The current fp16 asset set is about 1.2 GiB. In a normal browser window, it remains until you click `Delete model and free storage` in settings or clear the site's data in Chrome. In Incognito mode, it is stored only for that Incognito session and becomes unavailable to the web app after all Incognito windows are closed. Incognito storage quotas can also be smaller than normal-window quotas, so saving the model may fail with `QuotaExceededError`. Uploaded `.wav` / `.mp3` reference audio is not persisted; it is kept only in memory for the current session.

3. Start the development server

```bash
npm run dev
```

Open the Vite URL in Chrome, usually `http://localhost:5173`.

## Usage

- Type in the bottom input and press `Enter` to send
- On first use, click `Prepare AI` if shown to start Gemini Nano model preparation
- Use `Shift+Enter` for a newline
- Open settings from the bottom bar
- Press `Ctrl+S` / `Cmd+S` to toggle settings quickly
- Switch to broadcast mode for a centered avatar-only layout with a green background
- Reset the current conversation from the settings panel
- Change the background image from the settings panel and reset it with `Back to Default`
- Enable or disable TTS and change speech speed
- Choose PNGTuber, PuruPuru PNGTuber, Pet, VRM, PSD, or Inochi2D in Avatar settings
- Register custom avatars from the corresponding files. PNGTuber uses four images; Pet uses a manifest and spritesheet; VRM and Inochi2D accept optional animation data.
- The selected avatar and custom files are stored only in the browser and restored automatically after reload.

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
- Downloaded Irodori TTS models are stored in browser storage and use about 1.2 GiB.
- Incognito mode may have a smaller browser storage quota, so Irodori TTS model storage is recommended in a normal browser window.
