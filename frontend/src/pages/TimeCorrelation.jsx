import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Timer,
  ArrowRight,
} from 'lucide-react'

export default function TimeCorrelation() {
  const { token, handleUnauthorized } = useAuth()
  const [smsTime, setSmsTime] = useState('2026-10-07T10:00:00')
  const [txTime, setTxTime] = useState('2026-10-07T10:12:00')
  const [windowMinutes, setWindowMinutes] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const samples = [
    {
      label: '⚡ Correlated (12 min gap)',
      sms: '2026-10-07T10:00:00',
      tx: '2026-10-07T10:12:00',
      window: 30,
    },
    {
      label: '⏱️ Outside Window (60 min gap)',
      sms: '2026-10-07T10:00:00',
      tx: '2026-10-07T11:00:00',
      window: 30,
    },
    {
      label: '🔄 Transaction Preceding SMS',
      sms: '2026-10-07T11:00:00',
      tx: '2026-10-07T10:00:00',
      window: 30,
    },
  ]

  const handleAnalyze = async (overrideParams = null) => {
    const sTime = overrideParams ? overrideParams.sms : smsTime
    const tTime = overrideParams ? overrideParams.tx : txTime
    const wMin = overrideParams ? overrideParams.window : windowMinutes

    if (!sTime || !tTime) {
      setError('Please provide both SMS received time and Transaction timestamp.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.checkTimeCorrelation(token, sTime, tTime, wMin)
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to evaluate time correlation.')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sample) => {
    setSmsTime(sample.sms)
    setTxTime(sample.tx)
    setWindowMinutes(sample.window)
    handleAnalyze(sample)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Time Correlation Analysis</h1>
          <p>
            Temporal security correlation measuring whether transactions took place shortly after receiving suspicious SMS alerts.
          </p>
        </div>
      </div>

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <Clock size={18} color="#6366f1" />
            Temporal Signal Comparison
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Window Model: Configurable Sliding Window
          </span>
        </div>

        {/* Quick Samples */}
        <div className="sample-pills-bar">
          <span>Presets:</span>
          {samples.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample(s)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-alert-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAnalyze()
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SMS Received Timestamp</label>
              <input
                type="datetime-local"
                step="1"
                className="form-control"
                value={smsTime}
                onChange={(e) => setSmsTime(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Timestamp</label>
              <input
                type="datetime-local"
                step="1"
                className="form-control"
                value={txTime}
                onChange={(e) => setTxTime(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Correlation Window: <strong>{windowMinutes} mins</strong>
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                className="form-control"
                style={{ padding: '0.2rem' }}
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(parseInt(e.target.value, 10))}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span>Evaluating Temporal Proximity...</span>
            ) : (
              <>
                <Timer size={16} />
                <span>Evaluate Time Correlation</span>
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="result-card-box">
            <div
              className={`result-score-banner ${
                result.is_correlated ? 'score-banner-medium' : 'score-banner-low'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {result.is_correlated ? (
                  <ShieldAlert size={30} color="#d97706" />
                ) : (
                  <ShieldCheck size={30} color="#16a34a" />
                )}
                <div>
                  <div className="score-display-label">Temporal Correlation Signal</div>
                  <strong style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>
                    {result.is_correlated
                      ? 'High Temporal Correlation Detected'
                      : 'Not Temporally Correlated'}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  className={`status-badge ${
                    result.is_correlated ? 'badge-warning' : 'badge-success'
                  }`}
                >
                  {result.is_correlated ? 'CORRELATED' : 'INDEPENDENT'}
                </span>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Difference: {result.time_difference_minutes !== null ? `${result.time_difference_minutes} mins` : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Configured Window</div>
                <strong style={{ fontSize: '0.9rem' }}>{result.correlation_window_minutes} minutes</strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Observed Elapsed Time</div>
                <strong style={{ fontSize: '0.9rem' }}>
                  {result.time_difference_minutes !== null ? `${result.time_difference_minutes} minutes` : 'Non-Sequential'}
                </strong>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Social Engineering Vector</div>
                <strong style={{ fontSize: '0.9rem' }}>
                  {result.is_correlated ? '🚨 Potential Scam-Induced Action' : '✅ Standard Activity'}
                </strong>
              </div>
            </div>

            <div className="advisory-notice-box">
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Temporal Advisory Notice:</strong> Transactions executing within {result.correlation_window_minutes} minutes of receiving a suspicious SMS message often signify social engineering urgency. Always verify payee requests independently.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
