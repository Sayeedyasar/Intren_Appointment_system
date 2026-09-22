import { SESSION_KEY } from '../constants'

export const getStoredUsers = () => []

export const getSessionExpiry = (role) => {
  if (role === 'admin') {
    return Number.MAX_SAFE_INTEGER
  }

  return Date.now() + 15 * 60 * 1000
}

export const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    email: session.email,
    role: session.role,
    expiresAt: session.expiresAt,
  }))
}

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
}

export const loadSession = () => {
  const storedSession = localStorage.getItem(SESSION_KEY)
  if (!storedSession) return null

  try {
    return JSON.parse(storedSession)
  } catch (error) {
    console.warn('Could not parse session:', error)
    clearSession()
    return null
  }
}
