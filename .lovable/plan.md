## Plan: Full feature buildout

Preserves all current features (sidebar, dark mode, STT, browser TTS, voice settings, history, dialects). Adds:

### 1. Authentication
- Email/password + Google sign-in via Lovable Cloud managed auth
- New `/auth` page (sign in / sign up tabs)
- `profiles` table (display_name, avatar_url) with auto-create trigger on signup
- `user_roles` table + `app_role` enum + `has_role()` security-definer function (for admin role later)
- Auth state in a React context; sidebar shows user + sign out
- Routes remain public so guests can still try features; history syncs only when signed in

### 2. Cloud history
- New `transcriptions` table (user_id, kind: stt|tts, text, dialect, audio_url nullable, created_at)
- RLS: users see only their own rows
- `src/lib/history.ts` becomes a thin wrapper that writes to DB when signed in, falls back to localStorage when not. History page reads from both, shows source badge.

### 3. Premium TTS (ElevenLabs)
- Requires `ELEVENLABS_API_KEY` secret (will request via add_secret)
- New edge function `tts-elevenlabs` → returns MP3 bytes
- TTS page gets a "Voice engine" toggle: **Browser** (current) / **Premium (ElevenLabs)**
- Premium mode shows curated multilingual voices (male/female), uses `eleven_multilingual_v2`
- Generated MP3 is playable + downloadable

### 4. Translation
- New edge function `translate` using Lovable AI (`google/gemini-2.5-flash`)
- Translate Afaan Oromo ↔ English ↔ Amharic
- New `/translate` page (sidebar item) with source/target language selector and copy/save buttons
- Inline "Translate" button on STT result and TTS input

### 5. Exports (TXT / DOCX / PDF / SRT)
- Add deps: `jspdf`, `docx`, `file-saver`
- `src/lib/export.ts` with helpers: `exportTxt`, `exportDocx`, `exportPdf`, `exportSrt`
- SRT generation: split transcribed text into ~6-word chunks, distribute timestamps across the original audio duration (captured during STT)
- Export menu on STT result + History items

### 6. Sidebar + routing
- Add Translate, Sign in/Profile entries
- Reorder: Home, Speech to Text, Text to Speech, Translate, History, Settings

### Technical details
- Migration creates: `profiles`, `transcriptions`, `app_role` enum, `user_roles`, `has_role()`, `handle_new_user()` trigger, `update_updated_at_column()` trigger fn, RLS policies on all
- Edge functions: `tts-elevenlabs`, `translate` (both `verify_jwt = false` default; CORS headers)
- Google OAuth via `supabase--configure_social_auth` tool
- All new colors stay in existing Earthy Oromo design tokens; no hard-coded colors
- `useAuth()` hook + `AuthProvider` wrapping app; `onAuthStateChange` set up before `getSession()`

### Out of scope (per your answers)
Admin dashboard, speaker recognition, noise reduction, offline mode — deferred.

### One thing I need from you
ElevenLabs API key (I'll request it after you approve this plan). Get one at elevenlabs.io → Profile → API Keys (free tier works).
