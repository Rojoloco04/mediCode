export async function generateAlertAudio(text, voiceId) {
  if (!text) {
    throw new Error('Alert text is required')
  }

  const res = await fetch('/api/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Could not generate alert audio')
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
