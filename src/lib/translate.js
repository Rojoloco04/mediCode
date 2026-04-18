
const COUNTRY_LANG = {
  us: 'en', gb: 'en', au: 'en', ca: 'en', nz: 'en', ie: 'en', za: 'en',
  fr: 'fr', be: 'fr',
  de: 'de', at: 'de', ch: 'de',
  es: 'es', mx: 'es', ar: 'es', co: 'es', pe: 'es', cl: 'es', ve: 'es',
  pt: 'pt', br: 'pt',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  ru: 'ru', by: 'ru', kz: 'ru',
  jp: 'ja',
  cn: 'zh', tw: 'zh', hk: 'zh',
  kr: 'ko',
  sa: 'ar', ae: 'ar', eg: 'ar', iq: 'ar', sy: 'ar', jo: 'ar', ma: 'ar',
  in: 'hi',
  tr: 'tr',
  se: 'sv',
  no: 'no',
  dk: 'da',
  fi: 'fi',
  gr: 'el',
  th: 'th',
  id: 'id',
  vn: 'vi',
  ua: 'uk',
  ro: 'ro',
  hu: 'hu',
  cz: 'cs',
  sk: 'sk',
  bg: 'bg',
  hr: 'hr',
  il: 'he',
}

export function getLocationLanguage() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const json = await res.json()
          const cc = json.address?.country_code?.toLowerCase()
          resolve(COUNTRY_LANG[cc] || null)
        } catch {
          resolve(null)
        }
      },
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

function validateTranslation(translated) {
  if (!translated || typeof translated !== 'string') return false
  if (translated.trim() === '') return false
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
  if (!res.ok) return fields
  const json = await res.json()
  if (!Array.isArray(json.translations)) return fields
  const translated = entries.map(([key], i) => [key, validateTranslation(json.translations[i]) ? json.translations[i] : fields[key]])
  return { ...fields, ...Object.fromEntries(translated) }
}

