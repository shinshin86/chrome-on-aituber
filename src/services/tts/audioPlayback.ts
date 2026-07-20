/**
 * Audio Playback — Float32Array 音声の再生・停止・口パク解析の共通処理
 *
 * TTS エンジン（Piper Plus / Irodori）に依存しない再生レイヤー。
 * AnalyserNode の振幅から連続した口の開き具合を算出する。
 */

let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animFrameId: number | null = null;

const RMS_CEILING = 0.12;

export async function play(
  audio: Float32Array,
  sampleRate: number,
  onMouthChange: (level: number) => void
): Promise<void> {
  stop();

  if (!audioCtx || audioCtx.state === "closed" || audioCtx.sampleRate !== sampleRate) {
    if (audioCtx && audioCtx.state !== "closed") {
      try {
        await audioCtx.close();
      } catch {
        // ignore
      }
    }
    audioCtx = new AudioContext({ sampleRate });
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  const buffer = audioCtx.createBuffer(1, audio.length, sampleRate);
  buffer.getChannelData(0).set(audio);

  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 256;

  const playbackSource = audioCtx.createBufferSource();
  sourceNode = playbackSource;
  playbackSource.buffer = buffer;
  playbackSource.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  await new Promise<void>((resolve) => {
    playbackSource.onended = () => {
      if (sourceNode === playbackSource) {
        stopMouthAnimation();
        onMouthChange(0);
        sourceNode = null;
      }
      resolve();
    };

    playbackSource.start();
    startMouthAnimation(onMouthChange);
  });
}

export function stop(): void {
  if (sourceNode) {
    try {
      sourceNode.stop();
    } catch {
      // already stopped
    }
    sourceNode = null;
  }
  stopMouthAnimation();
}

export async function dispose(): Promise<void> {
  stop();
  if (audioCtx && audioCtx.state !== "closed") {
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
  }
  audioCtx = null;
  analyserNode = null;
}

function startMouthAnimation(onMouthChange: (level: number) => void): void {
  if (!analyserNode) return;
  const data = new Uint8Array(analyserNode.frequencyBinCount);
  let smoothedLevel = 0;

  function tick() {
    analyserNode!.getByteTimeDomainData(data);
    let squareSum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = (data[i] - 128) / 128;
      squareSum += sample * sample;
    }
    const rms = Math.sqrt(squareSum / data.length);
    const targetLevel = Math.min(1, rms / RMS_CEILING);
    const smoothing = targetLevel > smoothedLevel ? 0.48 : 0.24;
    smoothedLevel += (targetLevel - smoothedLevel) * smoothing;
    onMouthChange(smoothedLevel);
    animFrameId = requestAnimationFrame(tick);
  }
  animFrameId = requestAnimationFrame(tick);
}

function stopMouthAnimation(): void {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}
