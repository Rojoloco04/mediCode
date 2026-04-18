import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateFields, fetchLanguages } from '../lib/translate'
import { generateAlertAudio } from '../lib/elevenlabs'

const TRANSLATABLE = ['allergies', 'conditions', 'medications']

const UI_LABELS = {
  patient: 'Patient',
  allergies: 'Allergies',
  bloodUnknown: 'Blood unknown',
  conditions: 'Medical Conditions',
  medications: 'Current Medications',
  emergencyContact: 'Emergency Contact',
}

const DEMO_RESPONDER_IDS = new Set(['FR-001', 'FR-002', 'FR-999'])

function AuthGate({ onAuthorized }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (DEMO_RESPONDER_IDS.has(input.trim().toUpperCase())) {
      onAuthorized()
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-xs shadow-xl space-y-5">
        <div className="text-center space-y-1">
          <p className="text-3xl">🪪</p>
          <p className="text-white font-bold text-lg">First Responder Access</p>
          <p className="text-gray-400 text-sm">Enter your responder ID to view patient info</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="e.g. FR-001"
            className="w-full bg-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-xs text-center">Invalid responder ID. Access denied.</p>
          )}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Verify &amp; Access
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center">Demo IDs: FR-001 · FR-002 · FR-999</p>
      </div>
    </div>
  )
}

export default function InfoPage() {
  const { uuid } = useParams()
  const [authorized, setAuthorized] = useState(false)
  const [raw, setRaw] = useState(null)
  const [displayed, setDisplayed] = useState(null)
  const [lang, setLang] = useState(() => {
    if (typeof navigator === 'undefined') return 'en'
    const native = navigator.language?.split('-')[0]?.toLowerCase()
    return native || 'en'
  })
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const [labels, setLabels] = useState(UI_LABELS)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alertText, setAlertText] = useState('This person has been involved in a medical emergency.')
  const [alertAudioUrl, setAlertAudioUrl] = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState(null)

  useEffect(() => {
    fetchLanguages()
      .then((langs) => setLanguages([{ code: 'en', label: 'English' }, ...langs.filter((l) => l.code !== 'en')]))
      .catch(() => {})
  }, [])

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
    if (lang === 'en') { setDisplayed(raw); setLabels(UI_LABELS); return }
    setTranslating(true)
    const toTranslate = Object.fromEntries(
      TRANSLATABLE.filter((k) => raw[k]).map((k) => [k, raw[k]])
    )
    Promise.all([
      translateFields(toTranslate, lang),
      translateFields(UI_LABELS, lang),
    ])
      .then(([translated, translatedLabels]) => {
        setDisplayed({ ...raw, ...translated })
        setLabels(translatedLabels)
      })
      .finally(() => setTranslating(false))
  }, [lang, raw])

  async function handleGenerateAlert() {
    if (!alertText) return
    setAudioError(null)
    setAudioLoading(true)
    setAlertAudioUrl(null)

    try {
      const audioUrl = await generateAlertAudio(alertText)
      setAlertAudioUrl(audioUrl)
    } catch (error) {
      setAudioError(error.message || 'Unable to generate audio alert')
    } finally {
      setAudioLoading(false)
    }
  }

  function handleCallEmergencyContact() {
    if (!displayed?.emergencyPhone) return
    window.location.href = `tel:${displayed.emergencyPhone}`
  }

  if (!authorized) return <AuthGate onAuthorized={() => setAuthorized(true)} />

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
          <span className="text-white font-bold text-base">mediCode</span>
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

      <div className="max-w-sm mx-auto px-4">
        <p className="text-xs text-white text-right opacity-90">Default language is your device locale; choose another from the menu.</p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
        {/* Name + blood type hero */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{labels.patient}</p>
            <p className="text-lg font-bold text-gray-900">{displayed.name}</p>
          </div>
          {displayed.bloodType ? (
            <div className="bg-red-600 text-white text-base font-bold rounded-xl w-16 h-16 flex items-center justify-center shadow">
              {displayed.bloodType}
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-400 text-xs font-medium rounded-xl w-14 h-14 flex items-center justify-center">
              {labels.bloodUnknown}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Emergency voice alert</p>
              <p className="text-sm text-gray-700">This message is ready for first responders and can be generated in the device language.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
              Mobile-ready
            </span>
          </div>
          <textarea
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGenerateAlert}
              disabled={audioLoading || !alertText.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {audioLoading ? 'Generating alert…' : 'Generate emergency alert audio'}
            </button>
            <button
              onClick={handleCallEmergencyContact}
              disabled={!displayed.emergencyPhone}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {displayed.emergencyPhone ? 'Call emergency contact' : 'No emergency phone available'}
            </button>
          </div>
          {audioError && <p className="text-red-500 text-sm">{audioError}</p>}
          {alertAudioUrl && (
            <audio controls src={alertAudioUrl} className="w-full mt-3 rounded-xl" />
          )}
        </div>

        {/* Allergies — most critical, always prominent */}
        {displayed.allergies && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">⚠ {labels.allergies}</p>
            <p className="text-base font-semibold text-red-800">{displayed.allergies}</p>
          </div>
        )}

        {translating && (
          <p className="text-xs text-center text-gray-400 animate-pulse">Translating…</p>
        )}

        {/* Conditions */}
        {displayed.conditions && (
          <InfoCard label={labels.conditions} value={displayed.conditions} />
        )}

        {/* Medications */}
        {displayed.medications && (
          <InfoCard label={labels.medications} value={displayed.medications} />
        )}

        {/* Emergency contact */}
        {(displayed.emergencyContact || displayed.emergencyPhone) && (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{labels.emergencyContact}</p>
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
