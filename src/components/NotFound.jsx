import { Link } from 'react-router-dom'
import { useLabels } from '../lib/LabelsContext'
import { Btn } from './ui'

export default function NotFound() {
  const { labels } = useLabels()
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 8 }}>
          {labels.notfound_title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 24 }}>
          {labels.notfound_desc}
        </p>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Btn full={false}>{labels.notfound_cta}</Btn>
        </Link>
      </div>
    </div>
  )
}
