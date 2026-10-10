import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Lock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Server,
} from 'lucide-react'

export default function Settings() {
  const { user, token, logout, handleUnauthorized } = useAuth()
  const [dbStats, setDbStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDbStats = async () => {
      setLoading(true)
      try {
        const stats = await api.getStats(token)
        setDbStats(stats)
      } catch (e) {
        if (e.status === 401) handleUnauthorized()
      } finally {
        setLoading(false)
      }
    }
    fetchDbStats()
  }, [token])

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Profile &amp; Platform Settings</h1>
          <p>
            Authenticated user session parameters, cryptographic security profile, and database system telemetry.
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={logout}
            style={{ color: '#dc2626' }}
          >
            <LogOut size={14} />
            <span>Terminate Active Session</span>
          </button>
        </div>
      </div>

      <div className="layout-2col">
        {/* Left Column: User Profile Details */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <User size={18} color="#6366f1" />
              Authenticated User Profile
            </h3>
            <span className="status-badge badge-success">ACTIVE SESSION</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="user-avatar-circle" style={{ width: '56px', height: '56px', fontSize: '1.25rem' }}>
              {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                {user?.name || 'Authorized Analyst'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Account User ID</span>
              <strong>#{user?.id || 'N/A'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Authentication Method</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Bearer JWT Token (RS256/HS256)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Credential Protection</span>
              <span style={{ color: '#6366f1', fontWeight: 600 }}>PBKDF2-HMAC-SHA256 (Salted)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
              <span style={{ color: '#64748b' }}>Authorization Scope</span>
              <strong>Strict Isolated Ownership</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Database Infrastructure Stats */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <Database size={18} color="#2563eb" />
              SQLite Database Telemetry
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              fraud_warning.db
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Querying database statistics...
            </div>
          ) : dbStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Users
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                  {dbStats.users}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Transactions
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                  {dbStats.transactions}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  SMS Messages
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                  {dbStats.sms_messages}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Security Alerts
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                  {dbStats.alerts}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Stats unavailable.
            </div>
          )}

          <div className="advisory-notice-box" style={{ marginTop: '1.25rem' }}>
            <Server size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Persistence Guarantee:</strong> SQLite database migrations are executed strictly non-destructively. Historical records and model pipelines are safely preserved.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
