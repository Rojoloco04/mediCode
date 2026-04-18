import { useState, useEffect } from 'react'
import QRDisplay from './QRDisplay'
import { supabase } from '../lib/supabase'
import { fetchLanguages, getLocationLanguage, useTranslatedLabels } from '../lib/translate'
import {
  BrandMark, Chip, Btn, Field, LangPill, LanguageGate,
  SectionHeader, BloodPicker, ArrowRightIcon, LockIcon, CheckIcon,
} from './ui'

const FORM_LABELS = {
  pageTitle: 'Your medical profile',
  pageDesc: 'Kept private until a QR code is scanned — then shown to responders in their language.',
  haveProfile: 'Have a profile already?',
  lookupPlaceholder: 'your@email.com',
  find: 'Find',
  noProfileFound: 'No profile found for that email.',
  draft: 'Draft',
  editingChip: 'Editing existing',
  editingExisting: 'Editing existing profile',
  createNew: 'Create new',
  footerText: 'end-to-end encrypted · visible only on scan',
  fullName: 'Full name',
  email: 'Email',
  emailHint: 'used to retrieve later',
  bloodType: 'Blood type',
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Current medications',
  emergencyName: 'Name',
  emergencyPhone: 'Phone',
  sectionCritical: 'Critical',
  sectionCriticalDesc: 'Shown first to responders.',
  sectionMedical: 'Medical',
  sectionMedicalDesc: 'Optional context for treatment.',
  sectionEmergency: 'Emergency contact',
  phName: 'As it appears on your ID',
  phEmail: 'you@email.com',
  phAllergies: 'Penicillin, peanuts, latex',
  phConditions: 'Type 1 diabetes, asthma',
  phMedications: 'Insulin 10u, Albuterol PRN',
  phEmergencyName: 'Jane Doe',
  phEmergencyPhone: '+1 555 000 0000',
  generateBtn: 'Generate QR code',
  updateBtn: 'Update QR code',
  saving: 'Saving…',
}

const EMPTY_FORM = {
  name: '', email: '', bloodType: '',
  allergies: '', conditions: '', medications: '',
  emergencyContact: '', emergencyPhone: '',
}

