import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  Bell,
  Sparkles,
  Info,
  ListOrdered,
} from 'lucide-react'

export default function RiskAssessment() {
  const { token, handleUnauthorized } = useAuth()
  const [smsText, setSmsText] = useState(
    'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.'
  )
  const [txData, setTxData] = useState({
    amount: '450000',
    transaction_type: 'UPI',
    hour: '3',
    day_of_week: '2',
    location: 'St. Petersburg',
    beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
    device_identifier: 'DEV-NEW-PROXY-99',
    transaction_time: '2026-10-07T10:12:00',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleRun = async (overridePayload = null) => {
    setLoading(true)
    setError('')
    setResult(null)

    let payload = overridePayload
    if (!payload) {
      const hasSms = Boolean(smsText && smsText.trim())
      const hasTx = Boolean(txData.amount && txData.amount.toString().trim())

      payload = {
        sms_text: hasSms ? smsText.trim() : undefined,
        transaction_data: hasTx ? {
          amount: parseFloat(txData.amount),
          transaction_type: txData.transaction_type,
          hour: parseInt(txData.hour || '0', 10),
          day_of_week: parseInt(txData.day_of_week || '0', 10),
          location: txData.location || 'Unknown',
          beneficiary_identifier: (txData.beneficiary_identifier || '').trim() || undefined,
          device_identifier: (txData.device_identifier || '').trim() || undefined,
          transaction_time: (txData.transaction_time || '').trim() || undefined,
        } : undefined,
        beneficiary_identifier: (txData.beneficiary_identifier || '').trim() || undefined,
        device_identifier: (txData.device_identifier || '').trim() || undefined,
        transaction_time: (txData.transaction_time || '').trim() || undefined,
        window_minutes: 30,
      }
    }

    try {
      const res = await api.evaluateRiskAssessment(token, payload)
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to evaluate multi-factor risk assessment.')
    } finally {
      setLoading(false)
    }
  }

  const loadScenario = (type) => {
    setError('')
    if (type === 'HIGH_ATTACK') {
      const payload = {
        sms_text: 'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.',
        transaction_data: {
          amount: 450000,
          transaction_type: 'UPI',
          hour: 3,
          day_of_week: 2,
          location: 'St. Petersburg',
          beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
          device_identifier: 'DEV-NEW-PROXY-99',
          transaction_time: '2026-10-07T10:12:00',
        },
        beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
        device_identifier: 'DEV-NEW-PROXY-99',
        transaction_time: '2026-10-07T10:12:00',
        window_minutes: 30,
      }
      setSmsText(payload.sms_text)
      setTxData({
        amount: '450000',
        transaction_type: 'UPI',
        hour: '3',
        day_of_week: '2',
        location: 'St. Petersburg',
        beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
        device_identifier: 'DEV-NEW-PROXY-99',
        transaction_time: '2026-10-07T10:12:00',
      })
      handleRun(payload)
    } else if (type === 'PHISHING_ONLY') {
      setSmsText('Claim your prize bonus immediately at http://bit.ly/claim-bonus')
      setTxData({
        amount: '',
        transaction_type: 'UPI',
        hour: '14',
        day_of_week: '2',
        location: '',
        beneficiary_identifier: '',
        device_identifier: '',
        transaction_time: '',
      })
      handleRun({
        sms_text: 'Claim your prize bonus immediately at http://bit.ly/claim-bonus',
      })
    } else if (type === 'LEGITIMATE') {
      setSmsText('Your electricity bill payment of Rs 850 was successful. Thank you.')
      setTxData({
        amount: '850',
        transaction_type: 'UPI',
        hour: '14',
        day_of_week: '2',
        location: 'Mumbai',
        beneficiary_identifier: 'ACC-DEMO-001',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
        transaction_time: '2026-10-07T14:30:00',
      })
      handleRun({
        sms_text: 'Your electricity bill payment of Rs 850 was successful. Thank you.',
        transaction_data: {
          amount: 850,
          transaction_type: 'UPI',
          hour: 14,
          day_of_week: 2,
          location: 'Mumbai',
          beneficiary_identifier: 'ACC-DEMO-001',
          device_identifier: 'DEV-PIXEL8-DEMO-01',
          transaction_time: '2026-10-07T14:30:00',
        },
        beneficiary_identifier: 'ACC-DEMO-001',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
        transaction_time: '2026-10-07T14:30:00',
      })
    } else if (type === 'INSUFFICIENT_DATA') {
      setSmsText('')
      setTxData({
        amount: '',
        transaction_type: 'UPI',
        hour: '',
        day_of_week: '',
        location: '',
        beneficiary_identifier: '',
        device_identifier: '',
        transaction_time: '',
      })
      handleRun({})
    } else if (type === 'DB_RECORDS') {
      setSmsText('(Using Demo Account Seeded SMS #7 & Tx #9)')
      handleRun({ sms_id: 7, transaction_id: 9 })
    }
  }

  const sigNameMap = {
    sms: 'SMS Scam ML',
    transaction: 'Transaction Anomaly ML',
    beneficiary: 'Beneficiary Recognition',
    device: 'Device Recognition',
    time_correlation: 'Time Correlation',
    url: 'URL Security Heuristics',
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Overall Multi-Factor Risk Assessment Engine</h1>
          <p>
            Holistic rule-based fraud risk engine synthesizing SMS natural language, transaction anomalies, device trust, beneficiary status, time correlation, and URL heuristics.
          </p>
        </div>
      </div>

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <ShieldAlert size={18} color="#7c3aed" />
            Evaluate Multi-Vector Fraud Attack Scenario
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Weights: 0 to 100 Cumulative Points
          </span>
        </div>

        {/* Scenarios Preset Bar */}
        <div className="sample-pills-bar">
          <span>Simulation Presets:</span>
          <button
            type="button"
            className="btn-pill-sample"
            onClick={() => loadScenario('HIGH_ATTACK')}
          >
            🚨 Multi-Vector Attack (HIGH)
          </button>
          <button
            type="button"
            className="btn-pill-sample"
            onClick={() => loadScenario('PHISHING_ONLY')}
          >
            ⚠️ Phishing SMS Only (MEDIUM)
          </button>
          <button
            type="button"
            className="btn-pill-sample"
            onClick={() => loadScenario('LEGITIMATE')}
          >
            🟢 Normal Benign Event (LOW)
          </button>
          <button
            type="button"
            className="btn-pill-sample"
            onClick={() => loadScenario('INSUFFICIENT_DATA')}
          >
            ❓ Insufficient Data Test
          </button>
          <button
            type="button"
            className="btn-pill-sample"
            onClick={() => loadScenario('DB_RECORDS')}
          >
            💾 Seeded User DB Records
          </button>
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
            handleRun()
          }}
        >
          {/* SMS Section */}
          <div className="form-group">
            <label className="form-label">Vector 1: SMS Message Body (Optional / Leave blank if missing)</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="e.g. URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify..."
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              disabled={loading}
            ></textarea>
          </div>

          {/* Transaction Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Transfer Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={txData.amount}
                onChange={(e) => setTxData({ ...txData, amount: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Channel</label>
              <select
                className="form-control"
                value={txData.transaction_type}
                onChange={(e) => setTxData({ ...txData, transaction_type: e.target.value })}
                disabled={loading}
              >
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="IMPS">IMPS</option>
                <option value="RTGS">RTGS</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hour (0-23)</label>
              <input
                type="number"
                className="form-control"
                value={txData.hour}
                onChange={(e) => setTxData({ ...txData, hour: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-control"
                value={txData.location}
                onChange={(e) => setTxData({ ...txData, location: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payee Identifier</label>
              <input
                type="text"
                className="form-control"
                value={txData.beneficiary_identifier}
                onChange={(e) => setTxData({ ...txData, beneficiary_identifier: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Device Identifier</label>
              <input
                type="text"
                className="form-control"
                value={txData.device_identifier}
                onChange={(e) => setTxData({ ...txData, device_identifier: e.target.value })}
                disabled={loading}
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
              <span>Synthesizing Multi-Factor Signals...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Evaluate Multi-Factor Risk Assessment</span>
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="result-card-box">
            {/* Banner */}
            <div
              className={`result-score-banner ${
                result.risk_level === 'HIGH'
                  ? 'score-banner-high'
                  : result.risk_level === 'MEDIUM'
                  ? 'score-banner-medium'
                  : result.risk_level === 'LOW'
                  ? 'score-banner-low'
                  : 'score-banner-medium'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={34} />
                <div>
                  <div className="score-display-label">Composite Risk Rating</div>
                  <strong style={{ fontSize: '1.35rem', textTransform: 'uppercase' }}>
                    {result.risk_level === 'INSUFFICIENT_DATA'
                      ? 'Insufficient Data Provided'
                      : `${result.risk_level} RISK LEVEL`}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {result.risk_score !== null ? (
                  <div className="score-display-number">{result.risk_score}/100</div>
                ) : (
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>N/A</div>
                )}
                <span
                  className={`status-badge ${
                    result.risk_level === 'HIGH'
                      ? 'badge-danger'
                      : result.risk_level === 'MEDIUM'
                      ? 'badge-warning'
                      : result.risk_level === 'LOW'
                      ? 'badge-success'
                      : 'badge-missing'
                  }`}
                  style={{ marginTop: '0.2rem' }}
                >
                  {result.risk_level}
                </span>
              </div>
            </div>

            {/* Alert Generated Banner */}
            {result.alert_id && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <Bell size={24} color="#ef4444" />
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                    Security Alert #{result.alert_id} Generated
                  </strong>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#7f1d1d' }}>
                    {result.alert_created
                      ? 'A persistent security alert was saved in the Security Alerts Center for immediate triage.'
                      : 'An identical alert occurred within the 15-minute deduplication window; alert maintained without duplicate creation.'}
                  </p>
                </div>
              </div>
            )}

            {/* Explainable Signals Breakdown Table */}
            {result.signal_breakdown && (
              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block', marginBottom: '0.6rem' }}>
                  Explainable Signal Breakdown (Scoring Rationales):
                </strong>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Security Signal</th>
                        <th>Status</th>
                        <th>Points</th>
                        <th>Influence</th>
                        <th>Heuristic Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.signal_breakdown).map(([sigKey, sigInfo]) => (
                        <tr key={sigKey} style={{ background: sigInfo.is_missing ? '#fafafc' : '#ffffff' }}>
                          <td style={{ fontWeight: 600 }}>{sigNameMap[sigKey] || sigKey}</td>
                          <td>
                            {sigInfo.is_missing ? (
                              <span className="status-badge badge-missing" style={{ fontSize: '0.65rem' }}>
                                ⚠️ Missing
                              </span>
                            ) : (
                              <span
                                className={`status-badge ${
                                  sigInfo.status === 'suspicious' || sigInfo.status === 'anomalous' || sigInfo.status === 'high'
                                    ? 'badge-danger'
                                    : sigInfo.status === 'new' || sigInfo.status === 'correlated' || sigInfo.status === 'medium'
                                    ? 'badge-warning'
                                    : 'badge-success'
                                }`}
                                style={{ fontSize: '0.65rem' }}
                              >
                                {sigInfo.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: sigInfo.points > 0 ? '#dc2626' : '#64748b' }}>
                              +{sigInfo.points} pts
                            </strong>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#475569' }}>{sigInfo.influence}</td>
                          <td style={{ fontSize: '0.78rem', color: '#334155', maxWidth: '320px' }}>
                            {sigInfo.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Safety Recommendations */}
            {result.safety_recommendations && result.safety_recommendations.length > 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>
                  Actionable Safety Guidance:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {result.safety_recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="advisory-notice-box">
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Heuristic Disclaimer:</strong> {result.disclaimer || 'A risk score is an early-warning assessment derived from multiple heuristic signals. It does NOT prove fraud, does NOT block accounts, and does NOT contact banks.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
