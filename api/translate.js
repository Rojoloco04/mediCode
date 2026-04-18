export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text, target } = req.body
  if (!text || !target) return res.status(400).json({ error: 'Missing text or target' })

  const apiRes = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'en', target, format: 'text' }),
    }
  )

  if (!apiRes.ok) return res.status(502).json({ error: 'Translation API error' })

  const json = await apiRes.json()
  const translated = json.data?.translations?.[0]?.translatedText

  if (!translated) return res.status(502).json({ error: 'Invalid translation response' })

  res.status(200).json({ translated })
}
