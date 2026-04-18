import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { translateFields, fetchLanguages, getLocationLanguage, useTranslatedLabels } from '../lib/translate'
import { generateAlertAudio } from '../lib/elevenlabs'
import {
  BrandMark, Chip, Btn, LangPill, LanguageGate,
  CheckIcon, AlertIcon, PhoneIcon,
  ArrowRightIcon, ArrowLeftIcon, PlayIcon, PauseIcon,
} from './ui'

const TRANSLATABLE = ['allergies', 'conditions', 'medications']
const ALERT_TEXT_EN = 'This person has been involved in a medical emergency.'

const UI_LABELS = {
  patient: 'Patient',
  bloodType: 'Blood type',
  bloodUnknown: 'Blood unknown',
  allergies: 'Allergies',
  voiceAlert: 'Voice alert',
  conditions: 'Conditions',
  medications: 'Medications',
  emergencyContact: 'Emergency contact',
  profileNotFound: 'Profile not found',
  exit: 'Exit',
  updatedJustNow: 'Updated just now',
  updatedMinutesAgo: 'Updated {n}m ago',
  updatedHoursAgo: 'Updated {n}h ago',
  updatedDaysAgo: 'Updated {n}d ago',
}

function relativeTime(iso, labels) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const L = labels ?? {}
  if (diff < 60) return L.updatedJustNow ?? 'Updated just now'
  if (diff < 3600) return (L.updatedMinutesAgo ?? 'Updated {n}m ago').replace('{n}', Math.floor(diff / 60))
  if (diff < 86400) return (L.updatedHoursAgo ?? 'Updated {n}h ago').replace('{n}', Math.floor(diff / 3600))
  return (L.updatedDaysAgo ?? 'Updated {n}d ago').replace('{n}', Math.floor(diff / 86400))
}


function WaveForm({ playing, progress }) {
  const bars = 32
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const base = Math.abs(Math.sin(i * 0.7) * 0.7 + Math.cos(i * 0.3) * 0.3)
        const h = Math.max(4, base * 20)
        return (
          <div key={i} style={{
            flex: 1, minWidth: 1.5, height: h,
            background: playing && i < progress * bars ? 'var(--accent)' : 'var(--ink-4)',
            borderRadius: 1, transition: 'background 0.3s',
          }} />
        )
      })}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line-2)',
      borderRadius: 14, padding: '12px 16px',
    }}>
      <div style={{
        fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-3)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.45 }}>
        {value}
      </div>
    </div>
  )
}

