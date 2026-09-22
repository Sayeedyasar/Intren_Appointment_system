function AuthScreen({
  loginRole,
  setLoginRole,
  authMode,
  setAuthMode,
  loginForm,
  setLoginForm,
  signupForm,
  setSignupForm,
  error,
  message,
  onLogin,
  onSignup,
}) {
  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  const handleSignupChange = (event) => {
    const { name, value } = event.target
    setSignupForm((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">{loginRole === 'admin' ? 'Admin Portal' : 'User Portal'}</p>
          <h1>{loginRole === 'admin' ? 'Admin Login' : authMode === 'signup' ? 'Create Account' : 'User Login'}</h1>
          <p>
            {authMode === 'signup'
              ? 'Sign up to create a new patient account.'
              : 'Choose your role and sign in to continue.'}
          </p>
        </div>

        <div className="role-toggle" aria-label="Select login role">
          <button
            type="button"
            className={loginRole === 'user' ? 'role-button active' : 'role-button'}
            onClick={() => setLoginRole('user')}
          >
            User
          </button>
          <button
            type="button"
            className={loginRole === 'admin' ? 'role-button active' : 'role-button'}
            onClick={() => setLoginRole('admin')}
          >
            Admin
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {loginRole === 'admin' || authMode === 'login' ? (
          <form onSubmit={onLogin} className="auth-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="name@example.com"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="Enter password"
              />
            </label>

            <button type="submit" className="primary-button auth-button">
              {loginRole === 'admin' ? 'Login as Admin' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={onSignup} className="auth-form">
            <label>
              <span>Full name</span>
              <input
                type="text"
                name="name"
                value={signupForm.name}
                onChange={handleSignupChange}
                placeholder="Jane Doe"
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={signupForm.email}
                onChange={handleSignupChange}
                placeholder="jane@example.com"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={signupForm.password}
                onChange={handleSignupChange}
                placeholder="Create a password"
              />
            </label>

            <button type="submit" className="primary-button auth-button">
              Create account
            </button>
          </form>
        )}

        <div className="demo-box">
          <h3>Credentials</h3>
          <p>Use the email and password configured in your backend environment.</p>
          {loginRole === 'user' && authMode === 'signup' && (
            <p className="demo-note">Create your own account to sign in later.</p>
          )}
        </div>

        {loginRole === 'user' && (
          <div className="auth-footer">
            <div className="mode-toggle" aria-label="Select auth mode">
              <button
                type="button"
                className={authMode === 'login' ? 'mode-button active' : 'mode-button'}
                onClick={() => setAuthMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === 'signup' ? 'mode-button active' : 'mode-button'}
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthScreen
