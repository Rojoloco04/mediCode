import { QRCodeSVG } from 'qrcode.react'
import WallpaperCard from './WallpaperCard'

export default function QRDisplay({ uuid, form, onBack }) {
  const url = `${window.location.origin}/${uuid}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-8 py-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-2xl">⚕</span>
            <h1 className="text-2xl font-bold text-white">mediCode</h1>
          </div>
          <p className="text-red-100 text-sm">Profile saved for {form.name}.</p>
        </div>

        <div className="px-8 py-6 space-y-8">
          {/* QR section */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm">
              <QRCodeSVG value={url} size={180} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700">Share this QR code with family or print it</p>
              <p className="text-xs text-gray-400 break-all">{url}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <p className="text-xs text-gray-400 uppercase tracking-widest">Wallpaper</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Wallpaper section */}
          <div>
            <p className="text-sm text-gray-500 text-center mb-4">
              Set this as your lock screen — first responders can scan it anywhere.
            </p>
            <WallpaperCard form={form} qrValue={url} />
          </div>

          <button onClick={onBack} className="w-full text-sm text-gray-400 hover:text-red-600 transition-colors py-1">
            ← Edit info
          </button>
        </div>
      </div>
    </div>
  )
}
