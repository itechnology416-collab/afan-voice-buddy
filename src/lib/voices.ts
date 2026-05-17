// Curated ElevenLabs voices mapped per Afaan Oromo dialect.
// Each dialect picks a voice + tuned voice_settings that suit the regional cadence.

export interface PremiumVoice {
  id: string;
  name: string;
  gender: "male" | "female";
  stability: number;
  similarity: number;
  style: number;
  speed: number;
}

export const PREMIUM_VOICES: PremiumVoice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",   gender: "female", stability: 0.55, similarity: 0.80, style: 0.40, speed: 1.0 },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura",   gender: "female", stability: 0.50, similarity: 0.80, style: 0.50, speed: 1.0 },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",   gender: "female", stability: 0.60, similarity: 0.78, style: 0.35, speed: 0.98 },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", stability: 0.65, similarity: 0.82, style: 0.30, speed: 0.97 },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily",    gender: "female", stability: 0.55, similarity: 0.80, style: 0.45, speed: 1.0 },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", stability: 0.50, similarity: 0.80, style: 0.50, speed: 1.02 },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",  gender: "male",   stability: 0.55, similarity: 0.80, style: 0.40, speed: 1.0 },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger",   gender: "male",   stability: 0.60, similarity: 0.80, style: 0.35, speed: 0.97 },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male",   stability: 0.50, similarity: 0.78, style: 0.50, speed: 1.0 },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam",    gender: "male",   stability: 0.55, similarity: 0.82, style: 0.40, speed: 1.0 },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  gender: "male",   stability: 0.65, similarity: 0.80, style: 0.30, speed: 0.95 },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian",   gender: "male",   stability: 0.55, similarity: 0.80, style: 0.40, speed: 1.0 },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will",    gender: "male",   stability: 0.50, similarity: 0.80, style: 0.45, speed: 1.0 },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris",   gender: "male",   stability: 0.55, similarity: 0.80, style: 0.40, speed: 0.98 },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum",  gender: "male",   stability: 0.60, similarity: 0.80, style: 0.35, speed: 0.97 },
];

// Map every dialect to a recommended (female, male) voice pair.
export const DIALECT_VOICE_MAP: Record<string, { female: string; male: string }> = {
  general:   { female: "EXAVITQu4vr4xnSDxMaL", male: "JBFqnCBsd6RMkjVDRZzb" },
  arsi:      { female: "XrExE9yKIg1WjnnlVkGX", male: "onwK4e9ZLuTAKqWW03F9" },
  bale:      { female: "Xb7hH8MSUJpSbSDYk0k2", male: "CwhRBWXzGAHq8TQ4Fs17" },
  borana:    { female: "FGY2WhTYpPnrIDTdsKH5", male: "TX3LPaxmHKxFdv7VOQHJ" },
  guji:      { female: "cgSgspJ2msm6clMCkdW9", male: "N2lVS1w4EtoT3dr4eOWO" },
  harar:     { female: "XrExE9yKIg1WjnnlVkGX", male: "nPczCjzI2devNBz1zQrb" },
  ittu:      { female: "EXAVITQu4vr4xnSDxMaL", male: "iP95p4xoKVk53GoZ742B" },
  karrayyu:  { female: "pFZP5JQG7iQjIQuC4Bku", male: "JBFqnCBsd6RMkjVDRZzb" },
  wallaga:   { female: "FGY2WhTYpPnrIDTdsKH5", male: "JBFqnCBsd6RMkjVDRZzb" },
  maccaa:    { female: "FGY2WhTYpPnrIDTdsKH5", male: "JBFqnCBsd6RMkjVDRZzb" },
  shewa:     { female: "EXAVITQu4vr4xnSDxMaL", male: "TX3LPaxmHKxFdv7VOQHJ" },
  tuulama:   { female: "EXAVITQu4vr4xnSDxMaL", male: "TX3LPaxmHKxFdv7VOQHJ" },
  raya:      { female: "Xb7hH8MSUJpSbSDYk0k2", male: "bIHbv24MWmeRgasZH58o" },
  wallo:     { female: "pFZP5JQG7iQjIQuC4Bku", male: "iP95p4xoKVk53GoZ742B" },
  jimma:     { female: "cgSgspJ2msm6clMCkdW9", male: "CwhRBWXzGAHq8TQ4Fs17" },
  iluu:      { female: "FGY2WhTYpPnrIDTdsKH5", male: "onwK4e9ZLuTAKqWW03F9" },
  kemise:    { female: "pFZP5JQG7iQjIQuC4Bku", male: "bIHbv24MWmeRgasZH58o" },
  orma:      { female: "Xb7hH8MSUJpSbSDYk0k2", male: "N2lVS1w4EtoT3dr4eOWO" },
  waata:     { female: "XrExE9yKIg1WjnnlVkGX", male: "nPczCjzI2devNBz1zQrb" },
};

export const voiceById = (id: string): PremiumVoice | undefined =>
  PREMIUM_VOICES.find((v) => v.id === id);

export const recommendVoiceForDialect = (
  dialect: string,
  gender: "female" | "male" = "female",
): PremiumVoice => {
  const id = DIALECT_VOICE_MAP[dialect]?.[gender] ?? DIALECT_VOICE_MAP.general[gender];
  return voiceById(id) ?? PREMIUM_VOICES[0];
};
