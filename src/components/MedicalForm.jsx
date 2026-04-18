import { useState } from 'react'
import QRDisplay from './QRDisplay'
import { supabase, profileFromRow } from '../lib/supabase'
import { useLabels } from '../lib/LabelsContext'
import {
  BrandMark, Chip, Btn, Field, LangPill, LanguageGate, PageShell,
  SectionHeader, BloodPicker, ArrowRightIcon, LockIcon, CheckIcon,
} from './ui'

const EMPTY_FORM = {
  name: '', email: '', bloodType: '',
  allergies: '', conditions: '', medications: '',
  emergencyContact: '', emergencyPhone: '',
}

export default function MedicalForm() {
  const { labels, lang, setLang, langLabel } = useLabels()
  const [step, setStep] = useState('language')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingUuid, setExistingUuid] = useState(null)
  const [uuid, setUuid] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lookupEmail, setLookupEmail] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState(null)

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
      setLookupError(labels.form_noProfileFound)
      setLooking(false)
      return
    }
    const profile = profileFromRow(data)
    setForm({
      name: profile.name || '', email: profile.email || '',
      bloodType: profile.bloodType || '', allergies: profile.allergies || '',
      conditions: profile.conditions || '', medications: profile.medications || '',
      emergencyContact: profile.emergencyContact || '', emergencyPhone: profile.emergencyPhone || '',
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
      if (error) { setError(labels.form_errorUpdate); setSaving(false); return }
      setUuid(existingUuid)
    } else {
      const email = form.email.trim().toLowerCase()
      let resolvedUuid = null
      if (email) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
        if (existing) {
          const { error } = await supabase.from('profiles').update(fields).eq('id', existing.id)
          if (error) { setError(labels.form_errorUpdate); setSaving(false); return }
          resolvedUuid = existing.id
        }
      }
      if (!resolvedUuid) {
        const { data, error } = await supabase.from('profiles').insert(fields).select('id').single()
        if (error) { setError(labels.form_errorSave); setSaving(false); return }
        resolvedUuid = data.id
      }
      setExistingUuid(resolvedUuid)
      setUuid(resolvedUuid)
    }
    setSaving(false)
  }

  if (step === 'language') {
    return <LanguageGate onContinue={() => setStep('form')} />
  }

  if (uuid) {
    return <QRDisplay uuid={uuid} form={form} onBack={() => setUuid(null)} />
  }

  return (
    <PageShell>

        <div style={{
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-2)',
          position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 5,
        }}>
          <BrandMark />
          <LangPill code={lang} label={langLabel} onClick={() => setStep('language')} />
        </div>

        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {!existingUuid && <Chip tone="neutral">{labels.form_draft}</Chip>}
            {existingUuid && <Chip tone="good"><CheckIcon size={10} /> {labels.form_editingChip}</Chip>}
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em',
            color: 'var(--ink)', lineHeight: 1.1,
          }}>
            {labels.form_pageTitle}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            {labels.form_pageDesc}
          </p>
        </div>

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
                {labels.form_haveProfile}
              </div>
              <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={e => { setLookupEmail(e.target.value); setLookupError(null) }}
                  placeholder={labels.form_lookupPlaceholder}
                  style={{
                    flex: 1, padding: '9px 11px', borderRadius: 9,
                    border: '1px solid var(--line)', background: 'var(--paper)',
                    fontSize: 13, letterSpacing: '-0.01em', color: 'var(--ink)',
                  }}
                />
                <Btn variant="ghost" full={false} size="sm" type="submit"
                  disabled={looking || !lookupEmail.trim()}>
                  {looking ? '…' : labels.form_find}
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
                <CheckIcon size={14} /> {labels.form_editingExisting}
              </div>
              <button
                onClick={() => { setExistingUuid(null); setForm(EMPTY_FORM) }}
                style={{
                  fontSize: 12, color: 'var(--good)', textDecoration: 'underline',
                  textUnderlineOffset: 2, cursor: 'pointer',
                }}
              >
                {labels.form_createNew}
              </button>
            </div>
          </div>
        )}

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
            <SectionHeader num={1} title={labels.form_sectionCritical} desc={labels.form_sectionCriticalDesc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label={labels.form_fullName} name="name" value={form.name} onChange={handleChange}
                placeholder={labels.form_phName} required />
              <Field label={labels.form_email} name="email" type="email" value={form.email} onChange={handleChange}
                placeholder={labels.form_phEmail} hint={labels.form_emailHint} />
              <BloodPicker value={form.bloodType} onChange={v => setForm(f => ({ ...f, bloodType: v }))} label={labels.form_bloodType} optionalLabel={labels.form_optional} />
              <Field label={labels.form_allergies} name="allergies" value={form.allergies} onChange={handleChange}
                placeholder={labels.form_phAllergies} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionHeader num={2} title={labels.form_sectionMedical} desc={labels.form_sectionMedicalDesc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label={labels.form_conditions} name="conditions" value={form.conditions} onChange={handleChange}
                placeholder={labels.form_phConditions} />
              <Field label={labels.form_medications} name="medications" value={form.medications} onChange={handleChange}
                placeholder={labels.form_phMedications} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionHeader num={3} title={labels.form_sectionEmergency} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={labels.form_emergencyName} name="emergencyContact" value={form.emergencyContact}
                onChange={handleChange} placeholder={labels.form_phEmergencyName} />
              <Field label={labels.form_emergencyPhone} name="emergencyPhone" value={form.emergencyPhone}
                onChange={handleChange} placeholder={labels.form_phEmergencyPhone} />
            </div>
          </div>

          <Btn type="submit" disabled={saving || !form.name.trim()} icon={<ArrowRightIcon size={16} />}>
            {saving ? labels.form_saving : existingUuid ? labels.form_updateBtn : labels.form_generateBtn}
          </Btn>
          <p style={{
            fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 12,
            display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
            fontFamily: 'var(--mono)', letterSpacing: '0.02em',
          }}>
            <LockIcon size={10} /> {labels.form_footerText}
          </p>
        </form>

    </PageShell>
  )
}
