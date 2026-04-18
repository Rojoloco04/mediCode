import { useState } from 'react'
import PropTypes from 'prop-types'
import { useLabels } from '../lib/LabelsContext'

// ─── Icons ────────────────────────────────────────────────
const Ico = ({ size = 20, sw = 1.5, children }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
       style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
)
Ico.propTypes = {
  size: PropTypes.number,
  sw: PropTypes.number,
  children: PropTypes.node.isRequired,
}

export const GlobeIcon = ({ size = 20 }) => (
  <Ico size={size}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M2.5 10h15M10 2.5c2.5 2.5 2.5 12.5 0 15M10 2.5c-2.5 2.5-2.5 12.5 0 15" />
  </Ico>
)
GlobeIcon.propTypes = { size: PropTypes.number }

export const CheckIcon = ({ size = 20 }) => (
  <Ico size={size} sw={1.8}><path d="M4 10l4 4 8-8" /></Ico>
)
CheckIcon.propTypes = { size: PropTypes.number }

export const ArrowRightIcon = ({ size = 16 }) => (
  <Ico size={size} sw={1.6}>
    <path d="M4 10h12M11 5l5 5-5 5" />
  </Ico>
)
ArrowRightIcon.propTypes = { size: PropTypes.number }

export const ArrowLeftIcon = ({ size = 16 }) => (
  <Ico size={size} sw={1.6}>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </Ico>
)
ArrowLeftIcon.propTypes = { size: PropTypes.number }

export const LockIcon = ({ size = 10 }) => (
  <Ico size={size}>
    <rect x="4" y="9" width="12" height="8" rx="1.5" />
    <path d="M7 9V6a3 3 0 016 0v3" />
  </Ico>
)
LockIcon.propTypes = { size: PropTypes.number }

export const PhoneIcon = ({ size = 16 }) => (
  <Ico size={size}>
    <path d="M6 2h8a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1zM9 16h2" />
  </Ico>
)
PhoneIcon.propTypes = { size: PropTypes.number }

export const AlertIcon = ({ size = 11 }) => (
  <Ico size={size}>
    <path d="M10 3L2 17h16L10 3z" />
    <path d="M10 9v4" strokeWidth={2} />
    <circle cx="10" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
  </Ico>
)
AlertIcon.propTypes = { size: PropTypes.number }

export const DownloadIcon = ({ size = 14 }) => (
  <Ico size={size} sw={1.6}>
    <path d="M10 3v9M6 8l4 4 4-4M4 17h12" />
  </Ico>
)
DownloadIcon.propTypes = { size: PropTypes.number }

export const ShareIcon = ({ size = 14 }) => (
  <Ico size={size} sw={1.6}>
    <path d="M8 5H5a1 1 0 00-1 1v9a1 1 0 001 1h10a1 1 0 001-1v-4" />
    <path d="M15 3l-5 5M15 3h-4M15 3v4" />
  </Ico>
)
ShareIcon.propTypes = { size: PropTypes.number }

export const PlayIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
    <path d="M6 4l10 6-10 6V4z" />
  </svg>
)
PlayIcon.propTypes = { size: PropTypes.number }

export const PauseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
    <rect x="5" y="4" width="3.5" height="12" rx="0.5" />
    <rect x="11.5" y="4" width="3.5" height="12" rx="0.5" />
  </svg>
)
PauseIcon.propTypes = { size: PropTypes.number }

const DotIcon = ({ size = 6, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 6 6" style={{ display: 'inline-block', flexShrink: 0 }}>
    <circle cx="3" cy="3" r="3" fill={color} />
  </svg>
)
DotIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
}

// ─── BrandMark ────────────────────────────────────────────
export const BrandMark = ({ size = 20, color = 'var(--ink)' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="8" y="1" width="4" height="18" rx="1" fill={color} />
      <rect x="1" y="8" width="18" height="4" rx="1" fill={color} />
    </svg>
    <span style={{
      fontFamily: 'var(--ui)', fontSize: Math.round(size * 0.75),
      fontWeight: 600, letterSpacing: '-0.02em', color,
    }}>
      mediCode
    </span>
  </div>
)
BrandMark.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
}

// ─── Chip ─────────────────────────────────────────────────
export const Chip = ({ children, tone = 'neutral' }) => {
  const s = {
    neutral: { bg: 'var(--paper-2)', fg: 'var(--ink-2)', br: 'var(--line)' },
    accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', br: 'oklch(88% 0.05 25)' },
    good:    { bg: 'var(--good-soft)', fg: 'var(--good)', br: 'oklch(88% 0.05 155)' },
    ink:     { bg: 'var(--ink)', fg: '#fff', br: 'var(--ink)' },
  }[tone] || { bg: 'var(--paper-2)', fg: 'var(--ink-2)', br: 'var(--line)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 999,
      background: s.bg, color: s.fg,
      fontFamily: 'var(--mono)', fontSize: 10,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      border: `1px solid ${s.br}`, fontWeight: 500,
    }}>
      {children}
    </span>
  )
}
Chip.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(['neutral', 'accent', 'good', 'ink']),
}

