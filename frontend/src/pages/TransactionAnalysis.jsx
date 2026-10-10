import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Activity,
  UserCheck,
  Smartphone,
} from 'lucide-react'

export default function TransactionAnalysis() {
  const { token, handleUnauthorized } = useAuth()
  const [form, setForm] = useState({
    amount: '450',
    transaction_type: 'UPI',
    hour: '14',
    day_of_week: '2',
    location: 'Mumbai',
    beneficiary_identifier: 'ACC-DEMO-001',
    device_identifier: 'DEV-PIXEL8-DEMO-01',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const presets = [
    {
      label: '🟢 Normal Daily UPI (₹450)',
      data: {
        amount: '450',
        transaction_type: 'UPI',
        hour: '14',
        day_of_week: '2',
        location: 'Mumbai',
        beneficiary_identifier: 'ACC-DEMO-001',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
      },
    },
    {
      label: '🔴 High-Value 3 AM Outlier (₹450,000)',
      data: {
        amount: '450000',
        transaction_type: 'UPI',
        hour: '3',
        day_of_week: '2',
        location: 'St. Petersburg',
        beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
        device_identifier: 'DEV-NEW-PROXY-99',
      },
    },
    {
      label: '🟡 Midday High NEFT (₹85,000)',
      data: {
        amount: '85000',
        transaction_type: 'NEFT',
        hour: '11',
        day_of_week: '3',
        location: 'Mumbai',
        beneficiary_identifier: 'ACC-DEMO-002',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
      },
    },
  ]

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAnalyze = async (overrideData = null) => {
    const dataToSend = overrideData || form
    if (!dataToSend.amount || isNaN(parseFloat(dataToSend.amount))) {
      setError('Please provide a valid transaction amount.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload = {
        amount: parseFloat(dataToSend.amount),
        transaction_type: dataToSend.transaction_type,
        hour: parseInt(dataToSend.hour, 10),
        day_of_week: parseInt(dataToSend.day_of_week, 10),
        location: dataToSend.location,
        beneficiary_identifier: dataToSend.beneficiary_identifier.trim(),
        device_identifier: dataToSend.device_identifier.trim(),
      }
      const res = await api.analyzeTransaction(token, payload)
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to analyze transaction.')
    } finally {
      setLoading(false)
    }
  }

  const loadPreset = (presetData) => {
    setForm(presetData)
    handleAnalyze(presetData)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Transaction Anomaly Detection</h1>
          <p>
            Isolation Forest unsupervised anomaly detection evaluated alongside beneficiary and device security context.
          </p>
        </div>
      </div>

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <CreditCard size={18} color="#2563eb" />
            Transaction Evaluation Parameters
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Model: Isolation Forest + Context Signals
          </span>
        </div>

        {/* Preset Chips */}
        <div className="sample-pills-bar">
          <span>Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-pill-sample"
              onClick={() => loadPreset(p.data)}
            >
              {p.label}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Transfer Amount (INR ₹)</label>
              <input
                type="number"
                name="amount"
                className="form-control"
                value={form.amount}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Channel</label>
              <select
                name="transaction_type"
                className="form-control"
                value={form.transaction_type}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="UPI">UPI (Instant Real-time)</option>
                <option value="NEFT">NEFT (Batch Settlement)</option>
                <option value="IMPS">IMPS (Immediate Payment)</option>
                <option value="RTGS">RTGS (High-Value Gross)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hour of Day (0–23)</label>
              <input
                type="number"
                name="hour"
                min="0"
                max="23"
                className="form-control"
                value={form.hour}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Day of Week</label>
              <select
                name="day_of_week"
                className="form-control"
                value={form.day_of_week}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="0">Monday</option>
                <option value="1">Tuesday</option>
                <option value="2">Wednesday</option>
                <option value="3">Thursday</option>
                <option value="4">Friday</option>
                <option value="5">Saturday</option>
                <option value="6">Sunday</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Originating Location</label>
              <input
                type="text"
                name="location"
                className="form-control"
                value={form.location}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Beneficiary Account Identifier</label>
              <input
                type="text"
                name="beneficiary_identifier"
                className="form-control"
                value={form.beneficiary_identifier}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Originating Device Identifier</label>
              <input
                type="text"
                name="device_identifier"
                className="form-control"
                value={form.device_identifier}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <span>Computing Isolation Forest Score...</span>
            ) : (
              <>
                <Activity size={16} />
                <span>Evaluate Transaction Anomaly</span>
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="result-card-box">
            <div
              className={`result-score-banner ${
                result.anomaly_prediction === 'anomalous'
                  ? 'score-banner-high'
                  : 'score-banner-low'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {result.anomaly_prediction === 'anomalous' ? (
                  <ShieldAlert size={32} color="#dc2626" />
                ) : (
                  <ShieldCheck size={32} color="#16a34a" />
                )}
                <div>
                  <div className="score-display-label">Model Assessment</div>
                  <strong style={{ fontSize: '1.25rem', textTransform: 'uppercase' }}>
                    {result.anomaly_prediction === 'anomalous'
                      ? 'Statistically Anomalous Transfer'
                      : 'Consistent With Baseline Patterns'}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  className={`status-badge ${
                    result.anomaly_prediction === 'anomalous' ? 'badge-danger' : 'badge-success'
                  }`}
                >
                  {result.anomaly_prediction.toUpperCase()}
                </span>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Raw Score: {Number(result.anomaly_score).toFixed(4)}
                </div>
              </div>
            </div>

            {/* Context Signals Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} color={result.beneficiary_status === 'new' ? '#d97706' : '#16a34a'} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Beneficiary Context</div>
                  <strong style={{ fontSize: '0.85rem' }}>
                    {result.beneficiary_status === 'new' ? '⚠️ New Payee' : '✅ Known Payee'}
                  </strong>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={18} color={result.device_status === 'new' ? '#d97706' : '#16a34a'} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Device Context</div>
                  <strong style={{ fontSize: '0.85rem' }}>
                    {result.device_status === 'new' ? '⚠️ Unrecognized Device' : '✅ Registered Device'}
                  </strong>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#6366f1" />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Isolation Score Threshold</div>
                  <strong style={{ fontSize: '0.85rem' }}>
                    {result.anomaly_score < 0 ? 'Negative (Outlier)' : 'Positive (Normal Cluster)'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="advisory-notice-box">
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Advisory Warning:</strong> Anomaly detection highlights unusual numerical or behavioral deviations from historical user baselines. It does not block transactions.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
