import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import WallpaperCard from './WallpaperCard'
import { useTranslatedLabels } from '../lib/translate'
import {
  BrandMark, Chip, Btn, CheckIcon, ArrowRightIcon, ArrowLeftIcon,
  DownloadIcon, ShareIcon, LangPill, LanguageGate,
} from './ui'

const QR_LABELS = {
  edit: 'Edit',
  back: 'Back',
  saved: 'Saved',
  title: 'Your code is ready',
  desc: 'Print it, save it to your wallet, or set it as your lock screen.',
  scanned: 'Scanned by any camera.',
  wallpaperBtn: 'Create lock-screen wallpaper',
  svgBtn: 'SVG',
  shareBtn: 'Share',
  reveals: 'What the QR reveals',
  fieldName: 'Name',
  fieldBlood: 'Blood type',
  fieldAllergies: 'Allergies',
  fieldConditions: 'Conditions',
  fieldEmergency: 'Emergency',
  fieldUnknown: 'Unknown',
  wallpaperTitle: 'Lock-screen wallpaper',
  wallpaperDesc: 'Exports at 1080×2340 — fits any modern phone.',
  profileSuffix: "'s profile",
  yourProfile: 'your profile',
}

export default function QRDisplay({ uuid, form, lang = 'en', languages = [], onLangChange, onBack }) {
  const [screen, setScreen] = useState('qr')
  const labels = useTranslatedLabels(QR_LABELS, lang)
  const langObj = languages.find(l => l.code === lang) || { label: 'English' }
  const url = `${window.location.origin}/${uuid}`
  const shortUrl = `${window.location.hostname}/${uuid.slice(0, 8)}`

  if (screen === 'language') {
    return (
      <LanguageGate
        lang={lang} setLang={onLangChange}
        languages={languages}
        onContinue={() => setScreen('qr')}
      />
    )
  }

  if (screen === 'wallpaper') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--line-2)',
          }}>
            <button
              onClick={() => setScreen('qr')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}
            >
              <ArrowLeftIcon size={14} /> {labels.back}
            </button>
            <BrandMark />
            <div style={{ width: 40 }} />
          </div>

          <div style={{ padding: '24px 24px 16px' }}>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em',
              lineHeight: 1.1, color: 'var(--ink)',
            }}>
              {labels.wallpaperTitle}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              {labels.wallpaperDesc}
            </p>
          </div>

          <div style={{ padding: '0 24px 48px' }}>
            <WallpaperCard form={form} qrValue={url} lang={lang} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-2)',
        }}>
          <button
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}
          >
            <ArrowLeftIcon size={14} /> {labels.edit}
          </button>
          <BrandMark />
          <LangPill code={lang} label={langObj.label} onClick={() => setScreen('language')} />
        </div>

        <div style={{ padding: '28px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Chip tone="good"><CheckIcon size={10} /> {labels.saved}</Chip>
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em',
            lineHeight: 1.1, color: 'var(--ink)',
          }}>
            {labels.title}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            {labels.desc}
          </p>
        </div>

        {/* QR card */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            border: '1px solid var(--line)', borderRadius: 16, background: '#fff', padding: 24,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <QRCodeSVG value={url} size={180} />
            <div style={{
              marginTop: 16, padding: '6px 10px',
              background: 'var(--paper-2)', border: '1px solid var(--line-2)',
              borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)',
              letterSpacing: '-0.01em',
            }}>
              {shortUrl}
            </div>
            <p style={{
              margin: '14px 0 0', fontSize: 13, color: 'var(--ink-3)',
              textAlign: 'center', lineHeight: 1.5, maxWidth: 260,
            }}>
              {labels.scanned}{' '}
              {form.name
                ? <><strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{form.name}</strong>{labels.profileSuffix}</>
                : labels.yourProfile
              }.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          <Btn onClick={() => setScreen('wallpaper')} icon={<ArrowRightIcon size={16} />}>
            {labels.wallpaperBtn}
          </Btn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Btn
              variant="ghost" size="sm"
              icon={<DownloadIcon size={14} />}
              onClick={() => {
                const svg = document.querySelector('svg[data-qr]')
                if (!svg) return
                const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'medicode-qr.svg'
                a.click()
              }}
            >
              {labels.svgBtn}
            </Btn>
            <Btn
              variant="ghost" size="sm"
              icon={<ShareIcon size={14} />}
              onClick={() => {
                if (navigator.share) navigator.share({ url, title: 'mediCode profile' })
                else navigator.clipboard?.writeText(url)
              }}
            >
              {labels.shareBtn}
            </Btn>
          </div>
        </div>

        {/* What the QR reveals */}
        <div style={{ padding: '0 24px 48px' }}>
          <div style={{
            fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            {labels.reveals}
          </div>
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--paper-2)' }}>
            {[
              [labels.fieldName, form.name || '—'],
              [labels.fieldBlood, form.bloodType || labels.fieldUnknown],
              [labels.fieldAllergies, form.allergies || '—'],
              [labels.fieldConditions, form.conditions || '—'],
              [labels.fieldEmergency, form.emergencyContact
                ? `${form.emergencyContact}${form.emergencyPhone ? ' · ' + form.emergencyPhone : ''}`
                : '—'],
            ].map(([k, v], i, arr) => (
              <div key={k} style={{
                display: 'flex', padding: '10px 14px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line-2)' : 'none',
                fontSize: 13, gap: 12,
              }}>
                <span style={{ width: 92, color: 'var(--ink-3)', flexShrink: 0, letterSpacing: '-0.01em' }}>{k}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