export default function MedicalForm() {
  const [step, setStep] = useState('language')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingUuid, setExistingUuid] = useState(null)
  const [uuid, setUuid] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lookupEmail, setLookupEmail] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [lang, setLang] = useState(() => {
    if (typeof navigator === 'undefined') return 'en'
    return navigator.language?.split('-')[0]?.toLowerCase() || 'en'
  })
  const [geoAutoDetected, setGeoAutoDetected] = useState(false)
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const labels = useTranslatedLabels(FORM_LABELS, lang)

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

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleLookup(e) {
    e.preventDefault()
    setLooking(true)
    setLookupError(null)
    const { data, error } = await supabase
      .from('profiles').select('*').eq('email', lookupEmail.trim().toLowerCase()).single()
    if (error || !data) {
      setLookupError(labels.noProfileFound)
      setLooking(false)
      return
    }
    setForm({
      name: data.name || '', email: data.email || '',
      bloodType: data.blood_type || '', allergies: data.allergies || '',
      conditions: data.conditions || '', medications: data.medications || '',
      emergencyContact: data.emergency_contact || '', emergencyPhone: data.emergency_phone || '',
    })
    setExistingUuid(data.id)
    setLooking(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fields = {
      name: form.name,
      email: form.email.trim().toLowerCase() || null,
      blood_type: form.bloodType || null,
      allergies: form.allergies || null,
      conditions: form.conditions || null,
      medications: form.medications || null,
      emergency_contact: form.emergencyContact || null,
      emergency_phone: form.emergencyPhone || null,
    }
    if (existingUuid) {
      const { error } = await supabase.from('profiles').update(fields).eq('id', existingUuid)
      if (error) { setError('Could not update profile. Please try again.'); setSaving(false); return }
      setUuid(existingUuid)
    } else {
      const email = form.email.trim().toLowerCase()
      let resolvedUuid = null
      if (email) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
        if (existing) {
          const { error } = await supabase.from('profiles').update(fields).eq('id', existing.id)
          if (error) { setError('Could not update profile. Please try again.'); setSaving(false); return }
          resolvedUuid = existing.id
        }
      }
      if (!resolvedUuid) {
        const { data, error } = await supabase.from('profiles').insert(fields).select('id').single()
        if (error) { setError('Could not save profile. Please try again.'); setSaving(false); return }
        resolvedUuid = data.id
      }
      setExistingUuid(resolvedUuid)
      setUuid(resolvedUuid)
    }
    setSaving(false)
  }

  if (step === 'language') {
    return (
      <LanguageGate
        lang={lang} setLang={setLang}
        languages={languages}
        onContinue={() => setStep('form')}
        geoAutoDetected={geoAutoDetected}
      />
    )
  }

  if (uuid) {
    return (
      <QRDisplay
        uuid={uuid} form={form}
        lang={lang} languages={languages}
        onLangChange={setLang}
        onBack={() => setUuid(null)}
      />
    )
  }

  const langObj = languages.find(l => l.code === lang) || { label: 'English' }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Sticky header */}
        <div style={{
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-2)',
          position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 5,
        }}>
          <BrandMark />
          <LangPill code={lang} label={langObj.label} onClick={() => setStep('language')} />
        </div>

        {/* Title */}
        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {!existingUuid && <Chip tone="neutral">{labels.draft}</Chip>}
            {existingUuid && <Chip tone="good"><CheckIcon size={10} /> {labels.editingChip}</Chip>}
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em',
            color: 'var(--ink)', lineHeight: 1.1,
          }}>
            {labels.pageTitle}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            {labels.pageDesc}
          </p>
        </div>

        {/* Lookup */}
        {!existingUuid && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{
              background: 'var(--paper-2)', border: '1px solid var(--line-2)',
              borderRadius: 12, padding: 14,
            }}>
              <div style={{
                fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
              }}>
                {labels.haveProfile}
              </div>
              <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={e => { setLookupEmail(e.target.value); setLookupError(null) }}
                  placeholder={labels.lookupPlaceholder}
                  style={{
                    flex: 1, padding: '9px 11px', borderRadius: 9,
                    border: '1px solid var(--line)', background: 'var(--paper)',
                    fontSize: 13, letterSpacing: '-0.01em', color: 'var(--ink)',
                  }}
                />
                <Btn variant="ghost" full={false} size="sm" type="submit"
                  disabled={looking || !lookupEmail.trim()}>
                  {looking ? '…' : labels.find}
                </Btn>
              </form>
              {lookupError && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--accent)' }}>{lookupError}</p>
              )}
            </div>
          </div>
        )}

        {existingUuid && (
          <div style={{ padding: '0 24px 16px' }}>
            <div style={{
              background: 'var(--good-soft)', border: '1px solid oklch(88% 0.05 155)',
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <div style={{ fontSize: 13, color: 'var(--good)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckIcon size={14} /> {labels.editingExisting}
              </div>
              <button
                onClick={() => { setExistingUuid(null); setForm(EMPTY_FORM) }}
                style={{
                  fontSize: 12, color: 'var(--good)', textDecoration: 'underline',
                  textUnderlineOffset: 2, cursor: 'pointer',
                }}
              >
                {labels.createNew}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 24px 48px' }}>
          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--accent-soft)',
              border: '1px solid oklch(85% 0.06 25)', borderRadius: 10,
              marginBottom: 20, fontSize: 13, color: 'var(--accent-ink)',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <SectionHeader num={1} title={labels.sectionCritical} desc={labels.sectionCriticalDesc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label={labels.fullName} name="name" value={form.name} onChange={handleChange}
                placeholder={labels.phName} required />
              <Field label={labels.email} name="email" type="email" value={form.email} onChange={handleChange}
                placeholder={labels.phEmail} hint={labels.emailHint} />
              <BloodPicker value={form.bloodType} onChange={v => setForm(f => ({ ...f, bloodType: v }))} />
              <Field label={labels.allergies} name="allergies" value={form.allergies} onChange={handleChange}
                placeholder={labels.phAllergies} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionHeader num={2} title={labels.sectionMedical} desc={labels.sectionMedicalDesc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label={labels.conditions} name="conditions" value={form.conditions} onChange={handleChange}
                placeholder={labels.phConditions} />
              <Field label={labels.medications} name="medications" value={form.medications} onChange={handleChange}
                placeholder={labels.phMedications} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionHeader num={3} title={labels.sectionEmergency} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={labels.emergencyName} name="emergencyContact" value={form.emergencyContact}
                onChange={handleChange} placeholder={labels.phEmergencyName} />
              <Field label={labels.emergencyPhone} name="emergencyPhone" value={form.emergencyPhone}
                onChange={handleChange} placeholder={labels.phEmergencyPhone} />
            </div>
          </div>

          <Btn type="submit" disabled={saving || !form.name.trim()} icon={<ArrowRightIcon size={16} />}>
            {saving ? labels.saving : existingUuid ? labels.updateBtn : labels.generateBtn}
          </Btn>
          <p style={{
            fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
            fontFamily: 'var(--mono)', letterSpacing: '0.02em',
          }}>
            <LockIcon size={10} /> {labels.footerText}
          </p>
        </form>

      </div>
    </div>
  )
}
