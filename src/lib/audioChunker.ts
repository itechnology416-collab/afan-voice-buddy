// Decode audio with Web Audio, optional noise cleanup (high-pass + compressor + normalize),
// downmix to mono 16kHz, then slice into ~60-second WAV chunks (≈1.9MB each).
// Each chunk knows its start offset so the caller can stitch SRTs accurately.

export interface AudioChunk {
  blob: Blob;
  startSec: number;
  durationSec: number;
  index: number;
  total: number;
}

export interface ChunkOptions {
  denoise?: boolean;
  chunkSeconds?: number;
}

const TARGET_SR = 16000;
const DEFAULT_CHUNK_SECONDS = 60;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = idx - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const len = channels[0].length;
  const out = new Float32Array(len);
  const n = channels.length;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let c = 0; c < n; c++) sum += channels[c][i];
    out[i] = sum / n;
  }
  return out;
}

// Peak-normalize to -1 dBFS to recover gain after compression.
function normalize(buf: Float32Array, targetPeak = 0.89) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-4) return buf;
  const g = targetPeak / peak;
  if (g > 0.99 && g < 1.01) return buf;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * g;
  return out;
}

// Render mono buffer through high-pass (80Hz) + dynamics compressor for cleanup.
async function denoiseRender(monoIn: Float32Array, sampleRate: number): Promise<Float32Array> {
  const OfflineCtx: typeof OfflineAudioContext =
    (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtx) return monoIn;

  const ctx = new OfflineCtx(1, monoIn.length, sampleRate);
  const ab = ctx.createBuffer(1, monoIn.length, sampleRate);
  ab.getChannelData(0).set(monoIn);
  const src = ctx.createBufferSource();
  src.buffer = ab;

  // High-pass removes mic rumble/AC hum below ~80Hz.
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 85;
  hp.Q.value = 0.7;

  // Notch around 50/60Hz already covered by HP; presence boost helps speech.
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.gain.value = 3;
  presence.Q.value = 1;

  // Compressor evens out volume swings (good for noisy recordings).
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -28;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;

  src.connect(hp).connect(presence).connect(comp).connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return normalize(rendered.getChannelData(0));
}

async function decodeAny(file: Blob): Promise<AudioBuffer> {
  const arrayBuf = await file.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tmpCtx = new AudioCtx();
  try {
    return await tmpCtx.decodeAudioData(arrayBuf.slice(0));
  } catch (e) {
    throw new Error(
      "This audio/video format can't be decoded in the browser. Try MP3, WAV, M4A, OGG, MP4, or WEBM."
    );
  } finally {
    tmpCtx.close().catch(() => {});
  }
}

export async function chunkAudioFile(file: Blob, opts: ChunkOptions = {}): Promise<AudioChunk[]> {
  const chunkSeconds = opts.chunkSeconds ?? DEFAULT_CHUNK_SECONDS;
  const audioBuf = await decodeAny(file);

  const channels: Float32Array[] = [];
  for (let c = 0; c < audioBuf.numberOfChannels; c++) {
    channels.push(audioBuf.getChannelData(c));
  }
  let mono = downmixToMono(channels);
  if (opts.denoise) {
    try {
      mono = await denoiseRender(mono, audioBuf.sampleRate);
    } catch (e) {
      console.warn("Noise reduction skipped:", e);
    }
  }
  const resampled = resample(mono, audioBuf.sampleRate, TARGET_SR);

  const samplesPerChunk = TARGET_SR * chunkSeconds;
  const totalChunks = Math.max(1, Math.ceil(resampled.length / samplesPerChunk));
  const chunks: AudioChunk[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * samplesPerChunk;
    const end = Math.min(resampled.length, start + samplesPerChunk);
    const slice = resampled.subarray(start, end);
    chunks.push({
      blob: encodeWav(slice, TARGET_SR),
      startSec: start / TARGET_SR,
      durationSec: (end - start) / TARGET_SR,
      index: i,
      total: totalChunks,
    });
  }
  return chunks;
}

// Clean a single short blob (e.g. a microphone recording) for diarization paths
// where chunking isn't needed. Returns a 16kHz mono WAV blob.
export async function cleanAudioBlob(file: Blob, denoise = true): Promise<Blob> {
  const audioBuf = await decodeAny(file);
  const chans: Float32Array[] = [];
  for (let c = 0; c < audioBuf.numberOfChannels; c++) chans.push(audioBuf.getChannelData(c));
  let mono = downmixToMono(chans);
  if (denoise) {
    try { mono = await denoiseRender(mono, audioBuf.sampleRate); } catch { /* noop */ }
  }
  const resampled = resample(mono, audioBuf.sampleRate, TARGET_SR);
  return encodeWav(resampled, TARGET_SR);
}
