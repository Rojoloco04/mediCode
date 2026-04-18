function validateTranslation(translated) {
  if (!translated || typeof translated !== 'string') return false
  if (translated.trim() === '') return false
  if (translated.startsWith('{') && translated.includes('error')) return false
  return true
}

export async function fetchLanguages() {
  const res = await fetch('/api/languages')
  if (!res.ok) throw new Error(`Failed to fetch languages: ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json.languages)) throw new Error('Unexpected languages response shape')
  return json.languages.map((l) => {
    let label = l.name
    try {
      const dn = new Intl.DisplayNames([l.language], { type: 'language' })
      const native = dn.of(l.language)
      if (native && native.toLowerCase() !== l.language.toLowerCase()) label = native
    } catch {}
    return { code: l.language, label }
  })
}

export async function translateFields(fields, targetLang) {
  if (targetLang === 'en') return fields
  const entries = Object.entries(fields).filter(([, v]) => v)
  if (!entries.length) return fields

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: entries.map(([, v]) => v), target: targetLang }),
  })
  if (!res.ok) {
    console.warn(`Translation request failed (${res.status}) for lang=${targetLang}`)
    return fields
  }
  const json = await res.json()
  if (!Array.isArray(json.translations)) {
    console.warn('Translation output failed validation, using original')
    return fields
  }
  const translated = entries.map(([key], i) => [key, validateTranslation(json.translations[i]) ? json.translations[i] : fields[key]])
  return { ...fields, ...Object.fromEntries(translated) }
}
