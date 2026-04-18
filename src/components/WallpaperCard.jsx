import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { useTranslatedLabels } from '../lib/translate'

// Preview dimensions — exported at 6x = 1080x2340 (full phone resolution)
const W = 180
const H = 390

const WALLPAPER_LABELS = {
  medicalInfo: 'Medical Info',
  bloodType: 'Blood Type',
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Medications',
  emergency: 'Emergency',
  scanHint: 'Scan for full info in your language',
  preview: 'Lock screen wallpaper preview',
  exporting: 'Exporting…',
  download: 'Download Wallpaper (1080×2340)',
}

export default function WallpaperCard({ form, qrValue, lang = 'en' }) {
  const cardRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const labels = useTranslatedLabels(WALLPAPER_LABELS, lang)

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

  const labelStyle = { fontSize: 6, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 text-center">{labels.preview}</p>

      <div
        ref={cardRef}
        className="mx-auto overflow-hidden"
        style={{
          width: W,
          height: H,
          background: 'linear-gradient(160deg, #0f0f0f 0%, #1a0000 100%)',
          borderRadius: 16,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: 16 }}>
          <div style={{ textAlign: 'center', marginTop: 12, width: '100%' }}>
            <p style={{ fontSize: 7, fontWeight: 700, color: '#f87171', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              ⚕ {labels.medicalInfo}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
              {form.name || 'Your Name'}
            </p>
            {form.bloodType && (
              <div style={{ marginBottom: 4 }}>
                <p style={labelStyle}>{labels.bloodType}</p>
                <p style={{ fontSize: 10, color: '#fca5a5' }}>{form.bloodType}</p>
              </div>
            )}
            {form.allergies && (
              <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '3px 6px', marginBottom: 4 }}>
                <p style={{ ...labelStyle, color: '#f87171' }}>⚠ {labels.allergies}</p>
                <p style={{ fontSize: 9, color: '#fca5a5' }}>{form.allergies}</p>
              </div>
            )}
            {form.conditions && (
              <div style={{ marginBottom: 4 }}>
                <p style={labelStyle}>{labels.conditions}</p>
                <p style={{ fontSize: 9, color: '#d1d5db' }}>{form.conditions}</p>
              </div>
            )}
            {form.medications && (
              <div style={{ marginBottom: 2 }}>
                <p style={labelStyle}>{labels.medications}</p>
                <p style={{ fontSize: 9, color: '#9ca3af' }}>{form.medications}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            {form.emergencyContact && (
              <div style={{ textAlign: 'center' }}>
                <p style={labelStyle}>{labels.emergency}</p>
                <p style={{ fontSize: 8, color: '#6b7280' }}>
                  {form.emergencyContact}{form.emergencyPhone ? ` · ${form.emergencyPhone}` : ''}
                </p>
              </div>
            )}
            <div style={{ background: '#ffffff', padding: 4, borderRadius: 6 }}>
              <QRCodeCanvas value={qrValue} size={72} />
            </div>
            <p style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
              {labels.scanHint}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={exporting}
        className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        {exporting ? labels.exporting : labels.download}
      </button>
    </div>
  )
}
