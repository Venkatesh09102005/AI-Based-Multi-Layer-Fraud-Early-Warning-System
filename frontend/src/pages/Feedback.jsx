import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  MessageCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Send,
} from 'lucide-react'

export default function Feedback() {
  const { token, handleUnauthorized } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedbackNotes, setFeedbackNotes] = useState({})
  const [submittingId, setSubmittingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const fetchAlertsAndFeedback = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api.getAlerts(token)
      if (Array.isArray(list)) {
        setAlerts(list)
      }
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to load alert feedback telemetry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlertsAndFeedback()
  }, [token])

  const handleFeedback = async (alertId, feedbackValue) => {
    setSubmittingId(alertId)
    setStatusMessage('')
    try {
      const note = feedbackNotes[alertId] || ''
      await api.submitFeedback(token, alertId, feedbackValue, note)
      setStatusMessage(`Feedback '${feedbackValue}' saved successfully for Alert #${alertId}.`)
      fetchAlertsAndFeedback()
    } catch (err) {
      alert(`Feedback submission failed: ${err.message}`)
    } finally {
      setSubmittingId(null)
    }
  }

  const usefulCount = alerts.filter((a) => a.feedback === 'useful').length
  const incorrectCount = alerts.filter((a) => a.feedback === 'incorrect').length
  const reviewedCount = alerts.filter((a) => a.feedback === 'reviewed').length
  const totalFeedback = usefulCount + incorrectCount + reviewedCount

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Security Alert Feedback Hub</h1>
          <p>
            User-driven alert validation telemetry enabling review classification, false-positive reporting, and audit trail annotations.
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchAlertsAndFeedback}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner-spin' : ''} />
            <span>Refresh Feedback</span>
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="stats-grid-4">
        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Total Validations</span>
            <div className="stat-icon-wrapper icon-purple">
              <MessageCircle size={20} />
            </div>
          </div>
          <div className="stat-big-value">{totalFeedback}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Alerts with submitted feedback
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Accurate Detections</span>
            <div className="stat-icon-wrapper icon-green">
              <ThumbsUp size={20} />
            </div>
          </div>
          <div className="stat-big-value">{usefulCount}</div>
          <div className="stat-chips-row">
            <span className="chip-stat badge-success">Useful Risk Signals</span>
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">False Positives</span>
            <div className="stat-icon-wrapper icon-red">
              <ThumbsDown size={20} />
            </div>
          </div>
          <div className="stat-big-value">{incorrectCount}</div>
          <div className="stat-chips-row">
            <span className="chip-stat badge-danger">Reported As Incorrect</span>
          </div>
        </div>

        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Reviewed Acknowledgments</span>
            <div className="stat-icon-wrapper icon-blue">
              <Eye size={20} />
            </div>
          </div>
          <div className="stat-big-value">{reviewedCount}</div>
          <div className="stat-chips-row">
            <span className="chip-stat badge-info">Audited by User</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          ✓ {statusMessage}
        </div>
      )}

      {error && (
        <div className="error-alert-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <MessageCircle size={18} color="#6366f1" />
            Alerts Feedback Roster
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {alerts.length} Total Alerts in Database
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner-spin" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Loading alerts roster...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No security alerts recorded to provide feedback on.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.map((al) => {
              const isWorking = submittingId === al.id
              return (
                <div
                  key={al.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.15rem 1.25rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#334155' }}>Alert #{al.id}</span>
                      <span
                        className={`status-badge ${
                          al.risk_level === 'HIGH' ? 'badge-danger' : 'badge-warning'
                        }`}
                      >
                        {al.risk_level}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{al.alert_type}</span>
                    </div>

                    <div>
                      {al.feedback ? (
                        <span
                          className={`status-badge ${
                            al.feedback === 'useful'
                              ? 'badge-success'
                              : al.feedback === 'incorrect'
                              ? 'badge-danger'
                              : 'badge-info'
                          }`}
                        >
                          Current Feedback: {al.feedback.toUpperCase()}
                        </span>
                      ) : (
                        <span className="status-badge badge-missing">Pending Feedback</span>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: '0.3rem 0 0.6rem 0', fontSize: '0.85rem', color: '#1e293b' }}>
                    {al.message}
                  </p>

                  {/* Feedback Notes Input */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-control"
                      style={{ flexGrow: 1, minWidth: '220px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      placeholder="Add an optional audit note / rationale for this alert..."
                      value={feedbackNotes[al.id] || al.feedback_notes || ''}
                      onChange={(e) =>
                        setFeedbackNotes({ ...feedbackNotes, [al.id]: e.target.value })
                      }
                      disabled={isWorking}
                    />
                  </div>

                  {/* Interactive Feedback Buttons */}
                  <div className="feedback-bar" style={{ marginTop: '0.35rem', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Select Classification:</span>
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'useful' ? 'active-useful' : ''}`}
                      onClick={() => handleFeedback(al.id, 'useful')}
                      disabled={isWorking}
                    >
                      <ThumbsUp size={13} />
                      <span>👍 Useful Signal</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'incorrect' ? 'active-incorrect' : ''}`}
                      onClick={() => handleFeedback(al.id, 'incorrect')}
                      disabled={isWorking}
                    >
                      <ThumbsDown size={13} />
                      <span>👎 False Alarm / Incorrect</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-feedback-action ${al.feedback === 'reviewed' ? 'active-reviewed' : ''}`}
                      onClick={() => handleFeedback(al.id, 'reviewed')}
                      disabled={isWorking}
                    >
                      <Eye size={13} />
                      <span>👁️ Acknowledge Reviewed</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="advisory-notice-box" style={{ marginTop: '1.5rem' }}>
          <HelpCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Audit Policy:</strong> Feedback is recorded strictly for incident triage and security reporting. It does NOT automatically retrain or mutate production machine learning weights.
          </span>
        </div>
      </div>
    </div>
  )
}
