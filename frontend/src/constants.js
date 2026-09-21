const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const API_URL = apiUrl.replace(/\/$/, '')
export const SESSION_DURATION_MS = 15 * 60 * 1000
export const SESSION_KEY = 'clinic-session'
export const USERS_KEY = 'clinic-users'

export const loginDefaults = {
  user: {
    email: 'user@clinic.com',
    password: 'clinic123',
  },
  admin: {
    email: 'admin@clinic.com',
    password: 'admin123',
  },
}
