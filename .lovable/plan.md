## Phased buildout — everything you asked for, in 2 shippable batches

You picked a lot (i18n, dialect voices, 500MB chunked uploads, admin+roles+reset+share, diarization+noise-cleanup, billing, PWA). Doing it all in one pass would produce a half-working app. I'll ship it in two clean batches.

### Batch 1 — ships in this turn

**1. i18n (English ↔ Afaan Oromo toggle)**
- Lightweight `I18nProvider` with `t(key)` + `useI18n()` hook (no extra dependency).
- Two dictionaries: `src/locales/en.ts`, `src/locales/om.ts` covering sidebar, page titles, buttons, toasts, dialogs.
- Language toggle in sidebar footer; preference persisted in `localStorage` (`aon_lang`) and on `profiles.language` when signed in.

**2. Curated premium voices per dialect**
- `src/lib/voices.ts` maps each dialect (Arsi/Bale/Borana/Guji/Ittu/Karrayyu/Maccaa/Tuulama/Raya/Wallo/Jimma/Iluu/Kemise/Orma/Waata + General) to a recommended ElevenLabs voice + tuned stability/style.
- TTS page auto-selects the matching voice when a dialect is chosen, user can override.

**3. 500MB upload with auto-chunking**
- UI limit raised to 500MB, hint updated.
- `src/lib/audioChunker.ts`: decodes via Web Audio, slices into ~60s mono 16kHz WAV chunks (≈2MB each), sends each to `transcribe`, stitches results with per-chunk offset for accurate SRT.
- Progress bar (`Chunk 3 / 24`) + cancel button.
- Server `transcribe` unchanged (already handles per-chunk audio).

**4. Authentication completeness**
- `/reset-password` page (handles `type=recovery` hash, `supabase.auth.updateUser`).
- "Forgot password?" link on `/auth` calling `resetPasswordForEmail` with redirect.
- Enable `password_hibp_enabled` via `configure_auth`.

**5. Share links**
- Migration adds `transcriptions.is_public boolean` + `share_token text unique` + public-read RLS policy when `is_public = true`.
- "Share" button on History items / STT result → generates token, copies `/share/:token` URL.
- New public `/share/:token` page renders the transcript read-only.

**6. Admin dashboard**
- `/admin` route gated by `has_role(auth.uid(),'admin')`.
- Lists users (from `profiles`) + their transcription counts; can promote/demote roles via secure RPC `set_user_role(target_user_id, new_role)` that checks caller is admin.
- Migration: RPC + INSERT/UPDATE/DELETE policies on `user_roles` restricted to admins via `has_role`.

**7. PWA (manifest-only, install-to-home-screen)**
- `public/manifest.webmanifest` with icons + `display: standalone`.
- No service worker (avoids preview-iframe issues, per Lovable PWA guidance).
- Meta tags in `index.html`.

### Batch 2 — next turn (just say "continue")

- **Diarization & better STT for long files**: ElevenLabs `scribe_v2` route in `transcribe` (toggle "Multi-speaker" in STT).
- **Noise reduction**: in-browser pre-processing using `AudioContext` (high-pass + dynamics compressor) before chunking.
- **Billing**: enable Lovable Stripe Payments (`recommend_payment_provider` → `enable_stripe_payments`) with "Free / Pro" tiers gating premium voices and >25MB uploads. Requires you to fill the Stripe enable form.

### Out of scope (call out)
- Real offline mode (cached transcripts) — skipped because service workers break the Lovable preview. Manifest-only install is included instead.
- Live realtime mic transcription via ElevenLabs WebSocket — deferred until billing is in place.

### Technical notes
- All new colors stay on existing Earthy Oromo tokens.
- Existing features (sidebar, dark mode, browser+premium TTS, history, translate, exports, SRT timing) are preserved untouched.
- Migration in Batch 1 is one file (share columns + admin RPC + role policies).
