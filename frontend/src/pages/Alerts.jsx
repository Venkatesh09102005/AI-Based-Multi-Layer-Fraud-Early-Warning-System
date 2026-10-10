import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Filter,
} from 'lucide-react'

export default function Alerts() {
  const { token, handleUnauthorized } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'NEW' | 'REVIEWED' | 'DISMISSED'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const fetchAlerts = async (statusFilter = filter) => {
    setLoading(true)
    setError('')
    try {
      const list = await api.getAlerts(token, statusFilter)
      if (Array.isArray(list)) {
        setAlerts(list)
      }
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to load security alerts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts(filter)
  }, [token, filter])

  const handleReview = async (alertId) => {
    setActionLoadingId(alertId)
    try {
      await api.reviewAlert(token, alertId)
      fetchAlerts(filter)
    } catch (err) {
      alert(`Failed to review alert: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDismiss = async (alertId) => {
    setActionLoadingId(alertId)
    try {
      await api.dismissAlert(token, alertId)
      fetchAlerts(filter)
    } catch (err) {
      alert(`Failed to dismiss alert: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleFeedback = async (alertId, feedbackValue) => {
    setActionLoadingId(alertId)
    try {
      await api.submitFeedback(token, alertId, feedbackValue)
      fetchAlerts(filter)
    } catch (err) {
      alert(`Failed to submit feedback: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Security Alerts Center</h1>
          <p>
            Early-warning incident management with deduplication safety, review/dismiss lifecycle, and feedback tracking.
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fetchAlerts(filter)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner-spin' : ''} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      <div className="white-card">
        {/* Status Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['ALL', 'NEW', 'REVIEWED', 'DISMISSED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn-pill-sample ${filter === st ? 'active' : ''}`}
                style={{
                  backgroundColor: filter === st ? '#6366f1' : '#ffffff',
                  color: filter === st ? '#ffffff' : '#475569',
                  borderColor: filter === st ? '#6366f1' : '#cbd5e1',
                  fontWeight: 600,
                }}
                onClick={() => setFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{alerts.length}</strong> Alerts for filter '{filter}'
          </div>
        </div>

        {error && (
          <div className="error-alert-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Loading alerts list...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No security alerts matching filter '{filter}'.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.map((al) => {
              const isWorking = actionLoadingId === al.id
              return (
                <div
                  key={al.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: al.risk_level === 'HIGH' ? '4px solid #ef4444' : '4px solid #f59e0b',
                    borderRadius: '10px',
                    padding: '1.15rem 1.25rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#334155' }}>#{al.id}</span>
                      <span
                        className={`status-badge ${
                          al.risk_level === 'HIGH' ? 'badge-danger' : 'badge-warning'
                        }`}
                      >
                        {al.risk_level}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                        {al.alert_type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className={`status-badge ${
                          al.status === 'NEW'
                            ? 'badge-danger'
                            : al.status === 'REVIEWED'
                            ? 'badge-info'
                            : 'badge-missing'
                        }`}
                      >
                        {al.status || 'NEW'}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: '0.4rem 0 0.6rem 0', fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.45 }}>
                    {al.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>
                      📅 Created: {al.created_at ? new Date(al.created_at).toLocaleString() : 'Timestamp not recorded'}
                    </span>

                    {/* Review / Dismiss Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {al.status !== 'REVIEWED' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => handleReview(al.id)}
                          disabled={isWorking}
                          title="Mark this alert as reviewed"
                        >
                          <CheckCircle2 size={13} color="#16a34a" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}
                      {al.status !== 'DISMISSED' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => handleDismiss(al.id)}
                          disabled={isWorking}
                          title="Dismiss this alert"
                        >
                          <XCircle size={13} color="#64748b" />
                          <span>Dismiss</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback Controls */}
                  <div className="feedback-bar">
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Your Feedback:</span>
                    {al.feedback && (
                      <span className={`status-badge ${al.feedback === 'useful' ? 'badge-success' : al.feedback === 'incorrect' ? 'badge-danger' : 'badge-info'}`}>
                        {al.feedback === 'useful' ? '👍 Useful Signal' : al.feedback === 'incorrect' ? '👎 Incorrect / False Positive' : '👁️ Reviewed'}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'useful' ? 'active-useful' : ''}`}
                      onClick={() => handleFeedback(al.id, 'useful')}
                      disabled={isWorking}
                    >
                      <ThumbsUp size={12} />
                      <span>Useful</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'incorrect' ? 'active-incorrect' : ''}`}
                      onClick={() => handleFeedback(al.id, 'incorrect')}
                      disabled={isWorking}
                    >
                      <ThumbsDown size={12} />
                      <span>Incorrect</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'reviewed' ? 'active-reviewed' : ''}`}
                      onClick={() => handleFeedback(al.id, 'reviewed')}
                      disabled={isWorking}
                    >
                      <Eye size={12} />
                      <span>Reviewed</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
