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
    if (lang === 'en') { setDisplayed(raw); return }
    setTranslating(true)
    const toTranslate = Object.fromEntries(
      TRANSLATABLE.filter((k) => raw[k]).map((k) => [k, raw[k]])
    )
    translateFields(toTranslate, lang)
      .then((translated) => setDisplayed({ ...raw, ...translated }))
      .finally(() => setTranslating(false))
  }, [lang, raw])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-3xl animate-pulse">⚕</div>
          <p className="text-gray-400 text-sm">Loading profile…</p>
        </div>
      </div>
    )
  }

  if (!displayed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-4xl">🔍</p>
          <p className="text-gray-700 font-medium">Profile not found</p>
          <p className="text-gray-400 text-sm">This QR code may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-red-600 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">⚕</span>
          <span className="text-white font-bold text-base">QR-Aid</span>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="text-sm bg-red-700 text-white border border-red-500 rounded-lg px-2 py-1 focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
        {/* Name + blood type hero */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Patient</p>
            <p className="text-lg font-bold text-gray-900">{displayed.name}</p>
          </div>
          {displayed.bloodType ? (
            <div className="bg-red-600 text-white text-lg font-bold rounded-xl w-14 h-14 flex items-center justify-center shadow">
              {displayed.bloodType}
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-400 text-xs font-medium rounded-xl w-14 h-14 flex items-center justify-center">
              Blood<br/>unknown
            </div>
          )}
        </div>

        {/* Allergies — most critical, always prominent */}
        {displayed.allergies && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">⚠ Allergies</p>
            <p className="text-base font-semibold text-red-800">{displayed.allergies}</p>
          </div>
        )}

        {translating && (
          <p className="text-xs text-center text-gray-400 animate-pulse">Translating…</p>
        )}

        {/* Conditions */}
        {displayed.conditions && (
          <InfoCard label="Medical Conditions" value={displayed.conditions} />
        )}

        {/* Medications */}
        {displayed.medications && (
          <InfoCard label="Current Medications" value={displayed.medications} />
        )}

        {/* Emergency contact */}
        {(displayed.emergencyContact || displayed.emergencyPhone) && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Emergency Contact</p>
            {displayed.emergencyContact && (
              <p className="text-sm font-semibold text-gray-800">{displayed.emergencyContact}</p>
            )}
            {displayed.emergencyPhone && (
              <a
                href={`tel:${displayed.emergencyPhone}`}
                className="text-red-600 font-bold text-base hover:underline"
              >
                {displayed.emergencyPhone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}
