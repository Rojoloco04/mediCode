import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateFields } from '../lib/translate'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
]

// Fields that make sense to translate (not name/phone)
const TRANSLATABLE = ['allergies', 'conditions', 'medications']

export default function InfoPage() {
  const { uuid } = useParams()
  const [raw, setRaw] = useState(null)
  const [displayed, setDisplayed] = useState(null)
  const [lang, setLang] = useState('en')
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uuid)
        .single()
      if (!error && data) {
        const profile = {
          name: data.name,
          bloodType: data.blood_type,
          allergies: data.allergies,
          conditions: data.conditions,
          medications: data.medications,
          emergencyContact: data.emergency_contact,
          emergencyPhone: data.emergency_phone,
        }
        setRaw(profile)
        setDisplayed(profile)
      }
      setLoading(false)
    }
    load()
  }, [uuid])

  useEffect(() => {
    if (!raw) return
    if (lang === 'en') {
      setDisplayed(raw)
      return
    }
    setTranslating(true)
    const toTranslate = Object.fromEntries(
      TRANSLATABLE.filter((k) => raw[k]).map((k) => [k, raw[k]])
    )
    translateFields(toTranslate, lang)
      .then((translated) => setDisplayed({ ...raw, ...translated }))
      .finally(() => setTranslating(false))
  }, [lang, raw])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  }

  if (!displayed) {
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

        {translating && (
          <p className="text-xs text-center text-gray-400 animate-pulse">Translating…</p>
        )}

        <div className="space-y-3">
          <Row label="Name" value={displayed.name} />
          <Row label="Blood Type" value={displayed.bloodType} highlight />
          <Row label="Allergies" value={displayed.allergies} highlight />
          <Row label="Conditions" value={displayed.conditions} />
          <Row label="Medications" value={displayed.medications} />
          <Row label="Emergency Contact" value={`${displayed.emergencyContact} — ${displayed.emergencyPhone}`} />
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
