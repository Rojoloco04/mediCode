import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import WallpaperCard from './WallpaperCard'
import { translateFields } from '../lib/translate'

const QR_LABELS = {
  profileSaved: 'Profile saved for',
  shareQR: 'Share this QR code with family or print it',
  wallpaper: 'Wallpaper',
  lockScreenHint: 'Set this as your lock screen — first responders can scan it anywhere.',
  editInfo: '← Edit info',
}

export default function QRDisplay({ uuid, form, lang = 'en', languages = [], onLangChange, onBack }) {
  const url = `${window.location.origin}/${uuid}`
  const [labels, setLabels] = useState(QR_LABELS)

  useEffect(() => {
    if (lang === 'en') { setLabels(QR_LABELS); return }
    translateFields(QR_LABELS, lang)
      .then(setLabels)
      .catch(() => {})
  }, [lang])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-8 py-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl">⚕</span>
              <h1 className="text-2xl font-bold text-white">mediCode</h1>
            </div>
            {languages.length > 0 && onLangChange && (
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value)}
                className="text-sm bg-red-700 text-white border border-red-500 rounded-lg px-2 py-1 focus:outline-none"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            )}
          </div>
          <p className="text-red-100 text-sm">{labels.profileSaved} {form.name}.</p>
        </div>

        <div className="px-8 py-6 space-y-8">
          {/* QR section */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm">
              <QRCodeSVG value={url} size={180} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700">{labels.shareQR}</p>
              <p className="text-xs text-gray-400 break-all">{url}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <p className="text-xs text-gray-400 uppercase tracking-widest">{labels.wallpaper}</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Wallpaper section */}
          <div>
            <p className="text-sm text-gray-500 text-center mb-4">{labels.lockScreenHint}</p>
            <WallpaperCard form={form} qrValue={url} />
          </div>

          <button onClick={onBack} className="w-full text-sm text-gray-400 hover:text-red-600 transition-colors py-1">
            {labels.editInfo}
          </button>
        </div>
      </div>
    </div>
  )
}
