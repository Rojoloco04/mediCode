import { useState } from 'react'
import QRDisplay from './QRDisplay'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const EMPTY_FORM = {
  name: '',
  bloodType: '',
  allergies: '',
  conditions: '',
  medications: '',
  emergencyContact: '',
  emergencyPhone: '',
}

export default function MedicalForm() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [uuid, setUuid] = useState(null)
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    // TODO Hour 2: save to Supabase, get back uuid
    const fakeUuid = crypto.randomUUID()
    setUuid(fakeUuid)
    setSaving(false)
  }

  if (uuid) {
    return <QRDisplay uuid={uuid} form={form} onBack={() => setUuid(null)} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-1">QR-Aid</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your medical profile, scannable in any language.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
            <select
              name="bloodType"
              value={form.bloodType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Unknown</option>
              {BLOOD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <Field label="Allergies" name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. Penicillin, peanuts" />
          <Field label="Medical Conditions" name="conditions" value={form.conditions} onChange={handleChange} placeholder="e.g. Type 1 Diabetes, Asthma" />
          <Field label="Current Medications" name="medications" value={form.medications} onChange={handleChange} placeholder="e.g. Insulin, Albuterol" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Emergency Contact" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Jane Doe" />
            <Field label="Their Phone" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} placeholder="+1 555 000 0000" />
          </div>

          <button
            type="submit"
            disabled={saving || !form.name}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Generate QR Code'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder = '', required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
    </div>
  )
}
