import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
// TODO Hour 4: import html2canvas and implement PNG export

export default function WallpaperCard({ form, qrValue }) {
  const cardRef = useRef(null)

  async function handleDownload() {
    // TODO Hour 4: use html2canvas to export cardRef as PNG
    alert('Image export coming in Hour 4!')
  }

  return (
    <div className="space-y-3">
      {/* Preview card — styled at phone lock-screen aspect ratio (9:19.5) */}
      <div
        ref={cardRef}
        className="mx-auto bg-black text-white rounded-xl overflow-hidden"
        style={{ width: 180, height: 390 }}
      >
        <div className="flex flex-col items-center justify-between h-full p-4">
          <div className="text-center space-y-1 mt-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Medical Info</p>
            <p className="text-sm font-semibold">{form.name || 'Your Name'}</p>
            {form.bloodType && <p className="text-xs text-gray-300">Blood: {form.bloodType}</p>}
            {form.allergies && <p className="text-xs text-red-300">⚠ {form.allergies}</p>}
            {form.conditions && <p className="text-xs text-gray-300">{form.conditions}</p>}
          </div>

          <div className="flex flex-col items-center gap-2 mb-4">
            <QRCodeSVG value={qrValue} size={90} bgColor="#000000" fgColor="#ffffff" />
            <p className="text-[9px] text-gray-400 text-center">Scan for full info in your language</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        Download Wallpaper
      </button>
    </div>
  )
}
