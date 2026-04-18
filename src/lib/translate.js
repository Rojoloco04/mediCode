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
  return json.languages.map((l) => ({ code: l.language, label: l.name }))
}

export async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target: targetLang }),
  })
  if (!res.ok) {
    console.warn(`Translation request failed (${res.status}) for lang=${targetLang}`)
    return text
  }
  const json = await res.json()
  if (!validateTranslation(json.translated)) {
    console.warn('Translation output failed validation, using original', { text, got: json.translated })
    return text
  }
  return json.translated
}

export async function translateFields(fields, targetLang) {
  if (targetLang === 'en') return fields
  const entries = Object.entries(fields).filter(([, v]) => v)
  const translated = await Promise.all(
    entries.map(async ([key, value]) => [key, await translateText(value, targetLang)])
  )
  return { ...fields, ...Object.fromEntries(translated) }
}
