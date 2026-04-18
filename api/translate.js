export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { texts, target } = req.body
  if (!Array.isArray(texts) || !texts.length || !target) {
    return res.status(400).json({ error: 'Missing texts or target' })
  }

  const apiRes = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'en', target, format: 'text' }),
    }
  )

  if (!apiRes.ok) return res.status(502).json({ error: 'Translation API error' })

  const json = await apiRes.json()
  const translations = json.data?.translations

  if (!Array.isArray(translations)) return res.status(502).json({ error: 'Invalid translation response' })

  res.status(200).json({ translations: translations.map((t) => t.translatedText) })
}
