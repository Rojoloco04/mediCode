import { createContext, useContext, useEffect, useState } from 'react'
import { fetchLanguages, getLocationLanguage, translateFields } from './translate'

export const APP_LABELS = {
  // LanguageGate
  gate_title: 'Choose your language',
  gate_subtitle: 'Used for form labels and, in an emergency, the translated profile shown to responders.',
  gate_subtitleInfo: 'Select the language you want to view this profile in.',
  gate_continue: 'Continue',
  gate_searchPlaceholder: 'Search languages…',
  gate_autoDetected: 'auto-detected from your location',

  // MedicalForm
  form_pageTitle: 'Your medical profile',
  form_pageDesc: 'Kept private until a QR code is scanned — then shown to responders in their language.',
  form_haveProfile: 'Have a profile already?',
  form_lookupPlaceholder: 'your@email.com',
  form_find: 'Find',
  form_noProfileFound: 'No profile found for that email.',
  form_draft: 'Draft',
  form_editingChip: 'Editing existing',
  form_editingExisting: 'Editing existing profile',
  form_createNew: 'Create new',
  form_footerText: 'end-to-end encrypted · visible only on scan',
  form_fullName: 'Full name',
  form_email: 'Email',
  form_emailHint: 'used to retrieve later',
  form_bloodType: 'Blood type',
  form_optional: 'optional',
  form_allergies: 'Allergies',
  form_conditions: 'Conditions',
  form_medications: 'Current medications',
  form_emergencyName: 'Name',
  form_emergencyPhone: 'Phone',
  form_sectionCritical: 'Critical',
  form_sectionCriticalDesc: 'Shown first to responders.',
  form_sectionMedical: 'Medical',
  form_sectionMedicalDesc: 'Optional context for treatment.',
  form_sectionEmergency: 'Emergency contact',
  form_phName: 'As it appears on your ID',
  form_phEmail: 'you@email.com',
  form_phAllergies: 'Penicillin, peanuts, latex',
  form_phConditions: 'Type 1 diabetes, asthma',
  form_phMedications: 'Insulin 10u, Albuterol PRN',
  form_phEmergencyName: 'Jane Doe',
  form_phEmergencyPhone: '+1 555 000 0000',
  form_generateBtn: 'Generate QR code',
  form_updateBtn: 'Update QR code',
  form_saving: 'Saving…',
  form_errorUpdate: 'Could not update profile. Please try again.',
  form_errorSave: 'Could not save profile. Please try again.',

  // QRDisplay
  qr_edit: 'Edit',
  qr_back: 'Back',
  qr_saved: 'Saved',
  qr_title: 'Your code is ready',
  qr_desc: 'Print it, save it to your wallet, or set it as your lock screen.',
  qr_scanned: 'Scanned by any camera.',
  qr_wallpaperBtn: 'Create lock-screen wallpaper',
  qr_svgBtn: 'SVG',
  qr_shareBtn: 'Share',
  qr_reveals: 'What the QR reveals',
  qr_fieldName: 'Name',
  qr_fieldBlood: 'Blood type',
  qr_fieldAllergies: 'Allergies',
  qr_fieldConditions: 'Conditions',
  qr_fieldEmergency: 'Emergency',
  qr_fieldUnknown: 'Unknown',
  qr_wallpaperTitle: 'Lock-screen wallpaper',
  qr_wallpaperDesc: 'Exports at 1080×2340 — fits any modern phone.',
  qr_profileSuffix: "'s profile",
  qr_yourProfile: 'your profile',

  // InfoPage
  info_patient: 'Patient',
  info_bloodType: 'Blood type',
  info_bloodUnknown: 'Blood unknown',
  info_allergies: 'Allergies',
  info_voiceAlert: 'Voice alert',
  info_conditions: 'Conditions',
  info_medications: 'Medications',
  info_emergencyContact: 'Emergency contact',
  info_profileNotFound: 'Profile not found',
  info_exit: 'Exit',
  info_updatedJustNow: 'Updated just now',
  info_updatedMinutesAgo: 'Updated {n}m ago',
  info_updatedHoursAgo: 'Updated {n}h ago',
  info_updatedDaysAgo: 'Updated {n}d ago',
  info_loading: 'Loading profile…',
  info_invalidQr: 'This QR code may be invalid or the profile has been removed.',
  info_createProfile: 'Create a mediCode profile',
  info_translating: 'Translating…',
  info_generating: 'Generating…',
  info_retryGeneration: 'Retry generation',
  info_downloadPdf: 'Download patient info',

  // WallpaperCard
  wallpaper_scanHint: 'Scan for full profile in your language',
  wallpaper_preview: 'Lock screen wallpaper preview',
  wallpaper_exporting: 'Exporting…',
  wallpaper_download: 'Download PNG',
  wallpaper_badgeTitle: 'Medical',
  wallpaper_namePlaceholder: 'Your name',
  wallpaper_blood: 'Blood',
  wallpaper_allergies: 'Allergies',
  wallpaper_conditions: 'Conditions',
  wallpaper_medications: 'Meds',
  wallpaper_emergency: 'Emergency',
  wallpaper_tipHeading: 'Tip',
  wallpaper_tipBody: "Set this as your lock screen, not home screen — so it's visible without unlocking.",
  wallpaper_layout: 'Layout',

  // NotFound
  notfound_title: 'Page not found',
  notfound_desc: 'This QR code may be invalid, expired, or the link is broken.',
  notfound_cta: 'Create a mediCode profile',
}

const LabelsCtx = createContext(null)

export function LabelsProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof navigator === 'undefined') return 'en'
    return navigator.language?.split('-')[0]?.toLowerCase() || 'en'
  })
  const [labels, setLabels] = useState(APP_LABELS)
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const [geoAutoDetected, setGeoAutoDetected] = useState(false)

  useEffect(() => {
    fetchLanguages()
      .then(langs => setLanguages([{ code: 'en', label: 'English' }, ...langs.filter(l => l.code !== 'en')]))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.language) return
    getLocationLanguage().then(detected => {
      if (detected) { setLang(detected); setGeoAutoDetected(true) }
    })
  }, [])

  useEffect(() => {
    if (lang === 'en') { setLabels(APP_LABELS); return }
    translateFields(APP_LABELS, lang).then(setLabels)
  }, [lang])

  return (
    <LabelsCtx.Provider value={{ labels, lang, setLang, languages, geoAutoDetected }}>
      {children}
    </LabelsCtx.Provider>
  )
}

export function useLabels() {
  return useContext(LabelsCtx)
}
