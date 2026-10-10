import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Search,
  Shield,
  PlusCircle,
} from 'lucide-react'

export default function BeneficiarySecurity() {
  const { token, handleUnauthorized } = useAuth()
  const [identifier, setIdentifier] = useState('ACC-DEMO-001')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [beneficiaries, setBeneficiaries] = useState([])
  const [listLoading, setListLoading] = useState(true)

  const fetchBeneficiaries = async () => {
    setListLoading(true)
    try {
      const list = await api.getBeneficiaries(token)
      if (Array.isArray(list)) {
        setBeneficiaries(list)
      }
    } catch (e) {
      if (e.status === 401) handleUnauthorized()
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    fetchBeneficiaries()
  }, [token])

  const handleCheck = async (idToCheck = null) => {
    const val = idToCheck || identifier
    if (!val.trim()) {
      setError('Please provide a beneficiary account identifier.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.checkBeneficiary(token, val.trim())
      setResult(res)
    } catch (err) {
      if (err.status === 401) {
        handleUnauthorized()
        return
      }
      setError(err.message || 'Failed to check beneficiary.')
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
          <h1>Beneficiary Security Signals</h1>
          <p>
            Rule-based early warning signal verifying whether a payee account has historical trust records for your profile.
          </p>
        </div>
      </div>

      <div className="layout-2col">
        {/* Left Column: Verification Form */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <UserCheck size={18} color="#6366f1" />
              Check Payee Account Identifier
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
              onClick={() => loadSample('ACC-DEMO-001')}
            >
              ACC-DEMO-001 (Known)
            </button>
            <button
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample('ACC-DEMO-002')}
            >
              ACC-DEMO-002 (Known)
            </button>
            <button
              type="button"
              className="btn-pill-sample"
              onClick={() => loadSample('ACC-NEW-CRYPTO-99')}
            >
              ACC-NEW-CRYPTO-99 (New)
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
              <label className="form-label">Beneficiary Account Identifier / IBAN</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ACC-DEMO-001"
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
                <span>Checking Database Records...</span>
              ) : (
                <>
                  <Search size={16} />
                  <span>Inspect Beneficiary Trust</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Result */}
          {result && (
            <div className="result-card-box">
              <div
                className={`result-score-banner ${
                  result.beneficiary_status === 'new'
                    ? 'score-banner-medium'
                    : 'score-banner-low'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <UserCheck size={28} />
                  <div>
                    <div className="score-display-label">Payee Status</div>
                    <strong style={{ fontSize: '1.15rem', textTransform: 'uppercase' }}>
                      {result.beneficiary_status === 'new'
                        ? 'New / Unrecognized Payee'
                        : 'Known / Trusted Beneficiary'}
                    </strong>
                  </div>
                </div>
                <div>
                  <span
                    className={`status-badge ${
                      result.beneficiary_status === 'new' ? 'badge-warning' : 'badge-success'
                    }`}
                  >
                    {result.beneficiary_status.toUpperCase()}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#334155', margin: '0.5rem 0' }}>
                {result.message}
              </p>

              {result.beneficiary_id && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Matched Database Record ID: #{result.beneficiary_id}
                </div>
              )}

              <div className="advisory-notice-box">
                <HelpCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Security Signal Notice:</strong> New beneficiary status is an early-warning signal and does NOT prove fraud. Users routinely transfer funds to new payees.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User's Registered Beneficiaries List */}
        <div className="white-card">
          <div className="card-title-row">
            <h3>
              <Shield size={18} color="#16a34a" />
              Registered Beneficiaries
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {beneficiaries.length} Records
            </span>
          </div>

          {listLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Loading registered payees...
            </div>
          ) : beneficiaries.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No registered beneficiaries found in profile.
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Account Identifier</th>
                    <th>Payee Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b) => (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadSample(b.account_number || b.identifier || `ACC-DEMO-${b.id}`)}
                      title="Click to check this beneficiary"
                    >
                      <td style={{ fontWeight: 600 }}>#{b.id}</td>
                      <td>
                        <code>{b.account_number || b.identifier || `ACC-DEMO-${b.id}`}</code>
                      </td>
                      <td>{b.name || 'Payee Record'}</td>
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
