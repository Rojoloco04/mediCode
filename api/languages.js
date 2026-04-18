export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiRes = await fetch(
    `https://translation.googleapis.com/language/translate/v2/languages?key=${process.env.GOOGLE_TRANSLATE_KEY}&target=en`
  )

  if (!apiRes.ok) return res.status(502).json({ error: 'Languages API error' })

  const json = await apiRes.json()
  const languages = json.data?.languages

  if (!Array.isArray(languages)) return res.status(502).json({ error: 'Invalid languages response' })

  console.log(`[languages] returned ${languages.length} languages`)
  res.status(200).json({ languages })
}
