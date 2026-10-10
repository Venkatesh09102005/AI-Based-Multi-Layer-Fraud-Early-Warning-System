import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

export default function SmsAnalysis() {
  const { token, handleUnauthorized } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const samples = [
    {
      label: '🚨 KYC Phishing Attack',
      text: 'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.',
    },
    {
      label: '🎁 Prize Bonus Scam',
      text: 'Congratulations! You have won a cash reward of Rs 50,000. Click http://bit.ly/claim-bonus to claim your prize today.',
    },
    {
      label: '⚡ Utility Disconnection',
      text: 'Dear customer, your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Call 9876543210.',
    },
    {
      label: '✅ Legitimate Bill Receipt',
      text: 'Your electricity bill payment of Rs 850 was successful. Reference ID: TXN-BILL-88291. Thank you.',
    },
  ]

  const handleAnalyze = async (overrideText = null) => {
    const textToAnalyze = overrideText !== null ? overrideText : message
    if (!textToAnalyze.trim()) {
      setError('Please enter or select an SMS message to analyze.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.predictSms(token, textToAnalyze.trim())
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to analyze SMS message.')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sampleText) => {
    setMessage(sampleText)
    handleAnalyze(sampleText)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>SMS Scam &amp; Phishing Detection</h1>
          <p>
            Machine learning classifier using TF-IDF and Logistic Regression to detect social engineering, lottery frauds, and urgent phishing messages.
          </p>
        </div>
      </div>

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <MessageSquare size={18} color="#6366f1" />
            Inspect Inbound SMS Message
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Model: TF-IDF + Logistic Regression
          </span>
        </div>

        {/* Quick Sample Buttons */}
        <div className="sample-pills-bar">
          <span>Quick Samples:</span>
          {samples.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample(s.text)}
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
          <div className="form-group">
            <label className="form-label">SMS Message Body</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Paste SMS content or click a sample above..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            ></textarea>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Analyzes vocabulary, urgent call-to-actions, and suspicious links offline.</span>
              <span>{message.length} characters</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <span>Evaluating TF-IDF Model...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Run Scam Detection</span>
              </>
            )}
          </button>
        </form>

        {/* Analysis Results */}
        {result && (
          <div className="result-card-box">
            <div
              className={`result-score-banner ${
                result.prediction === 'suspicious'
                  ? 'score-banner-high'
                  : 'score-banner-low'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {result.prediction === 'suspicious' ? (
                  <ShieldAlert size={32} color="#dc2626" />
                ) : (
                  <ShieldCheck size={32} color="#16a34a" />
                )}
                <div>
                  <div className="score-display-label">Classification Verdict</div>
                  <strong style={{ fontSize: '1.25rem', textTransform: 'uppercase' }}>
                    {result.prediction === 'suspicious'
                      ? 'Suspicious / Potential Scam'
                      : 'Normal Transactional Message'}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  className={`status-badge ${
                    result.prediction === 'suspicious' ? 'badge-danger' : 'badge-success'
                  }`}
                >
                  {result.risk_level} RISK
                </span>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Confidence: {(result.confidence_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Confidence Progress Meter */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.3rem' }}>
                <span>Model Confidence Score</span>
                <strong>{(result.confidence_score * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${result.confidence_score * 100}%`,
                    background:
                      result.prediction === 'suspicious'
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #3b82f6, #22c55e)',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                ></div>
              </div>
            </div>

            {/* Explanation & Safety Guidance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Detection Rationale:</strong>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.3rem 0 0 0', lineHeight: 1.45 }}>
                  {result.prediction === 'suspicious'
                    ? 'Elevated risk detected due to high-weight scam vocabulary patterns, urgency indicators, and embedded verification directives.'
                    : 'The linguistic structure corresponds to benign routine banking notifications, utility updates, or informational alerts.'}
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Advisory Action:</strong>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.3rem 0 0 0', lineHeight: 1.45 }}>
                  {result.prediction === 'suspicious'
                    ? 'Do NOT click embedded links or call numbers provided in this message. Confirm account status directly via official channels.'
                    : 'No anomalous scam indicators recognized. Exercise standard caution when sharing private OTP codes.'}
                </p>
              </div>
            </div>

            <div className="advisory-notice-box">
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Heuristic Notice:</strong> SMS classification is an early-warning signal based on natural language patterns. It does not definitively prove intent or fraud.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
