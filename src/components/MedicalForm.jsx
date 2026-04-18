import { useState, useEffect } from 'react'
import QRDisplay from './QRDisplay'
import { supabase } from '../lib/supabase'
import { fetchLanguages, useTranslatedLabels } from '../lib/translate'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const EMPTY_FORM = {
  name: '',
  email: '',
  bloodType: '',
  allergies: '',
  conditions: '',
  medications: '',
  emergencyContact: '',
  emergencyPhone: '',
}

const FORM_LABELS = {
  languageTitle: 'Select Language',
  languageSubtitle: 'Choose the language for this session',
  continueBtn: 'Continue',
  subtitle: 'Your medical profile, scannable in any language.',
  alreadyHaveProfile: 'Already have a profile?',
  find: 'Find',
  noProfileFound: 'No profile found for that email.',
  editingExisting: 'Editing existing profile',
  createNewInstead: 'Create new instead',
  criticalInfo: 'Critical Information',
  fullName: 'Full Name',
  email: 'Email',
  bloodType: 'Blood Type',
  bloodUnknown: 'Unknown',
  allergies: 'Allergies',
  additionalDetails: 'Additional Details',
  conditions: 'Medical Conditions',
  medications: 'Current Medications',
  emergencyContact: 'Emergency Contact',
  emergencyPhone: 'Their Phone',
  saving: 'Saving…',
  update: 'Update My QR Code →',
  generate: 'Generate My QR Code →',
  phLookupEmail: 'Enter your email',
  phFullName: 'As it appears on your ID',
  phEmail: 'Used to retrieve your profile later',
  phAllergies: 'e.g. Penicillin, peanuts, latex',
  phConditions: 'e.g. Type 1 Diabetes, Asthma',
  phMedications: 'e.g. Insulin 10u, Albuterol PRN',
  phEmergencyContact: 'Jane Doe',
  phEmergencyPhone: '+1 555 000 0000',
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
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const labels = useTranslatedLabels(FORM_LABELS, lang)

  useEffect(() => {
    fetchLanguages()
      .then((langs) => setLanguages([{ code: 'en', label: 'English' }, ...langs.filter((l) => l.code !== 'en')]))
      .catch(() => {})
  }, [])

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleLookup(e) {
    e.preventDefault()
    setLooking(true)
    setLookupError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', lookupEmail.trim().toLowerCase())
      .single()
    if (error || !data) {
      setLookupError(labels.noProfileFound)
      setLooking(false)
      return
    }
    setForm({
      name: data.name || '',
      email: data.email || '',
      bloodType: data.blood_type || '',
      allergies: data.allergies || '',
      conditions: data.conditions || '',
      medications: data.medications || '',
      emergencyContact: data.emergency_contact || '',
      emergencyPhone: data.emergency_phone || '',
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
      if (error) {
        setError('Could not update your profile. Please try again.')
        setSaving(false)
        return
      }
      setUuid(existingUuid)
    } else {
      const email = form.email.trim().toLowerCase()
      let resolvedUuid = null

      if (email) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()
        if (existing) {
          const { error } = await supabase.from('profiles').update(fields).eq('id', existing.id)
          if (error) {
            setError('Could not update your profile. Please try again.')
            setSaving(false)
            return
          }
          resolvedUuid = existing.id
        }
      }

      if (!resolvedUuid) {
        const { data, error } = await supabase.from('profiles').insert(fields).select('id').single()
        if (error) {
          setError('Could not save your profile. Please try again.')
          setSaving(false)
          return
        }
        resolvedUuid = data.id
      }

      setUuid(resolvedUuid)
    }
    setSaving(false)
  }

  if (step === 'language') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-xs shadow-xl space-y-5">
          <div className="text-center space-y-1">
            <p className="text-3xl">🌐</p>
            <p className="text-white font-bold text-lg">{labels.languageTitle}</p>
            <p className="text-gray-400 text-sm">{labels.languageSubtitle}</p>
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <button
            onClick={() => setStep('form')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {labels.continueBtn}
          </button>
        </div>
      </div>
    )
  }

  if (uuid) {
    return (
      <QRDisplay
        uuid={uuid}
        form={form}
        lang={lang}
        languages={languages}
        onLangChange={setLang}
        onBack={() => { setUuid(null); setExistingUuid(null) }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        <div className="bg-red-600 px-8 py-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl">⚕</span>
              <h1 className="text-2xl font-bold text-white">mediCode</h1>
            </div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-sm bg-red-700 text-white border border-red-500 rounded-lg px-2 py-1 focus:outline-none"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <p className="text-red-100 text-sm">{labels.subtitle}</p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {!existingUuid && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{labels.alreadyHaveProfile}</p>
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => { setLookupEmail(e.target.value); setLookupError(null) }}
                  placeholder={labels.phLookupEmail}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-gray-300"
                />
                <button
                  type="submit"
                  disabled={looking || !lookupEmail.trim()}
                  className="bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {looking ? '…' : labels.find}
                </button>
              </form>
              {lookupError && <p className="text-red-500 text-xs">{lookupError}</p>}
            </div>
          )}

          {existingUuid && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
              <span>{labels.editingExisting}</span>
              <button
                onClick={() => { setExistingUuid(null); setForm(EMPTY_FORM) }}
                className="text-green-600 hover:text-green-800 text-xs underline"
              >
                {labels.createNewInstead}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-widest">
                {labels.criticalInfo}
              </h2>
              <Field label={labels.fullName} name="name" value={form.name} onChange={handleChange} required placeholder={labels.phFullName} />
              <Field label={labels.email} name="email" value={form.email} onChange={handleChange} placeholder={labels.phEmail} type="email" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.bloodType}</label>
                <select
                  name="bloodType"
                  value={form.bloodType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  <option value="">{labels.bloodUnknown}</option>
                  {BLOOD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Field
                label={labels.allergies}
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                placeholder={labels.phAllergies}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                {labels.additionalDetails}
              </h2>
              <Field label={labels.conditions} name="conditions" value={form.conditions} onChange={handleChange} placeholder={labels.phConditions} />
              <Field label={labels.medications} name="medications" value={form.medications} onChange={handleChange} placeholder={labels.phMedications} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={labels.emergencyContact} name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder={labels.phEmergencyContact} />
                <Field label={labels.emergencyPhone} name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} placeholder={labels.phEmergencyPhone} />
              </div>
            </section>

            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {saving ? labels.saving : existingUuid ? labels.update : labels.generate}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder = '', required = false, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-gray-300"
      />
    </div>
  )
}
