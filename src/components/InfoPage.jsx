import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

// TODO Hour 3: wire up translation
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'Deutsch' },
]

export default function InfoPage() {
  const { uuid } = useParams()
  const [data, setData] = useState(null)
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // TODO Hour 2: fetch from Supabase by uuid
      // Stub so the page renders during dev
      setData({
        name: 'Jane Doe',
        bloodType: 'O+',
        allergies: 'Penicillin',
        conditions: 'Type 1 Diabetes',
        medications: 'Insulin',
        emergencyContact: 'John Doe',
        emergencyPhone: '+1 555 000 0000',
      })
      setLoading(false)
    }
    load()
  }, [uuid])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Profile not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-red-600">QR-Aid</h1>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <Row label="Name" value={data.name} />
          <Row label="Blood Type" value={data.bloodType} highlight />
          <Row label="Allergies" value={data.allergies} highlight />
          <Row label="Conditions" value={data.conditions} />
          <Row label="Medications" value={data.medications} />
          <Row label="Emergency Contact" value={`${data.emergencyContact} — ${data.emergencyPhone}`} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false }) {
  if (!value) return null
  return (
    <div className={`rounded-lg px-4 py-3 ${highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-red-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
