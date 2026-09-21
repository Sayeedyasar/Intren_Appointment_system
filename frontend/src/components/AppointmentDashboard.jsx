function AppointmentDashboard({
  loginRole,
  userDisplayName,
  timeLeft,
  error,
  message,
  view,
  setView,
  appointments,
  activityLog,
  formData,
  setFormData,
  editingId,
  setEditingId,
  handleSubmit,
  handleEdit,
  handleDelete,
  handleStatusChange,
  handleLogout,
  rescheduleId,
  setRescheduleId,
  rescheduleDate,
  setRescheduleDate,
  handleReschedule,
  loading,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      appointment_date: '',
      reason: '',
    })
    setEditingId(null)
  }

  const statusClassName = (status) => {
    if (status === 'CONFIRMED') return 'status-pill confirmed'
    return 'status-pill pending'
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{loginRole === 'admin' ? 'Admin Dashboard' : 'Patient Portal'}</p>
          <h1>{loginRole === 'admin' ? 'Clinic Administration' : 'Clinic Scheduler'}</h1>
        </div>

        <div className="nav-group">
          <div className="user-badge">Hi, {userDisplayName || (loginRole === 'admin' ? 'Admin' : 'Patient')}</div>
          {loginRole !== 'admin' && (
            <div className="timer-badge">
              Session: {Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}
            </div>
          )}
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
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
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

          {loginRole === 'admin' && (
            <div className="activity-panel">
              <h3>User activity</h3>
              {activityLog.length === 0 ? (
                <p className="empty-state">No recent activity yet.</p>
              ) : (
                <ul className="activity-list">
                  {activityLog.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
                    <p>
                      <strong>Created:</strong>{' '}
                      {appointment.created_at ? new Date(appointment.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>

                  <div className="appointment-actions">
                    {loginRole === 'admin' ? (
                      <>
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
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setRescheduleId(appointment.id)
                              setRescheduleDate(appointment.appointment_date)
                            }}
                          >
                            Reschedule
                          </button>
                          <button type="button" className="danger-button" onClick={() => handleDelete(appointment.id)}>
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="status-panel" aria-live="polite">
                        <span className="status-label">Status</span>
                        <span className={statusClassName(appointment.status)}>{appointment.status}</span>
                      </div>
                    )}

                    {loginRole === 'admin' && rescheduleId === appointment.id && (
                      <div className="reschedule-box">
                        <label>
                          <span>New Date</span>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(event) => setRescheduleDate(event.target.value)}
                          />
                        </label>
                        <div className="button-row">
                          <button type="button" className="primary-button" onClick={() => handleReschedule(appointment.id)}>
                            Save
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setRescheduleId(null)
                              setRescheduleDate('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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

export default AppointmentDashboard
