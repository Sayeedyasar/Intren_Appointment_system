import { useEffect, useState } from 'react'
import './App.css'
import AuthScreen from './components/AuthScreen'
import AppointmentDashboard from './components/AppointmentDashboard'
import { API_URL, SESSION_DURATION_MS } from './constants'
import {
  clearSession,
  getSessionExpiry,
  getStoredUsers,
  loadSession,
  saveSession,
} from './utils/auth'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  appointment_date: '',
  reason: '',
}

function App() {
  const initialPage = window.location.hash === '#list' ? 'list' : 'form'
  const [view, setView] = useState(initialPage)
  const [formData, setFormData] = useState(emptyForm)
  const [appointments, setAppointments] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginRole, setLoginRole] = useState('user')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' })
  const [userDisplayName, setUserDisplayName] = useState('')
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS)
  const [activityLog, setActivityLog] = useState([])
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  const recordActivity = (title, description) => {
    setActivityLog((current) => [{
      id: Date.now() + Math.random(),
      title,
      description,
      createdAt: new Date().toISOString(),
    }, ...current].slice(0, 8))
  }

  const getApiErrorMessage = (error, fallback = 'Something went wrong.') => {
    if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
      return 'Unable to connect to the server. Please make sure the backend is running.'
    }

    return error?.message || fallback
  }

  useEffect(() => {
    const session = loadSession()

    if (!session) {
      setIsLoggedIn(false)
      return
    }

    const role = session.role || 'user'
    const validSession = role === 'admin'
      ? !!session.expiresAt
      : !!session.expiresAt && Date.now() < session.expiresAt

    if (!validSession) {
      clearSession()
      setIsLoggedIn(false)
      setTimeLeft(SESSION_DURATION_MS)
      return
    }

    setLoginRole(role)
    setIsLoggedIn(true)
    setUserDisplayName(role === 'admin' ? 'Admin' : session.email?.split('@')[0] || 'Patient')
    setTimeLeft(role === 'admin' ? 0 : Math.max(session.expiresAt - Date.now(), 0))
  }, [])

  useEffect(() => {
    window.location.hash = view === 'list' ? '#list' : '#entry'
  }, [view])

  useEffect(() => {
    if (!isLoggedIn) return undefined

    const updateTimer = () => {
      const session = loadSession()

      if (!session) {
        setIsLoggedIn(false)
        setUserDisplayName('')
        setTimeLeft(SESSION_DURATION_MS)
        setMessage('Your session has expired. Please log in again.')
        return
      }

      if (session.role === 'admin') {
        setTimeLeft(0)
        return
      }

      const remaining = Math.max(session.expiresAt - Date.now(), 0)
      setTimeLeft(remaining)

      if (!session.expiresAt || Date.now() >= session.expiresAt) {
        clearSession()
        setIsLoggedIn(false)
        setUserDisplayName('')
        setTimeLeft(SESSION_DURATION_MS)
        setMessage('Your session has expired. Please log in again.')
      }
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [isLoggedIn])

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_URL}/appointments`)
      if (!response.ok) {
        throw new Error('Failed to load appointments')
      }
      const data = await response.json()
      setAppointments(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppointments()
    }
  }, [isLoggedIn])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const enteredEmail = loginForm.email.trim().toLowerCase()
    const enteredPassword = loginForm.password.trim()

    if (!enteredEmail || !enteredPassword) {
      setError('Please enter your email and password.')
      return
    }

    try {
      if (loginRole === 'admin') {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: enteredEmail, password: enteredPassword }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Invalid admin login details.')
        }

        const user = await response.json()

        if (user.role !== 'admin') {
          throw new Error('Invalid admin login details.')
        }

        saveSession({
          email: enteredEmail,
          role: 'admin',
          expiresAt: getSessionExpiry('admin'),
          token: `clinic-token-${Date.now()}`,
        })

        setUserDisplayName('Admin')
        setIsLoggedIn(true)
        setTimeLeft(0)
        setActivityLog([])
        setMessage('Welcome, Admin! Your admin session is active without a time limit.')
        return
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredEmail, password: enteredPassword }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Invalid user login details.')
      }

      const user = await response.json()

      saveSession({
        email: enteredEmail,
        role: user.role || 'user',
        expiresAt: getSessionExpiry('user'),
        token: `clinic-token-${Date.now()}`,
      })

      setUserDisplayName(user.name?.split(' ')[0] || enteredEmail.split('@')[0])
      setIsLoggedIn(true)
      setTimeLeft(SESSION_DURATION_MS)
      setActivityLog([])
      setMessage('Welcome back! Your session is active for 15 minutes.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Please try again.'))
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const name = signupForm.name.trim()
    const enteredEmail = signupForm.email.trim().toLowerCase()
    const enteredPassword = signupForm.password.trim()

    if (!name || !enteredEmail || !enteredPassword) {
      setError('Please complete all sign-up fields.')
      return
    }

    if (enteredPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: enteredEmail,
          password: enteredPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Sign-up failed.')
      }

      const user = await response.json()

      saveSession({
        email: enteredEmail,
        role: user.role || 'user',
        expiresAt: getSessionExpiry('user'),
        token: `clinic-token-${Date.now()}`,
      })

      setLoginRole('user')
      setAuthMode('login')
      setUserDisplayName(user.name?.split(' ')[0] || name.split(' ')[0])
      setIsLoggedIn(true)
      setTimeLeft(SESSION_DURATION_MS)
      setSignupForm({ name: '', email: '', password: '' })
      setLoginForm({ email: enteredEmail, password: enteredPassword })
      setActivityLog([])
      setMessage('Your account has been created successfully and you are logged in.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign-up failed. Please try again.'))
    }
  }

  const handleLogout = () => {
    clearSession()
    setIsLoggedIn(false)
    setUserDisplayName('')
    setTimeLeft(SESSION_DURATION_MS)
    setLoginForm({ email: '', password: '' })
    setError('')
    setMessage('You have been logged out.')
  }

  const validateForm = (data) => {
    if (!data.name.trim()) return 'Name is required.'
    if (!data.email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Please enter a valid email address.'
    }
    if (!data.phone.trim()) return 'Phone is required.'
    if (!data.appointment_date) return 'Appointment date is required.'
    if (!data.reason.trim()) return 'Reason is required.'
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const validationError = validateForm(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const requestOptions = {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }

      const response = await fetch(
        editingId ? `${API_URL}/appointments/${editingId}` : `${API_URL}/appointments`,
        requestOptions,
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Request failed')
      }

      recordActivity(
        editingId ? 'Appointment updated' : 'Appointment booked',
        `${formData.name} scheduled for ${formData.appointment_date}`,
      )
      setMessage(editingId ? 'Appointment updated successfully.' : 'Appointment saved successfully.')
      setFormData(emptyForm)
      setEditingId(null)
      setView('list')
      await fetchAppointments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Request failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (appointment) => {
    setFormData({
      name: appointment.name,
      email: appointment.email,
      phone: appointment.phone,
      appointment_date: appointment.appointment_date,
      reason: appointment.reason,
    })
    setEditingId(appointment.id)
    setView('form')
    setError('')
    setMessage('')
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this appointment?')
    if (!confirmed) return

    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete appointment')
      }

      const deletedAppointment = appointments.find((item) => item.id === id)
      recordActivity(
        'Appointment deleted',
        deletedAppointment ? `${deletedAppointment.name} was removed from the schedule.` : 'An appointment was removed.',
      )
      setMessage('Appointment deleted.')
      await fetchAppointments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete appointment.'))
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedAppointment = appointments.find((item) => item.id === id)
      recordActivity(
        'Status updated',
        `${updatedAppointment?.name || 'Appointment'} marked as ${status}.`,
      )
      await fetchAppointments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update status.'))
    }
  }

  const handleReschedule = async (id) => {
    if (!rescheduleDate) {
      setError('Please select a new appointment date before rescheduling.')
      return
    }

    try {
      const appointmentToUpdate = appointments.find((item) => item.id === id)
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appointmentToUpdate,
          appointment_date: rescheduleDate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reschedule appointment')
      }

      recordActivity(
        'Appointment rescheduled',
        `${appointmentToUpdate?.name || 'Appointment'} moved to ${rescheduleDate}.`,
      )
      setRescheduleId(null)
      setRescheduleDate('')
      setMessage('Appointment rescheduled successfully.')
      await fetchAppointments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to reschedule appointment.'))
    }
  }

  if (!isLoggedIn) {
    return (
      <AuthScreen
        loginRole={loginRole}
        setLoginRole={setLoginRole}
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        error={error}
        message={message}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    )
  }

  return (
    <AppointmentDashboard
      loginRole={loginRole}
      userDisplayName={userDisplayName}
      timeLeft={timeLeft}
      error={error}
      message={message}
      view={view}
      setView={setView}
      appointments={appointments}
      activityLog={activityLog}
      formData={formData}
      setFormData={setFormData}
      editingId={editingId}
      setEditingId={setEditingId}
      handleSubmit={handleSubmit}
      handleEdit={handleEdit}
      handleDelete={handleDelete}
      handleStatusChange={handleStatusChange}
      handleLogout={handleLogout}
      rescheduleId={rescheduleId}
      setRescheduleId={setRescheduleId}
      rescheduleDate={rescheduleDate}
      setRescheduleDate={setRescheduleDate}
      handleReschedule={handleReschedule}
      loading={loading}
    />
  )
}

export default App
