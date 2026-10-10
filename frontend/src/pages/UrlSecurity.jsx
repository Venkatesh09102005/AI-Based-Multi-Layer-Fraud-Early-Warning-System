import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Link as LinkIcon,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  EyeOff,
  Globe,
  Lock,
} from 'lucide-react'

export default function UrlSecurity() {
  const { token, handleUnauthorized } = useAuth()
  const [inputUrl, setInputUrl] = useState('http://192.168.1.100/verify')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const samples = [
    {
      label: '🚨 Raw IP Address (Phishing)',
      val: 'http://192.168.1.100/verify',
    },
    {
      label: '⚠️ Shortened URL Mask',
      val: 'http://bit.ly/claim-bonus',
    },
    {
      label: '🔒 Legitimate HTTPS Link',
      val: 'https://example.com/receipt',
    },
    {
      label: '💬 Text with Embedded Link',
      val: 'Urgent! Complete verification at http://secure-kyc-update.com/login before midnight.',
    },
  ]

  const handleAnalyze = async (overrideUrl = null) => {
    const textToTest = overrideUrl !== null ? overrideUrl : inputUrl
    if (!textToTest.trim()) {
      setError('Please provide a URL or an SMS text containing a link to analyze.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.analyzeUrl(token, {
        message: textToTest.trim(),
        url: textToTest.trim(),
      })
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to analyze URL.')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (val) => {
    setInputUrl(val)
    handleAnalyze(val)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Safe Offline URL Security Analysis</h1>
          <p>
            Structural heuristic analysis inspecting protocol, domain masking, raw IP hosts, and deceptive patterns without making network requests.
          </p>
        </div>
      </div>

      <div className="white-card">
        <div className="card-title-row">
          <h3>
            <LinkIcon size={18} color="#6366f1" />
            Inspect URL or Message with Link
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <EyeOff size={14} /> Zero Network Requests (Safe Offline Evaluation)
          </span>
        </div>

        {/* Quick Samples */}
        <div className="sample-pills-bar">
          <span>Quick Presets:</span>
          {samples.map((s, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample(s.val)}
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
            <label className="form-label">URL or Message Text</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. http://192.168.1.100/verify or paste SMS message"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              disabled={loading}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              The engine safely extracts links via regular expressions and inspects lexical characteristics completely offline.
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !inputUrl.trim()}
          >
            {loading ? (
              <span>Inspecting Heuristic Signals...</span>
            ) : (
              <>
                <ShieldAlert size={16} />
                <span>Evaluate URL Security</span>
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="result-card-box">
            <div
              className={`result-score-banner ${
                result.risk_level === 'high'
                  ? 'score-banner-high'
                  : result.risk_level === 'medium'
                  ? 'score-banner-medium'
                  : 'score-banner-low'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {result.risk_level === 'high' ? (
                  <ShieldAlert size={30} color="#dc2626" />
                ) : (
                  <ShieldCheck size={30} color="#16a34a" />
                )}
                <div>
                  <div className="score-display-label">Heuristic URL Risk</div>
                  <strong style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>
                    {result.risk_level === 'high'
                      ? 'Elevated Phishing / Deceptive Link'
                      : result.risk_level === 'medium'
                      ? 'Suspicious Structural Indicators'
                      : 'Standard Low-Risk URL Structure'}
                  </strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  className={`status-badge ${
                    result.risk_level === 'high'
                      ? 'badge-danger'
                      : result.risk_level === 'medium'
                      ? 'badge-warning'
                      : 'badge-success'
                  }`}
                >
                  {result.risk_level.toUpperCase()}
                </span>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {result.url_found ? 'URL Extracted' : 'No URL Found'}
                </div>
              </div>
            </div>

            {/* Extracted URL Card */}
            {result.extracted_url && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Inspected URL String:</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                    {result.extracted_url}
                  </div>
                </div>
                <span className="status-badge badge-info" style={{ fontSize: '0.65rem' }}>
                  SAFELY PARSED
                </span>
              </div>
            )}

            {/* Identified Risk Indicators */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>
                Detected Heuristic Risk Indicators ({result.indicators?.length || 0}):
              </strong>
              {!result.indicators || result.indicators.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.82rem' }}>
                  <CheckCircle2 size={16} />
                  <span>No suspicious structural indicators detected (valid domain format, HTTPS protocol).</span>
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {result.indicators.map((ind, idx) => (
                    <li key={idx}>{ind}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="advisory-notice-box">
              <HelpCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Zero-Request Guarantee:</strong> URL analysis is executed purely offline using pattern regexes and domain heuristics. The system never connects, executes, or loads resources from the target link.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
