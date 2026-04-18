export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text to speak' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ElevenLabs API key' })
  }

  const voice = process.env.ELEVENLABS_VOICE_ID || 'alloy'

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.75,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    return res.status(response.status).json({ error: 'ElevenLabs request failed', detail: errorBody })
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).end(buffer)
}
