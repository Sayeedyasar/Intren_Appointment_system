import { USERS_KEY, SESSION_KEY } from '../constants'

export const getDefaultUsers = () => [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@clinic.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 2,
    name: 'Demo User',
    email: 'user@clinic.com',
    password: 'clinic123',
    role: 'user',
  },
]

export const getStoredUsers = () => {
  try {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || 'null')
    if (Array.isArray(storedUsers) && storedUsers.length > 0) {
      return storedUsers
    }
  } catch (error) {
    console.warn('Could not load saved users:', error)
  }

  const defaultUsers = getDefaultUsers()
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers))
  return defaultUsers
}

export const getSessionExpiry = (role) => {
  if (role === 'admin') {
    return Number.MAX_SAFE_INTEGER
  }

  return Date.now() + 15 * 60 * 1000
}

export const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
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
