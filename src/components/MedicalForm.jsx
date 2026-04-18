import { useState } from 'react'
import QRDisplay from './QRDisplay'
import { supabase } from '../lib/supabase'

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

export default function MedicalForm() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingUuid, setExistingUuid] = useState(null)
  const [uuid, setUuid] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lookupEmail, setLookupEmail] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState(null)

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
      setLookupError('No profile found for that email.')
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
      const { data, error } = await supabase.from('profiles').insert(fields).select('id').single()
      if (error) {
        setError('Could not save your profile. Please try again.')
        setSaving(false)
        return
      }
      setUuid(data.id)
    }
    setSaving(false)
  }

  if (uuid) {
    return <QRDisplay uuid={uuid} form={form} onBack={() => { setUuid(null); setExistingUuid(null) }} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-8 py-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-2xl">⚕</span>
            <h1 className="text-2xl font-bold text-white">mediCode</h1>
          </div>
          <p className="text-red-100 text-sm">
            Your medical profile, scannable in any language.
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Find existing profile */}
          {!existingUuid && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Already have a profile?</p>
              <form onSubmit={handleLookup} className="flex gap-2">
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => { setLookupEmail(e.target.value); setLookupError(null) }}
                  placeholder="Enter your email"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-gray-300"
                />
                <button
                  type="submit"
                  disabled={looking || !lookupEmail.trim()}
                  className="bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {looking ? '…' : 'Find'}
                </button>
              </form>
              {lookupError && <p className="text-red-500 text-xs">{lookupError}</p>}
            </div>
          )}

          {existingUuid && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
              <span>Editing existing profile</span>
              <button
                onClick={() => { setExistingUuid(null); setForm(EMPTY_FORM) }}
                className="text-green-600 hover:text-green-800 text-xs underline"
              >
                Create new instead
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Critical section */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-widest">
                Critical Information
              </h2>
              <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required placeholder="As it appears on your ID" />
              <Field label="Email" name="email" value={form.email} onChange={handleChange} placeholder="Used to retrieve your profile later" type="email" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                <select
                  name="bloodType"
                  value={form.bloodType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                >
                  <option value="">Unknown</option>
                  {BLOOD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Allergies"
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                placeholder="e.g. Penicillin, peanuts, latex"
              />
            </section>

            {/* Additional section */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Additional Details
              </h2>
              <Field label="Medical Conditions" name="conditions" value={form.conditions} onChange={handleChange} placeholder="e.g. Type 1 Diabetes, Asthma" />
              <Field label="Current Medications" name="medications" value={form.medications} onChange={handleChange} placeholder="e.g. Insulin 10u, Albuterol PRN" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Emergency Contact" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Jane Doe" />
                <Field label="Their Phone" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} placeholder="+1 555 000 0000" />
              </div>
            </section>

            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {saving ? 'Saving…' : existingUuid ? 'Update My QR Code →' : 'Generate My QR Code →'}
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
