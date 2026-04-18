import { Link } from 'react-router-dom'
import { useLabels } from '../lib/LabelsContext'

export default function NotFound() {
  const { labels } = useLabels()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-xs">
        <div className="text-6xl">🔍</div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-gray-800">{labels.notfound_title}</p>
          <p className="text-gray-500 text-sm">{labels.notfound_desc}</p>
        </div>
        <Link
          to="/"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          {labels.notfound_cta}
        </Link>
      </div>
    </div>
  )
}
