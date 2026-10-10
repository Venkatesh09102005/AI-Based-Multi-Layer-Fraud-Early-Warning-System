import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  CreditCard,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  Clock,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Activity,
} from 'lucide-react'

export default function Dashboard() {
  const { token, handleUnauthorized } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedbackLoadingId, setFeedbackLoadingId] = useState(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const summary = await api.getDashboardSummary(token)
      setData(summary)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to load dashboard summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [token])

  const handleFeedback = async (alertId, feedbackValue) => {
    setFeedbackLoadingId(alertId)
    try {
      await api.submitFeedback(token, alertId, feedbackValue)
      fetchDashboard()
    } catch (err) {
      alert(`Feedback submission failed: ${err.message}`)
    } finally {
      setFeedbackLoadingId(null)
    }
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="spinner-spin" style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Aggregating real-time security intelligence and telemetry...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-alert-banner">
        <AlertTriangle size={20} />
        <div>
          <strong>Error loading dashboard:</strong> {error}
          <br />
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: '0.5rem', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
            onClick={fetchDashboard}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const assessments = data?.risk_assessments || { total: 0, high: 0, medium: 0, low: 0 }
  const alerts = data?.alerts_summary || { total: 0, new: 0, reviewed: 0, dismissed: 0, feedback_useful: 0, feedback_incorrect: 0, feedback_reviewed: 0 }
  const totalFb = (alerts.feedback_useful || 0) + (alerts.feedback_incorrect || 0) + (alerts.feedback_reviewed || 0)
  const totalAssessments = assessments.total || 0

  const highPct = totalAssessments > 0 ? (assessments.high / totalAssessments) * 100 : 0
  const medPct = totalAssessments > 0 ? (assessments.medium / totalAssessments) * 100 : 0
  const lowPct = totalAssessments > 0 ? (assessments.low / totalAssessments) * 100 : 0

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Executive Security Dashboard</h1>
          <p>
            Real-time multi-vector fraud early warnings, heuristic telemetry, and contextual safety recommendations.
          </p>
        </div>
        <div className="page-actions-group">
          <Link to="/analysis/risk-assessment" className="btn-primary">
            <ShieldAlert size={16} />
            <span>Run New Risk Assessment</span>
          </Link>
        </div>
      </div>

      {/* 1. Top KPI Summary Grid */}
      <div className="stats-grid-4">
        {/* Metric 1: Risk Assessments */}
        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Risk Assessments</span>
            <div className="stat-icon-wrapper icon-purple">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-big-value">{totalAssessments}</div>
          {/* Visual Progress Bar */}
          <div style={{ display: 'flex', height: '6px', borderRadius: '9999px', overflow: 'hidden', background: '#f1f5f9', margin: '0.5rem 0' }}>
            <div style={{ width: `${highPct}%`, backgroundColor: '#ef4444' }} title={`High: ${assessments.high}`}></div>
            <div style={{ width: `${medPct}%`, backgroundColor: '#f59e0b' }} title={`Medium: ${assessments.medium}`}></div>
            <div style={{ width: `${lowPct}%`, backgroundColor: '#22c55e' }} title={`Low: ${assessments.low}`}></div>
          </div>
          <div className="stat-chips-row">
            <span className="chip-stat badge-danger">High: {assessments.high}</span>
            <span className="chip-stat badge-warning">Med: {assessments.medium}</span>
            <span className="chip-stat badge-success">Low: {assessments.low}</span>
          </div>
        </div>

        {/* Metric 2: Security Alerts */}
        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Security Alerts</span>
            <div className="stat-icon-wrapper icon-red">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-big-value">{alerts.total}</div>
          <div className="stat-chips-row" style={{ marginTop: '0.6rem' }}>
            <span className="chip-stat badge-danger">New: {alerts.new}</span>
            <span className="chip-stat badge-info">Reviewed: {alerts.reviewed}</span>
            <span className="chip-stat badge-missing">Dismissed: {alerts.dismissed}</span>
          </div>
        </div>

        {/* Metric 3: User Feedback */}
        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Alert Feedback</span>
            <div className="stat-icon-wrapper icon-blue">
              <ThumbsUp size={20} />
            </div>
          </div>
          <div className="stat-big-value">{totalFb}</div>
          <div className="stat-chips-row" style={{ marginTop: '0.6rem' }}>
            <span className="chip-stat badge-success">👍 Useful: {alerts.feedback_useful || 0}</span>
            <span className="chip-stat badge-danger">👎 Incorrect: {alerts.feedback_incorrect || 0}</span>
            <span className="chip-stat badge-info">👁️ Reviewed: {alerts.feedback_reviewed || 0}</span>
          </div>
        </div>

        {/* Metric 4: Monitored Transactions */}
        <div className="stat-metric-card">
          <div className="stat-card-top">
            <span className="stat-label-text">Monitored Records</span>
            <div className="stat-icon-wrapper icon-green">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="stat-big-value">{data?.transactions_summary?.total || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.6rem' }}>
            Account transactions analyzed
          </div>
        </div>
      </div>

      {/* 2. Active Safety Recommendations */}
      {data?.safety_recommendations && data.safety_recommendations.length > 0 && (
        <div className="white-card" style={{ marginBottom: '1.75rem', background: '#fcfbfe', border: '1px solid #ede9fe' }}>
          <div className="card-title-row">
            <h3 style={{ color: '#6d28d9' }}>
              <ShieldCheck size={20} color="#7c3aed" />
              Active Safety Recommendations (Advisory Guidance)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
              {data.safety_recommendations.length} Active Guidance Points
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.safety_recommendations.map((rec, idx) => {
              const badgeClass =
                rec.priority === 'HIGH' ? 'badge-danger' : rec.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'
              return (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{rec.title}</strong>
                    <span className={`status-badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                      {rec.priority}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                    {rec.action || rec.description}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="advisory-notice-box" style={{ marginTop: '1rem' }}>
            <HelpCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Advisory Notice:</strong> {data.disclaimer || 'Recommendations are advisory suggestions based on detected signals. The system never blocks accounts, transfers funds, or contacts banks.'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Two Column: Recent Alerts & Recent Transactions */}
      <div className="layout-2col">
        {/* Left Column: Recent Security Alerts */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <AlertTriangle size={18} color="#ef4444" />
              Recent Security Alerts
            </h3>
            <Link to="/alerts" style={{ fontSize: '0.78rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              View All ({alerts.total}) &rarr;
            </Link>
          </div>

          {(!data?.recent_alerts || data.recent_alerts.length === 0) ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No active security alerts recorded for your account.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.recent_alerts.map((al) => {
                const isSubmitting = feedbackLoadingId === al.id
                return (
                  <div
                    key={al.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>#{al.id}</span>
                        <span className={`status-badge ${al.risk_level === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                          {al.risk_level}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{al.alert_type}</span>
                      </div>
                      <span className={`status-badge ${al.status === 'NEW' ? 'badge-danger' : 'badge-info'}`}>
                        {al.status || 'NEW'}
                      </span>
                    </div>

                    <p style={{ margin: '0.3rem 0', fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.4 }}>
                      {al.message}
                    </p>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                      📅 {al.created_at ? new Date(al.created_at).toLocaleString() : 'Timestamp not recorded'}
                    </div>

                    {/* Inline Feedback Buttons */}
                    <div className="feedback-bar">
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Feedback:</span>
                      {al.feedback && (
                        <span className={`status-badge ${al.feedback === 'useful' ? 'badge-success' : al.feedback === 'incorrect' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {al.feedback === 'useful' ? '👍 Useful' : al.feedback === 'incorrect' ? '👎 Incorrect' : '👁️ Reviewed'}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`btn-feedback-action ${al.feedback === 'useful' ? 'active-useful' : ''}`}
                        onClick={() => handleFeedback(al.id, 'useful')}
                        disabled={isSubmitting}
                      >
                        👍 Useful
                      </button>
                      <button
                        type="button"
                        className={`btn-feedback-action ${al.feedback === 'incorrect' ? 'active-incorrect' : ''}`}
                        onClick={() => handleFeedback(al.id, 'incorrect')}
                        disabled={isSubmitting}
                      >
                        👎 Incorrect
                      </button>
                      <button
                        type="button"
                        className={`btn-feedback-action ${al.feedback === 'reviewed' ? 'active-reviewed' : ''}`}
                        onClick={() => handleFeedback(al.id, 'reviewed')}
                        disabled={isSubmitting}
                      >
                        👁️ Reviewed
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Monitored Transactions */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <CreditCard size={18} color="#2563eb" />
              Recent Monitored Transactions
            </h3>
            <Link to="/analysis/transactions" style={{ fontSize: '0.78rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Analyze Tx &rarr;
            </Link>
          </div>

          {(!data?.recent_transactions || data.recent_transactions.length === 0) ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No transactions recorded for this account.
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Beneficiary</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}>#{tx.id}</td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {tx.transaction_time ? new Date(tx.transaction_time).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 700, color: tx.amount > 50000 ? '#dc2626' : tx.amount > 10000 ? '#d97706' : '#16a34a' }}>
                        ₹{Number(tx.amount).toLocaleString()}
                      </td>
                      <td>
                        <span className="status-badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {tx.beneficiary_identifier || `ID ${tx.beneficiary_id || 'N/A'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Activity Stream */}
      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <Activity size={18} color="#7c3aed" />
            Recent Security Activity Stream
          </h3>
          <Link to="/activity" style={{ fontSize: '0.78rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
            View Full Timeline &rarr;
          </Link>
        </div>

        {(!data?.recent_activity || data.recent_activity.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No activity events recorded yet.
          </div>
        ) : (
          <div className="timeline-stream">
            {data.recent_activity.map((ev) => (
              <div key={ev.event_id} className="timeline-card">
                <div className="timeline-icon-box">
                  {ev.entity_type === 'SMS' && <MessageSquare size={16} />}
                  {ev.entity_type === 'TRANSACTION' && <CreditCard size={16} />}
                  {ev.entity_type === 'ALERT' && <AlertTriangle size={16} />}
                  {ev.entity_type === 'BENEFICIARY' && <Shield size={16} />}
                  {ev.entity_type === 'DEVICE' && <Shield size={16} />}
                </div>
                <div className="timeline-card-content">
                  <div className="timeline-card-header">
                    <span className="timeline-event-title">{ev.title}</span>
                    <span className="timeline-time-tag">
                      {ev.timestamp_available
                        ? new Date(ev.timestamp).toLocaleString()
                        : 'Timestamp Unavailable'}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#475569' }}>
                    {ev.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                    <span className="chip-stat badge-info" style={{ fontSize: '0.65rem' }}>
                      {ev.entity_type}
                    </span>
                    {ev.severity && (
                      <span className={`chip-stat ${ev.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {ev.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
