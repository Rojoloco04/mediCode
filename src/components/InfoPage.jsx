import { useEffect, useRef, useState } from 'react'
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
  voiceAlertLabel: 'Emergency voice alert',
  voiceAlertDesc: 'This message is ready for first responders and can be played in the selected language.',
  mobileReady: 'Mobile-ready',
  generateBtn: 'Generate emergency alert audio',
  generatingBtn: 'Generating alert…',
  callContactBtn: 'Call emergency contact',
  noPhoneBtn: 'No emergency phone available',
  languageTitle: 'Select Language',
  languageSubtitle: 'Choose the language for this session',
  continueBtn: 'Continue',
  responderTitle: 'First Responder Access',
  responderSubtitle: 'Enter your responder ID to view patient info',
  verifyBtn: 'Verify & Access',
  invalidId: 'Invalid responder ID. Access denied.',
}

const ALERT_TEXT_EN = 'This person has been involved in a medical emergency.'

const DEMO_RESPONDER_IDS = new Set(['FR-001', 'FR-002', 'FR-999'])

function LanguageGate({ lang, setLang, languages, labels, onContinue }) {
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
          onClick={onContinue}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          {labels.continueBtn}
        </button>
      </div>
    </div>
  )
}

function AuthGate({ onAuthorized, labels }) {
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
          <p className="text-white font-bold text-lg">{labels.responderTitle}</p>
          <p className="text-gray-400 text-sm">{labels.responderSubtitle}</p>
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
            <p className="text-red-400 text-xs text-center">{labels.invalidId}</p>
          )}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            {labels.verifyBtn}
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center">Demo IDs: FR-001 · FR-002 · FR-999</p>
      </div>
    </div>
  )
}

export default function InfoPage() {
  const { uuid } = useParams()
  const [step, setStep] = useState('language') // 'language' | 'auth' | 'main'
  const [lang, setLang] = useState(() => {
    if (typeof navigator === 'undefined') return 'en'
    return navigator.language?.split('-')[0]?.toLowerCase() || 'en'
  })
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const [raw, setRaw] = useState(null)
  const [displayed, setDisplayed] = useState(null)
  const [labels, setLabels] = useState(UI_LABELS)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alertText, setAlertText] = useState(ALERT_TEXT_EN)
  const [alertAudioUrl, setAlertAudioUrl] = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const audioRef = useRef(null)

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
    if (lang === 'en') {
      setDisplayed(raw)
      setLabels(UI_LABELS)
      setAlertText(ALERT_TEXT_EN)
      return
    }
    setTranslating(true)
    const toTranslate = Object.fromEntries(
      TRANSLATABLE.filter((k) => raw[k]).map((k) => [k, raw[k]])
    )
    Promise.all([
      translateFields({ ...toTranslate, _alert: ALERT_TEXT_EN }, lang),
      translateFields(UI_LABELS, lang),
    ])
      .then(([translated, translatedLabels]) => {
        const { _alert, ...rest } = translated
        setDisplayed({ ...raw, ...rest })
        setAlertText(_alert || ALERT_TEXT_EN)
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
    } catch (err) {
      setAudioError(err.message || 'Unable to generate audio alert')
    } finally {
      setAudioLoading(false)
    }
  }

  function handleCallEmergencyContact() {
    if (!displayed?.emergencyPhone) return
    window.location.href = `tel:${displayed.emergencyPhone}`
  }

  useEffect(() => {
    if (step === 'main' && alertText) handleGenerateAlert()
  }, [step])

  useEffect(() => {
    if (alertAudioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [alertAudioUrl])

  if (step === 'language') {
    return (
      <LanguageGate
        lang={lang}
        setLang={setLang}
        languages={languages}
        labels={labels}
        onContinue={() => setStep('auth')}
      />
    )
  }

  if (step === 'auth') {
    return <AuthGate onAuthorized={() => setStep('main')} labels={labels} />
  }

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

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">
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
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{labels.voiceAlertLabel}</p>
              <p className="text-sm text-gray-700">{labels.voiceAlertDesc}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] shrink-0">
              {labels.mobileReady}
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
              {audioLoading ? labels.generatingBtn : labels.generateBtn}
            </button>
            <button
              onClick={handleCallEmergencyContact}
              disabled={!displayed.emergencyPhone}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {displayed.emergencyPhone ? labels.callContactBtn : labels.noPhoneBtn}
            </button>
          </div>
          {audioError && <p className="text-red-500 text-sm">{audioError}</p>}
          {alertAudioUrl && (
            <audio ref={audioRef} controls src={alertAudioUrl} className="w-full mt-3 rounded-xl" />
          )}
        </div>

        {displayed.allergies && (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">⚠ {labels.allergies}</p>
            <p className="text-base font-semibold text-red-800">{displayed.allergies}</p>
          </div>
        )}

        {translating && (
          <p className="text-xs text-center text-gray-400 animate-pulse">Translating…</p>
        )}

        {displayed.conditions && (
          <InfoCard label={labels.conditions} value={displayed.conditions} />
        )}

        {displayed.medications && (
          <InfoCard label={labels.medications} value={displayed.medications} />
        )}

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
