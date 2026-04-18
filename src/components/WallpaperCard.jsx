import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { useTranslatedLabels } from '../lib/translate'
import { Btn, DownloadIcon } from './ui'

const W = 220
const H = 476

const WALLPAPER_LABELS = {
  scanHint: 'Scan for full profile in your language',
  preview: 'Lock screen wallpaper preview',
  exporting: 'Exporting…',
  download: 'Download PNG',
  badgeTitle: 'Medical',
  namePlaceholder: 'Your name',
  blood: 'Blood',
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Meds',
  emergency: 'Emergency',
  tipHeading: 'Tip',
  tipBody: "Set this as your lock screen, not home screen — so it's visible without unlocking.",
}

function buildOfflineQrValue(url, form, labels) {
  const lines = [url, '']
  if (form.bloodType) lines.push(`${labels.blood}: ${form.bloodType}`)
  if (form.allergies) lines.push(`${labels.allergies}: ${form.allergies}`)
  if (form.conditions) lines.push(`${labels.conditions}: ${form.conditions}`)
  if (form.medications) lines.push(`${labels.medications}: ${form.medications}`)
  const contact = [form.emergencyContact, form.emergencyPhone].filter(Boolean).join(' ')
  if (contact) lines.push(`${labels.emergency}: ${contact}`)
  return lines.join('\n')
}

export default function WallpaperCard({ form, qrValue, lang = 'en' }) {
  const cardRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const labels = useTranslatedLabels(WALLPAPER_LABELS, lang)
  const offlineQrValue = buildOfflineQrValue(qrValue, form, labels)

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  async function handleDownload() {
    setExporting(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 6,
        backgroundColor: null,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = 'medicode-wallpaper.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{
        fontSize: 11, color: 'var(--ink-4)', textAlign: 'center',
        fontFamily: 'var(--mono)', letterSpacing: '0.04em', margin: 0,
      }}>
        {labels.preview}
      </p>

      {/* Wallpaper preview */}
      <div
        ref={cardRef}
        style={{
          width: W, height: H, borderRadius: 24,
          margin: '0 auto',
          background: 'linear-gradient(180deg, oklch(22% 0.012 60) 0%, oklch(15% 0.012 60) 100%)',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
          padding: '28px 18px 24px',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter Tight', system-ui, sans-serif",
          color: 'white',
        }}
      >
        {/* Mock clock */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.95)' }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', opacity: 0.65,
          }}>
            {dateStr}
          </div>
          <div style={{
            fontSize: 64, fontWeight: 200,
            letterSpacing: '-0.04em', lineHeight: 1, marginTop: 2,
          }}>
            9:41
          </div>
        </div>

        {/* Medical badge */}
        <div style={{
          marginTop: 'auto',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: 14,
        }}>
          {/* Badge header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'oklch(60% 0.175 25)', marginBottom: 10,
          }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
              <path d="M8 2h4v6h6v4h-6v6H8v-6H2V8h6V2z" fill="oklch(60% 0.175 25)" />
            </svg>
            {labels.badgeTitle}
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {form.name || labels.namePlaceholder}
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{
                fontSize: 8, opacity: 0.55, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 2,
              }}>
                {labels.blood}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 14, fontWeight: 500,
              }}>
                {form.bloodType || '—'}
              </div>
            </div>
            {form.allergies && (
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 8, opacity: 0.55, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'oklch(78% 0.13 25)', marginBottom: 2,
                }}>
                  {labels.allergies}
                </div>
                <div style={{ fontSize: 11, color: 'oklch(85% 0.08 25)', lineHeight: 1.3 }}>
                  {form.allergies}
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              background: 'white', padding: 3, borderRadius: 4, flexShrink: 0,
            }}>
              <QRCodeCanvas value={offlineQrValue} size={54} />
            </div>
            <div style={{ fontSize: 9, opacity: 0.65, lineHeight: 1.4 }}>
              {labels.scanHint}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn variant="ghost" size="sm" disabled>Layout</Btn>
        <Btn
          size="sm"
          icon={<DownloadIcon size={14} />}
          onClick={handleDownload}
          disabled={exporting}
        >
          {exporting ? labels.exporting : labels.download}
        </Btn>
      </div>

      <div style={{
        background: 'var(--paper-2)', border: '1px solid var(--line-2)',
        borderRadius: 12, padding: 14,
      }}>
        <div style={{
          fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          {labels.tipHeading}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          {labels.tipBody}
        </p>
      </div>
    </div>
  )
}
