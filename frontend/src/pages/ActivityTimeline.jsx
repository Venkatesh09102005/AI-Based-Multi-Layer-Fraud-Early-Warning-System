import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Activity,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  UserCheck,
  Smartphone,
  Bell,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react'

export default function ActivityTimeline() {
  const { token, handleUnauthorized } = useAuth()
  const [events, setEvents] = useState([])
  const [filterType, setFilterType] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTimeline = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api.getTimeline(token)
      if (Array.isArray(list)) {
        setEvents(list)
      }
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to load activity timeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [token])

  const filteredEvents =
    filterType === 'ALL'
      ? events
      : events.filter((e) => e.entity_type === filterType)

  const entityIcon = (type) => {
    switch (type) {
      case 'SMS':
        return <MessageSquare size={16} />
      case 'TRANSACTION':
        return <CreditCard size={16} />
      case 'ALERT':
        return <Bell size={16} />
      case 'BENEFICIARY':
        return <UserCheck size={16} />
      case 'DEVICE':
        return <Smartphone size={16} />
      default:
        return <Activity size={16} />
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Activity &amp; Fraud History Timeline</h1>
          <p>
            Chronological multi-vector audit log aggregating SMS messages, financial transactions, registered beneficiaries, hardware devices, and security alerts.
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchTimeline}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner-spin' : ''} />
            <span>Refresh Timeline</span>
          </button>
        </div>
      </div>

      <div className="white-card">
        {/* Category Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['ALL', 'SMS', 'TRANSACTION', 'ALERT', 'BENEFICIARY', 'DEVICE'].map((ft) => (
              <button
                key={ft}
                type="button"
                className={`btn-pill-sample ${filterType === ft ? 'active' : ''}`}
                style={{
                  backgroundColor: filterType === ft ? '#6366f1' : '#ffffff',
                  color: filterType === ft ? '#ffffff' : '#475569',
                  borderColor: filterType === ft ? '#6366f1' : '#cbd5e1',
                  fontWeight: 600,
                }}
                onClick={() => setFilterType(ft)}
              >
                {ft}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{filteredEvents.length}</strong> Events
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
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Aggregating chronological audit trail...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No activity records matching filter '{filterType}'.
          </div>
        ) : (
          <div className="timeline-stream">
            {filteredEvents.map((ev) => (
              <div key={ev.event_id} className="timeline-card">
                <div className="timeline-icon-box">{entityIcon(ev.entity_type)}</div>
                <div className="timeline-card-content">
                  <div className="timeline-card-header">
                    <span className="timeline-event-title">{ev.title}</span>
                    <span
                      className={`timeline-time-tag ${
                        !ev.timestamp_available ? 'badge-warning' : ''
                      }`}
                    >
                      {ev.timestamp_available ? (
                        <>🕒 {new Date(ev.timestamp).toLocaleString()}</>
                      ) : (
                        <>⚠️ Timestamp Unavailable</>
                      )}
                    </span>
                  </div>

                  <p style={{ margin: '0.35rem 0', fontSize: '0.83rem', color: '#334155', lineHeight: 1.45 }}>
                    {ev.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span className="status-badge badge-info" style={{ fontSize: '0.65rem' }}>
                      {ev.entity_type}
                    </span>
                    {ev.severity && (
                      <span
                        className={`status-badge ${
                          ev.severity === 'HIGH'
                            ? 'badge-danger'
                            : ev.severity === 'MEDIUM'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {ev.severity}
                      </span>
                    )}
                    {ev.metadata?.url && (
                      <span className="status-badge badge-missing" style={{ fontSize: '0.65rem' }}>
                        URL: {ev.metadata.url}
                      </span>
                    )}
                    {ev.metadata?.status && (
                      <span className="status-badge badge-info" style={{ fontSize: '0.65rem' }}>
                        Status: {ev.metadata.status}
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
