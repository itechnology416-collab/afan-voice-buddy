## Plan

### 1. Transcript review panel with low-confidence highlighting

**Backend (edge functions)**
- Update `transcribe` and `transcribe-diarize` to pass through ElevenLabs per-word `logprob`/`confidence` fields in the returned `words[]` array (already partially structured).
- Normalize a `confidence` value (0–1) on each `TimedWord`.

**Frontend (`src/pages/SpeechToText.tsx` + new component)**
- Add new `TranscriptReviewer` component that:
  - Renders each word as a clickable chip
  - Highlights words below a confidence threshold (default 0.6) in amber, and very-low (<0.35) in red
  - Click a word → inline input to correct text; updates both `words[]` and the joined `text`
  - Threshold slider so user can tune sensitivity
  - "Jump to audio" — clicking a word seeks the `<audio>` element to `word.start`
  - Shows count of flagged words and a "Mark all reviewed" action
- Wire SRT export (`exportSrtFromWords`) to use the corrected words.
- Add `confidence?: number` to the `TimedWord` type in `src/lib/export.ts`.

### 2. Expanded audio + video format support

**Upload acceptance (`SpeechToText.tsx`)**
- Expand `ALLOWED` list and file-extension regex to include:
  - Audio: mp3, wav, m4a, aac, ogg, oga, opus, flac, webm, amr, wma, aiff, 3gp
  - Video: mp4, mov, m4v, webm, mkv, avi, wmv, flv, 3gp, mpeg, mpg, ts
- Change `<input accept>` to `audio/*,video/*`.
- Update drop-zone helper text and the "max 500MB" note.

**Audio extraction from video (`src/lib/audioChunker.ts`)**
- `cleanAudioBlob` and `chunkAudioFile` already use `AudioContext.decodeAudioData`, which decodes the audio track from most video containers the browser supports (mp4, webm, mov on Safari, etc.).
- Add a pre-step: if `file.type.startsWith("video/")` or extension is video, route through the same decode pipeline (it already produces 16 kHz mono WAV chunks) — confirm by adding a try/catch with a clear error if the browser can't decode the container (e.g. mkv/avi/wmv), and surface a toast suggesting conversion.
- Keep 500 MB cap and existing chunking/denoise behavior.

**UI label updates**
- Update i18n strings in `src/locales/en.ts` and `src/locales/om.ts` for the new "audio or video" copy.

### Technical notes
- No DB schema changes needed.
- No new dependencies.
- Word-edit state lives in component state; final corrected `words[]` + `text` flow into existing history save and exports.
- Confidence field is optional — if ElevenLabs response omits it, the reviewer simply shows no highlights and still allows manual edits.

### Files touched
- edit: `src/pages/SpeechToText.tsx`, `src/lib/export.ts`, `src/lib/audioChunker.ts`, `src/locales/en.ts`, `src/locales/om.ts`, `supabase/functions/transcribe/index.ts`, `supabase/functions/transcribe-diarize/index.ts`
- new: `src/components/TranscriptReviewer.tsx`