export default function InfoPage() {
  const { uuid } = useParams()
  const [step, setStep] = useState('language')
  const [lang, setLang] = useState(() => {
    if (typeof navigator === 'undefined') return 'en'
    return navigator.language?.split('-')[0]?.toLowerCase() || 'en'
  })
  const [geoAutoDetected, setGeoAutoDetected] = useState(false)
  const [languages, setLanguages] = useState([{ code: 'en', label: 'English' }])
  const [raw, setRaw] = useState(null)
  const [displayed, setDisplayed] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alertText, setAlertText] = useState(ALERT_TEXT_EN)
  const [alertAudioUrl, setAlertAudioUrl] = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [alertPlaying, setAlertPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const audioRef = useRef(null)
  const uiLabels = useTranslatedLabels(UI_LABELS, lang)

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

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uuid).single()
      if (!error && data) {
        const profile = {
          name: data.name, bloodType: data.blood_type,
          allergies: data.allergies, conditions: data.conditions,
          medications: data.medications, emergencyContact: data.emergency_contact,
          emergencyPhone: data.emergency_phone, updatedAt: data.updated_at || null,
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
    if (lang === 'en') { setDisplayed(raw); setAlertText(ALERT_TEXT_EN); return }
    setTranslating(true)
    const toTranslate = Object.fromEntries(TRANSLATABLE.filter(k => raw[k]).map(k => [k, raw[k]]))
    translateFields({ ...toTranslate, _alert: ALERT_TEXT_EN }, lang)
      .then(translated => {
        const { _alert, ...rest } = translated
        setDisplayed({ ...raw, ...rest })
        setAlertText(_alert || ALERT_TEXT_EN)
      })
      .finally(() => setTranslating(false))
  }, [lang, raw])

  async function handleGenerateAlert() {
    if (!alertText) return
    setAudioError(null)
    setAudioLoading(true)
    setAlertAudioUrl(null)
    setAlertPlaying(false)
    try {
      const audioUrl = await generateAlertAudio(alertText)
      setAlertAudioUrl(audioUrl)
    } catch (err) {
      setAudioError(err.message || 'Unable to generate audio alert')
    } finally {
      setAudioLoading(false)
    }
  }

  useEffect(() => {
    if (step === 'main' && alertText && !translating) handleGenerateAlert()
  }, [step, alertText, translating])

  useEffect(() => {
    if (alertAudioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {})
      setAlertPlaying(true)
    }
  }, [alertAudioUrl])

  function toggleAlert() {
    if (!audioRef.current || !alertAudioUrl) return
    if (alertPlaying) {
      audioRef.current.pause()
      setAlertPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setAlertPlaying(true)
    }
  }

  if (step === 'language') {
    return (
      <LanguageGate
        lang={lang} setLang={setLang}
        languages={languages}
        onContinue={() => setStep('main')}
        geoAutoDetected={geoAutoDetected}
        subtitle="Select the language you want to view this profile in."
      />
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 20 20" fill="none" style={{ margin: '0 auto 12px', opacity: 0.3 }}>
            <rect x="8" y="1" width="4" height="18" rx="1" fill="var(--ink)" />
            <rect x="1" y="8" width="18" height="4" rx="1" fill="var(--ink)" />
          </svg>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--mono)', letterSpacing: '0.02em' }}>
            Loading profile…
          </p>
        </div>
      </div>
    )
  }

  if (!displayed) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <p style={{
            fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em',
            color: 'var(--ink)', marginBottom: 8,
          }}>
            {uiLabels.profileNotFound}
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 24 }}>
            This QR code may be invalid or the profile has been removed.
          </p>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Btn full={false}>Create a mediCode profile</Btn>
          </Link>
        </div>
      </div>
    )
  }

  const langObj = languages.find(l => l.code === lang) || { label: 'English' }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>

      {/* Sticky header */}
      <div style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--line-2)',
        position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 10,
      }}>
        <button
          onClick={() => setStep('language')}
          style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
        >
          <ArrowLeftIcon size={12} /> {uiLabels.exit}
        </button>
        <BrandMark size={16} />
        <LangPill code={lang} label={langObj.label} onClick={() => setStep('language')} />
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Patient header — dark card */}
        <div style={{ background: 'var(--ink)', color: '#fff', borderRadius: 16, padding: '18px 18px' }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4,
          }}>
            {uiLabels.patient}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {displayed.name}
              </div>
              {displayed.updatedAt && (
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--mono)', letterSpacing: '0.02em', marginTop: 4,
                }}>
                  {relativeTime(displayed.updatedAt, uiLabels)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 4 }}>
              <div style={{
                fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
              }}>
                {uiLabels.bloodType}
              </div>
              {displayed.bloodType ? (
                <div style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}>
                  {displayed.bloodType}
                </div>
              ) : (
                <div style={{
                  padding: '6px 10px', background: 'rgba(255,255,255,0.06)',
                  borderRadius: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--mono)', letterSpacing: '0.04em',
                }}>
                  {uiLabels.bloodUnknown.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Allergies — coral */}
        {displayed.allergies && (
          <div style={{
            background: 'var(--accent-soft)',
            border: '1px solid oklch(85% 0.06 25)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: 'var(--accent-ink)', fontFamily: 'var(--mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
            }}>
              <AlertIcon size={11} /> {uiLabels.allergies}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-ink)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {displayed.allergies}
            </div>
          </div>
        )}

        {/* Voice alert */}
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
              }}>
                {uiLabels.voiceAlert} · {langObj.label}
              </div>
              <Chip tone="neutral">AI</Chip>
            </div>
            <p style={{
              margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.45,
              letterSpacing: '-0.01em', fontStyle: 'italic',
            }}>
              "{alertText}"
            </p>
          </div>
          <div style={{
            padding: '10px 14px', background: 'var(--paper-2)',
            borderTop: '1px solid var(--line-2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <button
              onClick={toggleAlert}
              style={{
                width: 36, height: 36, borderRadius: 999,
                background: alertAudioUrl ? 'var(--accent)' : 'var(--line)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: alertAudioUrl ? 'pointer' : 'default', border: 'none',
              }}
            >
              {audioLoading
                ? <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>…</span>
                : alertPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </button>
            <div style={{ flex: 1 }}>
              <WaveForm playing={alertPlaying} progress={audioProgress} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>0:04</div>
          </div>
          {audioError && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line-2)' }}>
              <button
                onClick={handleGenerateAlert}
                disabled={audioLoading}
                style={{
                  fontSize: 12, color: 'var(--accent-ink)', cursor: 'pointer',
                  fontFamily: 'var(--mono)', letterSpacing: '0.02em',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                {audioLoading ? 'Generating…' : 'Retry generation'}
              </button>
            </div>
          )}
          {alertAudioUrl && (
            <audio
              ref={audioRef}
              src={alertAudioUrl}
              onEnded={() => { setAlertPlaying(false); setAudioProgress(0) }}
              onTimeUpdate={() => {
                if (audioRef.current) setAudioProgress(audioRef.current.currentTime / (audioRef.current.duration || 1))
              }}
              style={{ display: 'none' }}
            />
          )}
        </div>

        {/* Emergency contact */}
        {displayed.emergencyPhone && (
          <a href={`tel:${displayed.emergencyPhone}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--ink)', color: '#fff',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 999,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <PhoneIcon size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
                }}>
                  {uiLabels.emergencyContact}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>
                  {displayed.emergencyContact || 'Contact'}{' '}
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 400, color: 'rgba(255,255,255,0.75)' }}>
                    · {displayed.emergencyPhone}
                  </span>
                </div>
              </div>
              <ArrowRightIcon size={16} />
            </div>
          </a>
        )}

        {displayed.conditions && <InfoRow label={uiLabels.conditions} value={displayed.conditions} />}
        {displayed.medications && <InfoRow label={uiLabels.medications} value={displayed.medications} />}

        {translating && (
          <p style={{
            fontSize: 11, textAlign: 'center', color: 'var(--ink-4)',
            fontFamily: 'var(--mono)', letterSpacing: '0.02em',
          }}>
            Translating…
          </p>
        )}

      </div>
    </div>
  )
}
