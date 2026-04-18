import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'

// Preview dimensions — exported at 6x = 1080x2340 (full phone resolution)
const W = 180
const H = 390

export default function WallpaperCard({ form, qrValue }) {
  const cardRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  async function handleDownload() {
    setExporting(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 6,
        backgroundColor: null,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = 'qraid-wallpaper.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 text-center">Lock screen wallpaper preview</p>

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
          {/* Top: identity + critical info */}
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <p style={{ fontSize: 7, fontWeight: 700, color: '#f87171', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              ⚕ Medical Info
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
              {form.name || 'Your Name'}
            </p>
            {form.bloodType && (
              <p style={{ fontSize: 10, color: '#fca5a5', marginBottom: 2 }}>
                Blood Type: {form.bloodType}
              </p>
            )}
            {form.allergies && (
              <p style={{ fontSize: 9, color: '#fca5a5', background: 'rgba(239,68,68,0.15)', borderRadius: 4, padding: '2px 6px', marginBottom: 2 }}>
                ⚠ {form.allergies}
              </p>
            )}
            {form.conditions && (
              <p style={{ fontSize: 9, color: '#d1d5db', marginBottom: 2 }}>{form.conditions}</p>
            )}
            {form.medications && (
              <p style={{ fontSize: 9, color: '#9ca3af' }}>{form.medications}</p>
            )}
          </div>

          {/* Bottom: QR + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            {form.emergencyContact && (
              <p style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
                Emergency: {form.emergencyContact}{form.emergencyPhone ? ` · ${form.emergencyPhone}` : ''}
              </p>
            )}
            <div style={{ background: '#ffffff', padding: 4, borderRadius: 6 }}>
              <QRCodeCanvas value={qrValue} size={72} />
            </div>
            <p style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>
              Scan for full info in your language
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={exporting}
        className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        {exporting ? 'Exporting…' : 'Download Wallpaper (1080×2340)'}
      </button>
    </div>
  )
}
