/**
 * Audio Playback — Float32Array 音声の再生・停止・口パク解析の共通処理
 *
 * TTS エンジン（Piper Plus / Irodori）に依存しない再生レイヤー。
 * AnalyserNode の振幅から口パク（開閉）を判定する。
 */

let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animFrameId: number | null = null;

const MOUTH_THRESHOLD = 20;

export async function play(
  audio: Float32Array,
  sampleRate: number,
  onMouthChange: (open: boolean) => void
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

  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  sourceNode.onended = () => {
    stopMouthAnimation();
    onMouthChange(false);
    sourceNode = null;
  };

  sourceNode.start();
  startMouthAnimation(onMouthChange);
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

function startMouthAnimation(onMouthChange: (open: boolean) => void): void {
  if (!analyserNode) return;
  const data = new Uint8Array(analyserNode.frequencyBinCount);

  function tick() {
    analyserNode!.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] - 128);
      if (a > max) max = a;
    }
    onMouthChange(max > MOUTH_THRESHOLD);
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
