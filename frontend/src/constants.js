const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const API_URL = apiUrl.replace(/\/$/, '')
export const SESSION_DURATION_MS = 15 * 60 * 1000
export const SESSION_KEY = 'clinic-session'
