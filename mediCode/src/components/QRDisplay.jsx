import { QRCodeSVG } from 'qrcode.react'
import WallpaperCard from './WallpaperCard'

export default function QRDisplay({ uuid, form, onBack }) {
  const url = `${window.location.origin}/${uuid}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg p-8 text-center space-y-6">
        <h2 className="text-xl font-bold text-gray-800">Your QR-Aid Card</h2>

        <div className="flex justify-center">
          <QRCodeSVG value={url} size={200} />
        </div>

        <p className="text-xs text-gray-400 break-all">{url}</p>

        <WallpaperCard form={form} qrValue={url} />

        <button onClick={onBack} className="text-sm text-red-600 hover:underline">
          ← Edit info
        </button>
      </div>
    </div>
  )
}
