import { useState } from 'react'

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('demo@fraudwarning.com')
  const [password, setPassword] = useState('Demo@123')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      if (response.status === 401) {
        setErrorMessage('Invalid email or password')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setErrorMessage(
          errorData?.detail || 'Invalid email or password'
        )
        return
      }

      const data = await response.json()
      if (data.access_token && data.user) {
        onLoginSuccess(data.access_token, data.user)
      } else {
        setErrorMessage('Authentication succeeded but received malformed token.')
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to connect to authentication server.'
      )
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('demo@fraudwarning.com')
    setPassword('Demo@123')
    setErrorMessage('')
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <header className="header">
          <h1>Fraud Warning System</h1>
          <p className="subtitle">
            AI-Based Multi-Layer Fraud Early Warning System
          </p>
        </header>

        <div className="demo-credentials-banner">
          <div className="demo-badge">Development Demo Credentials</div>
          <p className="demo-creds-text">
            <strong>Email:</strong> <code>demo@fraudwarning.com</code>
            <br />
            <strong>Password:</strong> <code>Demo@123</code>
          </p>
          <button
            type="button"
            className="chip-btn"
            onClick={fillDemoCredentials}
            disabled={loading}
          >
            Auto-Fill Demo Credentials
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage && (
            <div className="error-msg login-error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-login"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-state">
                <span className="spinner-inline"></span> Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <footer className="footer login-footer">
          <p>Phase 3.5 &bull; Protected Access Only</p>
        </footer>
      </div>
    </div>
  )
}

export default Login
