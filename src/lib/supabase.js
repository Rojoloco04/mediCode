import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set them in Vercel environment variables.')
}

export const supabase = createClient(url, key)

// Maps a raw Supabase profiles row to the camelCase shape used throughout the app.
export function profileFromRow(row) {
  return {
    name: row.name,
    email: row.email,
    bloodType: row.blood_type,
    allergies: row.allergies,
    conditions: row.conditions,
    medications: row.medications,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
    updatedAt: row.updated_at || null,
  }
}
