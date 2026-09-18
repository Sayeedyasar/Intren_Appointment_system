import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000'

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

  useEffect(() => {
    window.location.hash = view === 'list' ? '#list' : '#entry'
  }, [view])

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
    fetchAppointments()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
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

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingId(null)
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

      const url = editingId ? `${API_URL}/appointments/${editingId}` : `${API_URL}/appointments`
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Request failed')
      }

      setMessage(editingId ? 'Appointment updated successfully.' : 'Appointment saved successfully.')
      resetForm()
      setView('list')
      await fetchAppointments()
    } catch (err) {
      setError(err.message)
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

      setMessage('Appointment deleted.')
      await fetchAppointments()
    } catch (err) {
      setError(err.message)
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

      await fetchAppointments()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Appointment System</p>
          <h1>Clinic Scheduler</h1>
        </div>

        <nav className="nav-buttons">
          <button
            type="button"
            className={view === 'form' ? 'active' : ''}
            onClick={() => setView('form')}
          >
            Appointment Entry
          </button>
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            Appointment List
          </button>
        </nav>
      </header>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      {view === 'form' ? (
        <section className="card form-card">
          <h2>{editingId ? 'Edit Appointment' : 'Add Appointment'}</h2>

          <form onSubmit={handleSubmit} className="appointment-form">
            <div className="form-grid">
              <label>
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                />
              </label>

              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                />
              </label>

              <label>
                <span>Appointment Date</span>
                <input
                  type="date"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleChange}
                />
              </label>

              <label className="full-width">
                <span>Reason</span>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Why is the appointment needed?"
                  rows="4"
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Appointment' : 'Save Appointment'}
              </button>

              {editingId && (
                <button type="button" className="secondary-button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section className="card list-card">
          <div className="section-header">
            <h2>Appointments</h2>
            <button type="button" className="primary-button" onClick={() => setView('form')}>
              New Appointment
            </button>
          </div>

          {appointments.length === 0 ? (
            <p className="empty-state">No appointments found.</p>
          ) : (
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <div className="appointment-item" key={appointment.id}>
                  <div className="appointment-main">
                    <h3>{appointment.name}</h3>
                    <p>{appointment.email}</p>
                    <p>{appointment.phone}</p>
                    <p>
                      <strong>Date:</strong> {appointment.appointment_date}
                    </p>
                    <p>
                      <strong>Reason:</strong> {appointment.reason}
                    </p>
                  </div>

                  <div className="appointment-actions">
                    <label>
                      <span>Status</span>
                      <select
                        value={appointment.status}
                        onChange={(event) => handleStatusChange(appointment.id, event.target.value)}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                      </select>
                    </label>

                    <div className="button-row">
                      <button type="button" className="secondary-button" onClick={() => handleEdit(appointment)}>
                        Edit
                      </button>
                      <button type="button" className="danger-button" onClick={() => handleDelete(appointment.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