// ─── Btn ──────────────────────────────────────────────────
export const Btn = ({ children, variant = 'primary', full = true, disabled, onClick, icon, size = 'md', type = 'button' }) => {
  const sz = { md: { py: 13, fs: 15, gap: 8 }, sm: { py: 9, fs: 13, gap: 6 } }[size]
  const v = {
    primary: { bg: 'var(--ink)', fg: '#fff', br: 'var(--ink)', hover: 'oklch(28% 0.012 60)' },
    accent:  { bg: 'var(--accent)', fg: '#fff', br: 'var(--accent)', hover: 'oklch(55% 0.18 25)' },
    ghost:   { bg: 'transparent', fg: 'var(--ink)', br: 'var(--line)', hover: 'var(--paper-2)' },
    quiet:   { bg: 'transparent', fg: 'var(--ink-2)', br: 'transparent', hover: 'var(--paper-2)' },
  }[variant] || {}
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = v.hover)}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = v.bg)}
      style={{
        width: full ? '100%' : 'auto',
        padding: `${sz.py}px 16px`,
        background: v.bg, color: v.fg,
        border: `1px solid ${v.br}`,
        borderRadius: 12,
        fontSize: sz.fs, fontWeight: 550, letterSpacing: '-0.01em',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--ui)',
      }}
    >
      {children}{icon}
    </button>
  )
}
Btn.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'accent', 'ghost', 'quiet']),
  full: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  icon: PropTypes.node,
  size: PropTypes.oneOf(['md', 'sm']),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
}

// ─── Field ────────────────────────────────────────────────
export const Field = ({ label, name, value, onChange, placeholder, required, type = 'text', hint }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.01em' }}>
        {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{hint}</span>}
    </div>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px',
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 10, fontSize: 14, color: 'var(--ink)',
        letterSpacing: '-0.01em', transition: 'border-color 0.15s, background 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--ink)'; e.target.style.background = '#fff' }}
      onBlur={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.background = 'var(--paper)' }}
    />
  </div>
)
Field.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.string,
  hint: PropTypes.string,
}

// ─── LangPill ─────────────────────────────────────────────
export const LangPill = ({ code, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px 5px 8px',
      background: 'transparent', border: '1px solid var(--line)',
      borderRadius: 999, fontSize: 12, color: 'var(--ink-2)',
      letterSpacing: '-0.01em', cursor: 'pointer',
    }}
  >
    <GlobeIcon size={12} />
    <span>{label}</span>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 2 }}>
      {code.toUpperCase()}
    </span>
  </button>
)
LangPill.propTypes = {
  code: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
}

// ─── LanguageGate ─────────────────────────────────────────
export function LanguageGate({ onContinue, subtitle }) {
  const { lang, setLang, languages, labels, geoAutoDetected } = useLabels()
  const displaySubtitle = subtitle ?? labels.gate_subtitle
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? languages.filter(l =>
        l.label.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
      )
    : languages
  return (
  <div style={{
    minHeight: '100dvh', background: 'var(--paper)',
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center' }}>
        <BrandMark />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 48 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em',
          margin: '0 0 8px', lineHeight: 1.1, color: 'var(--ink)',
        }}>
          {labels.gate_title}
        </h1>
        <p style={{
          fontSize: 15, color: 'var(--ink-3)', margin: '0 0 16px',
          lineHeight: 1.45, maxWidth: 320,
        }}>
          {displaySubtitle}
        </p>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={labels.gate_searchPlaceholder}
          style={{
            width: '100%', padding: '9px 12px', marginBottom: 12,
            borderRadius: 10, border: '1px solid var(--line)',
            background: 'var(--paper-2)', fontSize: 14,
            color: 'var(--ink)', letterSpacing: '-0.01em',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ maxHeight: 300, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
          {filtered.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: lang === l.code ? 'var(--paper-2)' : 'transparent',
                border: '1px solid',
                borderColor: lang === l.code ? 'var(--ink)' : 'var(--line-2)',
                borderRadius: 12, marginBottom: 6,
                transition: 'all 0.15s', cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
                  minWidth: 24, textAlign: 'left',
                }}>
                  {l.code.toUpperCase()}
                </span>
                <span style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                  {l.label}
                </span>
              </span>
              {lang === l.code && <CheckIcon size={16} />}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Btn onClick={onContinue} icon={<ArrowRightIcon size={16} />}>{labels.gate_continue}</Btn>
        </div>
        {geoAutoDetected && (
          <p style={{
            fontSize: 11, color: 'var(--ink-4)', marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            fontFamily: 'var(--mono)', letterSpacing: '0.02em',
          }}>
            <DotIcon color="var(--ink-4)" size={4} /> {labels.gate_autoDetected}
          </p>
        )}
      </div>
    </div>
  </div>
  )
}
LanguageGate.propTypes = {
  onContinue: PropTypes.func.isRequired,
  subtitle: PropTypes.string,
}

// ─── SectionHeader ────────────────────────────────────────
export const SectionHeader = ({ num, title, desc }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)',
        letterSpacing: '0.08em',
      }}>
        {String(num).padStart(2, '0')}
      </span>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
        {title}
      </h3>
    </div>
    {desc && (
      <p style={{ margin: '0 0 0 24px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{desc}</p>
    )}
  </div>
)
SectionHeader.propTypes = {
  num: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  desc: PropTypes.string,
}

// ─── PageShell ────────────────────────────────────────────
export const PageShell = ({ children }) => (
  <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {children}
    </div>
  </div>
)
PageShell.propTypes = {
  children: PropTypes.node.isRequired,
}

// ─── BloodPicker ──────────────────────────────────────────
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const BloodPicker = ({ value, onChange, label = 'Blood type', optionalLabel = 'optional' }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', display: 'block', marginBottom: 8 }}>
      {label}{' '}
      <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>{optionalLabel}</span>
    </label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {BLOOD.map(b => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(value === b ? '' : b)}
          style={{
            padding: '10px 0',
            background: value === b ? 'var(--ink)' : 'var(--paper)',
            color: value === b ? '#fff' : 'var(--ink)',
            border: '1px solid',
            borderColor: value === b ? 'var(--ink)' : 'var(--line)',
            borderRadius: 10,
            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.01em', transition: 'all 0.12s', cursor: 'pointer',
          }}
        >
          {b}
        </button>
      ))}
    </div>
  </div>
)
BloodPicker.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  optionalLabel: PropTypes.string,
}
