**QR-Aid — 6-Hour Hackathon Timeline**

**Hour 1 — Setup & Core Form (0:00–1:00)**
- Scaffold a React app (Vite)
- Build the input form: name, blood type, allergies, conditions, emergency contacts, medications
- Basic state management, no styling yet

**Hour 2 — QR + Hosted Info Page (1:00–2:00)**
- Set up a simple backend or use a free service (Supabase/Firebase) to store the form data with a UUID
- Generate a public URL like `qraid.app/{uuid}` that renders the info
- Plug that URL into a QR code library (`qrcode.react`)

**Hour 3 — Translation Layer (2:00–3:00)**
- Wire up a translation API — Google Translate API or LibreTranslate (free, no key needed for basic use)
- The hosted info page auto-detects or lets the first responder pick a language
- Test a few languages (Spanish, Japanese, French)

**Hour 4 — Lock Screen Image Generation (3:00–4:00)**
- Use `html2canvas` or `dom-to-image` to render a styled card into a downloadable PNG
- Card includes: name, critical info summary, QR code, "Scan for full info in your language"
- Target the right phone aspect ratios (19.5:9 is fine as a default)

**Hour 5 — Polish & Edge Cases (4:00–5:00)**
- Style it properly — this is a demo, visual quality matters
- Handle empty fields gracefully
- Add a preview of the wallpaper before download
- Make the hosted info page look clean on mobile (that's what first responders will see)

**Hour 6 — Demo Prep (5:00–6:00)**
- Record a short demo flow or prep a live walkthrough
- Write a 2-sentence pitch: *"If you collapse abroad, a first responder scans your lock screen. They instantly see your allergies and conditions in their language."*
- Deploy (Vercel for frontend, Supabase handles the backend)

---

**Tech Stack**
- Frontend: React + Vite + Tailwind
- Storage: Supabase (free tier, no backend to write)
- QR: `qrcode.react`
- Image export: `html2canvas`
- Translation: LibreTranslate (free) or Google Translate API (~$0 for hackathon volume)