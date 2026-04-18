// MyMemory free API — no key needed, 5000 chars/day per IP
export async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
  const res = await fetch(url)
  const json = await res.json()
  return json.responseData?.translatedText ?? text
}

export async function translateFields(fields, targetLang) {
  if (targetLang === 'en') return fields
  const entries = Object.entries(fields).filter(([, v]) => v)
  const translated = await Promise.all(
    entries.map(async ([key, value]) => [key, await translateText(value, targetLang)])
  )
  return { ...fields, ...Object.fromEntries(translated) }
}
