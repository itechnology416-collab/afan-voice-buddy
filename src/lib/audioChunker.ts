// Decode any audio file with Web Audio, downmix to mono 16kHz,
// then slice into ~60-second WAV chunks (≈1.9MB each, well under any AI payload cap).
// Each chunk knows its start offset so the caller can stitch SRTs accurately.

export interface AudioChunk {
  blob: Blob;          // audio/wav, mono, 16kHz
  startSec: number;    // offset inside the original audio
  durationSec: number; // chunk duration in seconds
  index: number;
  total: number;
}

const TARGET_SR = 16000;
const CHUNK_SECONDS = 60;

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
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// Linear-interpolation resample (sufficient for speech transcription).
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

export async function chunkAudioFile(file: Blob): Promise<AudioChunk[]> {
  const arrayBuf = await file.arrayBuffer();
  // Use OfflineAudioContext to decode without playback
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const tmpCtx = new AudioCtx();
  let audioBuf: AudioBuffer;
  try {
    audioBuf = await tmpCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    tmpCtx.close().catch(() => {});
  }

  const channels: Float32Array[] = [];
  for (let c = 0; c < audioBuf.numberOfChannels; c++) {
    channels.push(audioBuf.getChannelData(c));
  }
  const mono = downmixToMono(channels);
  const resampled = resample(mono, audioBuf.sampleRate, TARGET_SR);

  const samplesPerChunk = TARGET_SR * CHUNK_SECONDS;
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
