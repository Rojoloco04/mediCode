# mediCode

A medical profile app that generates a scannable QR code containing your critical health information — readable by first responders in any language.

## What it does

1. Fill out a form with your name, blood type, allergies, conditions, medications, and emergency contact.
2. Get a unique QR code (and shareable link) tied to your profile.
3. Anyone who scans the QR code can view your medical info, auto-translated into their local language via AI.
4. An AI-generated voice alert reads the critical information aloud in the responder's language.
5. Return to the site with your email to update your profile anytime.

## Tech stack

- **React 18 + Vite** — frontend
- **Tailwind CSS** — styling
- **Supabase** — database (profiles stored by UUID)
- **Vercel** — hosting + serverless API routes
- **Google Translate API** — field translation (30+ languages)
- **ElevenLabs TTS** — AI voice alert generation
- **PWA** — offline-capable via service worker

## Getting started

```bash
npm install
npm run dev
```

Create a `.env.local` with your API keys:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ELEVENLABS_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Create or update a medical profile |
| `/:uuid` | View a profile (shareable, used by QR code) |

## Key features

**Profile creation**
- Blood type picker, allergy/condition/medication fields
- Email-based lookup to retrieve and update existing profiles
- Language selector (30+ languages) with search

**QR & sharing**
- SVG QR code generation linked to the profile UUID
- Lock-screen wallpaper export (1080×2340 PNG) for easy responder access
- Native share API with clipboard fallback

**Responder view**
- Language auto-detected from browser locale or geolocation (OpenStreetMap reverse geocoding)
- All medical fields auto-translated into the responder's language
- AI voice alert played in the responder's language via ElevenLabs TTS
- Audio waveform visualization + playback controls
- Emergency contact quick-call button

## Project structure

```
src/
  components/
    MedicalForm.jsx   # Profile creation/editing form with language picker
    InfoPage.jsx      # Public-facing profile view (QR scan destination)
    QRDisplay.jsx     # QR code + wallpaper card generation
    WallpaperCard.jsx # Downloadable lockscreen card
  lib/
    supabase.js       # Supabase client
    translate.js      # Language detection + label translation
api/
  elevenlabs.js       # Serverless proxy for ElevenLabs TTS
  translate.js        # Serverless proxy for Google Translate
  languages.js        # Language list endpoint
```
