import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please provide both email and password.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleAutofillDemo = () => {
    setEmail('demo@fraudwarning.com')
    setPassword('Demo@123')
    setError('')
  }

  return (
    <div className="login-page-bg">
      <div className="login-auth-card">
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Shield size={28} />
          </div>
          <h2>SentinelFraud</h2>
          <p>AI-Based Multi-Layer Fraud Early Warning System</p>
        </div>

        {/* Demo Credentials Quick Chip */}
        <div className="demo-credentials-card">
          <div className="demo-creds-text">
            <strong>Demo Account Available:</strong>
            <br />
            demo@fraudwarning.com / Demo@123
          </div>
          <button
            type="button"
            className="btn-autofill-demo"
            onClick={handleAutofillDemo}
          >
            Autofill
          </button>
        </div>

        {error && (
          <div className="error-alert-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In To Platform</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.78rem' }}>
            <CheckCircle2 size={14} color="#16a34a" />
            <span>PBKDF2-HMAC Password Hashing &bull; JWT Token Auth</span>
          </div>
        </div>
      </div>
    </div>
  )
}
