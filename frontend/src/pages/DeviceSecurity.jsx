import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Search,
  Shield,
  Laptop,
} from 'lucide-react'

export default function DeviceSecurity() {
  const { token, handleUnauthorized } = useAuth()
  const [identifier, setIdentifier] = useState('DEV-PIXEL8-DEMO-01')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [devices, setDevices] = useState([])
  const [listLoading, setListLoading] = useState(true)

  const fetchDevices = async () => {
    setListLoading(true)
    try {
      const list = await api.getDevices(token)
      if (Array.isArray(list)) {
        setDevices(list)
      }
    } catch (e) {
      if (e.status === 401) handleUnauthorized()
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [token])

  const handleCheck = async (idToCheck = null) => {
    const val = idToCheck || identifier
    if (!val.trim()) {
      setError('Please provide a device identifier.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.checkDevice(token, val.trim())
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to check device.')
    } finally {
      setLoading(false)
    }
  }

  const loadSample = (sampleId) => {
    setIdentifier(sampleId)
    handleCheck(sampleId)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Device Security Signals</h1>
          <p>
            Hardware fingerprint and originating client verification detecting whether requests originate from recognized devices.
          </p>
        </div>
      </div>

      <div className="layout-2col">
        {/* Left Column: Device Check Form */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <Smartphone size={18} color="#6366f1" />
              Check Originating Device Identifier
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Authentication-Scoped
            </span>
          </div>

          <div className="sample-pills-bar">
            <span>Quick Samples:</span>
            <button
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample('DEV-PIXEL8-DEMO-01')}
            >
              DEV-PIXEL8-DEMO-01 (Known)
            </button>
            <button
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample('DEV-NEW-PROXY-99')}
            >
              DEV-NEW-PROXY-99 (New)
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
              handleCheck()
            }}
          >
            <div className="form-group">
              <label className="form-label">Device Identifier / Fingerprint Token</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. DEV-PIXEL8-DEMO-01"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !identifier.trim()}
            >
              {loading ? (
                <span>Checking Device Trust Table...</span>
              ) : (
                <>
                  <Search size={16} />
                  <span>Inspect Device Trust</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Result */}
          {result && (
            <div className="result-card-box">
              <div
                className={`result-score-banner ${
                  result.device_status === 'new'
                    ? 'score-banner-medium'
                    : 'score-banner-low'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Smartphone size={28} />
                  <div>
                    <div className="score-display-label">Device Verification</div>
                    <strong style={{ fontSize: '1.15rem', textTransform: 'uppercase' }}>
                      {result.device_status === 'new'
                        ? 'New / Unrecognized Device'
                        : 'Known / Registered Device'}
                    </strong>
                  </div>
                </div>
                <div>
                  <span
                    className={`status-badge ${
                      result.device_status === 'new' ? 'badge-warning' : 'badge-success'
                    }`}
                  >
                    {result.device_status.toUpperCase()}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#334155', margin: '0.5rem 0' }}>
                {result.message}
              </p>

              {result.device_id && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Matched Database Record ID: #{result.device_id}
                </div>
              )}

              <div className="advisory-notice-box">
                <HelpCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Security Signal Notice:</strong> New device status is an advisory signal and does NOT prove fraud. Users regularly upgrade hardware, switch browsers, or connect from travel devices.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User's Registered Devices List */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <Laptop size={18} color="#2563eb" />
              Registered Devices
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {devices.length} Records
            </span>
          </div>

          {listLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Loading registered devices...
            </div>
          ) : devices.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No registered devices found in profile.
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Device Identifier</th>
                    <th>Device Name / Model</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr
                      key={d.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadSample(d.device_identifier || d.identifier || `DEV-PIXEL8-${d.id}`)}
                      title="Click to check this device"
                    >
                      <td style={{ fontWeight: 600 }}>#{d.id}</td>
                      <td>
                        <code>{d.device_identifier || d.identifier || `DEV-PIXEL8-${d.id}`}</code>
                      </td>
                      <td>{d.device_name || d.name || 'Personal Mobile / PC'}</td>
                      <td>
                        <span className="status-badge badge-success" style={{ fontSize: '0.65rem' }}>
                          TRUSTED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
