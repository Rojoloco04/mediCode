# mediCode

A medical profile app that generates a scannable QR code containing your critical health information — readable by first responders in any language.

## What it does

1. Fill out a form with your name, blood type, allergies, conditions, medications, and emergency contact.
2. Get a unique QR code (and shareable link) tied to your profile.
3. Anyone who scans the QR code can view your medical info, auto-translated into their local language via AI.
4. Return to the site with your email to update your profile anytime.

## Tech stack

- **React + Vite** — frontend
- **Tailwind CSS** — styling
- **Supabase** — database (profiles stored by UUID)
- **Vercel** — hosting + serverless API routes
- **ElevenLabs / translation API** — language detection and label translation

## Getting started

```bash
npm install
npm run dev
```

Create a `.env.local` with your Supabase and API keys (see `.env.local` in the project root for the required variables).

## Routes

| Path | Description |
|------|-------------|
| `/` | Create or update a medical profile |
| `/:uuid` | View a profile (shareable, used by QR code) |

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
  elevenlabs.js       # Serverless proxy for ElevenLabs
  translate.js        # Serverless proxy for translation
  languages.js        # Language list endpoint
```
