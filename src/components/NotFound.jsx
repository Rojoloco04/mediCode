import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-xs">
        <div className="text-6xl">🔍</div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-800">Page not found</p>
          <p className="text-gray-500 text-sm">
            This QR code may be invalid, expired, or the link is broken.
          </p>
        </div>
        <Link
          to="/"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Create a mediCode profile
        </Link>
      </div>
    </div>
  )
}
