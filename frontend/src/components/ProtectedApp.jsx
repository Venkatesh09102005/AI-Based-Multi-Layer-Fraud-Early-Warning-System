import { useState, useEffect } from 'react'

function ProtectedApp({ token, user, onLogout }) {
  const [data, setData] = useState(null)
  const [dbStats, setDbStats] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  // Phase 2: SMS Scam Detection state
  const [smsInput, setSmsInput] = useState('')
  const [smsResult, setSmsResult] = useState(null)
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState('')

  // Phase 3: Transaction Anomaly Detection state
  const [txForm, setTxForm] = useState({
    amount: '450',
    transaction_type: 'UPI',
    hour: '14',
    day_of_week: '2',
    location: 'Mumbai',
    beneficiary_id: '1',
    device_id: '1',
    beneficiary_identifier: 'ACC-DEMO-001',
    device_identifier: 'DEV-PIXEL8-DEMO-01',
  })
  const [txResult, setTxResult] = useState(null)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  // Phase 4: Security Context Check (Beneficiary + Device) state
  const [benInput, setBenInput] = useState('ACC-DEMO-001')
  const [devInput, setDevInput] = useState('DEV-PIXEL8-DEMO-01')
  const [secResult, setSecResult] = useState(null)
  const [secLoading, setSecLoading] = useState(false)
  const [secError, setSecError] = useState('')

  // Phase 5: Security Analysis (Time Correlation + URL Analysis) state
  const [secSmsInput, setSecSmsInput] = useState(
    'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.'
  )
  const [secTxTimeInput, setSecTxTimeInput] = useState('2026-10-07T10:12:00')
  const [secAnalysisResult, setSecAnalysisResult] = useState(null)
  const [secAnalysisLoading, setSecAnalysisLoading] = useState(false)
  const [secAnalysisError, setSecAnalysisError] = useState('')

  // Phase 6: Combined Multi-Factor Risk Assessment state
  const [riskSmsText, setRiskSmsText] = useState(
    'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.'
  )
  const [riskTxData, setRiskTxData] = useState({
    amount: '450000',
    transaction_type: 'UPI',
    hour: '3',
    day_of_week: '2',
    location: 'St. Petersburg',
    beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
    device_identifier: 'DEV-NEW-PROXY-99',
    transaction_time: '2026-10-07T10:12:00',
  })
  const [riskAssessmentResult, setRiskAssessmentResult] = useState(null)
  const [riskAssessmentLoading, setRiskAssessmentLoading] = useState(false)
  const [riskAssessmentError, setRiskAssessmentError] = useState('')

  // Phase 7: Security Alerts Center state
  const [alerts, setAlerts] = useState([])
  const [alertsFilter, setAlertsFilter] = useState('ALL') // 'ALL' | 'NEW' | 'REVIEWED' | 'DISMISSED'
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')

  // Phase 7: Chronological Activity / Fraud Timeline state
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState('')

  // Phase 8: Security Dashboard & User Feedback state
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'labs' | 'alerts'
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [feedbackSubmittingId, setFeedbackSubmittingId] = useState(null)

  const handleUnauthorized = () => {
    console.warn('Session expired or unauthorized. Logging out...')
    if (onLogout) {
      onLogout()
    }
  }

  const fetchDashboard = async () => {
    setDashboardLoading(true)
    setDashboardError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/dashboard/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to load dashboard: HTTP ${res.status}`)
      }
      const data = await res.json()
      setDashboardData(data)
    } catch (err) {
      setDashboardError(err.message || 'Error loading dashboard metrics')
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleFeedback = async (alertId, feedbackValue) => {
    setFeedbackSubmittingId(alertId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/alerts/${alertId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback: feedbackValue }),
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Failed to submit feedback: HTTP ${res.status}`)
      }
      fetchAlerts()
      fetchDashboard()
    } catch (err) {
      alert(`Feedback error: ${err.message}`)
    } finally {
      setFeedbackSubmittingId(null)
    }
  }

  const renderFeedbackButtons = (al) => {
    const currentFeedback = al.feedback
    const isSubmitting = feedbackSubmittingId === al.id

    return (
      <div className="feedback-actions-bar">
        <span className="feedback-label">Feedback:</span>
        {currentFeedback && (
          <span className={`feedback-status-pill pill-${currentFeedback.toLowerCase()}`}>
            {currentFeedback === 'useful' && '👍 Useful'}
            {currentFeedback === 'incorrect' && '👎 Incorrect'}
            {currentFeedback === 'reviewed' && '👁️ Reviewed'}
          </span>
        )}
        <button
          type="button"
          className={`btn-feedback ${currentFeedback === 'useful' ? 'active-useful' : ''}`}
          onClick={() => handleFeedback(al.id, 'useful')}
          disabled={isSubmitting}
          title="Mark alert as useful risk detection"
        >
          👍 Useful
        </button>
        <button
          type="button"
          className={`btn-feedback ${currentFeedback === 'incorrect' ? 'active-incorrect' : ''}`}
          onClick={() => handleFeedback(al.id, 'incorrect')}
          disabled={isSubmitting}
          title="Mark alert as incorrect / false alarm"
        >
          👎 Incorrect
        </button>
        <button
          type="button"
          className={`btn-feedback ${currentFeedback === 'reviewed' ? 'active-reviewed' : ''}`}
          onClick={() => handleFeedback(al.id, 'reviewed')}
          disabled={isSubmitting}
          title="Acknowledge alert as reviewed"
        >
          👁️ Reviewed
        </button>
      </div>
    )
  }

  const fetchAlerts = async (statusFilter = alertsFilter) => {
    setAlertsLoading(true)
    setAlertsError('')
    try {
      const url = statusFilter && statusFilter !== 'ALL'
        ? `http://127.0.0.1:8000/api/alerts?status=${statusFilter}`
        : 'http://127.0.0.1:8000/api/alerts'
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to load alerts: HTTP ${res.status}`)
      }
      const data = await res.json()
      setAlerts(data)
    } catch (err) {
      setAlertsError(err.message || 'Error loading alerts')
    } finally {
      setAlertsLoading(false)
    }
  }

  const handleReviewAlert = async (alertId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/alerts/${alertId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to review alert: HTTP ${res.status}`)
      }
      fetchAlerts()
      fetchTimeline()
      fetchDashboard()
    } catch (err) {
      alert(`Error updating alert: ${err.message}`)
    }
  }

  const handleDismissAlert = async (alertId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to dismiss alert: HTTP ${res.status}`)
      }
      fetchAlerts()
      fetchTimeline()
      fetchDashboard()
    } catch (err) {
      alert(`Error updating alert: ${err.message}`)
    }
  }

  const fetchTimeline = async () => {
    setTimelineLoading(true)
    setTimelineError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/timeline', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to load timeline: HTTP ${res.status}`)
      }
      const data = await res.json()
      setTimelineEvents(data)
    } catch (err) {
      setTimelineError(err.message || 'Error loading security timeline')
    } finally {
      setTimelineLoading(false)
    }
  }

  const fetchBackendStatus = async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      // 1. Check Phase 0 public root endpoint
      const response = await fetch('http://127.0.0.1:8000/')
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }
      const json = await response.json()
      setData(json)
      setStatus('success')

      // 2. Fetch Phase 1 database summary counts (Protected endpoint)
      try {
        const statsRes = await fetch('http://127.0.0.1:8000/api/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (statsRes.status === 401) {
          handleUnauthorized()
          return
        }
        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          setDbStats(statsJson)
        }
      } catch (statsErr) {
        console.warn('Could not fetch DB stats:', statsErr)
      }
    } catch (err) {
      setData(null)
      setDbStats(null)
      setStatus('error')
      setErrorMessage(
        err.message || 'Unable to connect to backend at http://127.0.0.1:8000/'
      )
    }
  }

  // Phase 2: Handle SMS Analysis (Protected)
  const handleAnalyzeSms = async () => {
    if (!smsInput.trim()) {
      setSmsError('Please enter an SMS message to analyze.')
      return
    }

    setSmsLoading(true)
    setSmsError('')
    setSmsResult(null)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/sms/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: smsInput }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.detail || `Server returned error status ${res.status}`
        )
      }

      const result = await res.json()
      setSmsResult(result)
    } catch (err) {
      setSmsError(err.message || 'Failed to analyze SMS message.')
    } finally {
      setSmsLoading(false)
    }
  }

  const loadSmsSample = (sampleText) => {
    setSmsInput(sampleText)
    setSmsResult(null)
    setSmsError('')
  }

  // Phase 3: Handle Transaction Analysis (Protected)
  const handleAnalyzeTransaction = async () => {
    const amountVal = parseFloat(txForm.amount)
    if (isNaN(amountVal) || amountVal <= 0) {
      setTxError('Amount must be a positive number greater than 0.')
      return
    }

    setTxLoading(true)
    setTxError('')
    setTxResult(null)

    try {
      const payload = {
        amount: amountVal,
        transaction_type: txForm.transaction_type,
        hour: parseInt(txForm.hour, 10),
        day_of_week: parseInt(txForm.day_of_week, 10),
        location: txForm.location.trim() || 'Unknown',
        beneficiary_id: txForm.beneficiary_id ? parseInt(txForm.beneficiary_id, 10) : 0,
        device_id: txForm.device_id ? parseInt(txForm.device_id, 10) : 0,
        beneficiary_identifier: txForm.beneficiary_identifier?.trim() || null,
        device_identifier: txForm.device_identifier?.trim() || null,
      }

      const res = await fetch('http://127.0.0.1:8000/api/transactions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.detail || `Server returned error status ${res.status}`
        )
      }

      const result = await res.json()
      setTxResult(result)
    } catch (err) {
      setTxError(err.message || 'Failed to analyze transaction.')
    } finally {
      setTxLoading(false)
    }
  }

  const loadTxSample = (sampleData) => {
    setTxForm(sampleData)
    setTxResult(null)
    setTxError('')
  }

  // Phase 4: Handle Beneficiary Check (Protected)
  const handleCheckBeneficiary = async () => {
    if (!benInput.trim()) {
      setSecError('Please enter a beneficiary account identifier.')
      return
    }

    setSecLoading(true)
    setSecError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/beneficiaries/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ account_identifier: benInput.trim() }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const benData = await res.json()
      setSecResult((prev) => ({
        ...prev,
        beneficiary_status: benData.beneficiary_status,
        beneficiary_id: benData.beneficiary_id,
        message: benData.message,
      }))
    } catch (err) {
      setSecError(err.message || 'Failed to check beneficiary.')
    } finally {
      setSecLoading(false)
    }
  }

  // Phase 4: Handle Device Check (Protected)
  const handleCheckDevice = async () => {
    if (!devInput.trim()) {
      setSecError('Please enter a device identifier.')
      return
    }

    setSecLoading(true)
    setSecError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/devices/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ device_identifier: devInput.trim() }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const devData = await res.json()
      setSecResult((prev) => ({
        ...prev,
        device_status: devData.device_status,
        device_id: devData.device_id,
        message: devData.message,
      }))
    } catch (err) {
      setSecError(err.message || 'Failed to check device.')
    } finally {
      setSecLoading(false)
    }
  }

  // Phase 4: Handle Combined Security Context Check (Protected)
  const handleCheckSecurityContext = async () => {
    if (!benInput.trim() || !devInput.trim()) {
      setSecError('Please enter both beneficiary account identifier and device identifier.')
      return
    }

    setSecLoading(true)
    setSecError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/context-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          beneficiary_identifier: benInput.trim(),
          device_identifier: devInput.trim(),
        }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const result = await res.json()
      setSecResult(result)
    } catch (err) {
      setSecError(err.message || 'Failed to check security context.')
    } finally {
      setSecLoading(false)
    }
  }

  const loadSecSample = (ben, dev) => {
    setBenInput(ben)
    setDevInput(dev)
    setSecResult(null)
    setSecError('')
  }

  // Phase 5: Time Correlation only
  const handleCheckTimeCorrelation = async () => {
    if (!secTxTimeInput.trim()) {
      setSecAnalysisError('Please enter a transaction timestamp.')
      return
    }

    setSecAnalysisLoading(true)
    setSecAnalysisError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/time-correlation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transaction_time: secTxTimeInput.trim() }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const data = await res.json()
      setSecAnalysisResult((prev) => ({
        ...prev,
        time_correlation: data.time_correlation,
        time_difference_minutes: data.time_difference_minutes,
        message: data.message,
      }))
    } catch (err) {
      setSecAnalysisError(err.message || 'Failed to check time correlation.')
    } finally {
      setSecAnalysisLoading(false)
    }
  }

  // Phase 5: URL Analysis only
  const handleCheckUrlAnalysis = async () => {
    if (!secSmsInput.trim()) {
      setSecAnalysisError('Please enter an SMS message to inspect for URLs.')
      return
    }

    setSecAnalysisLoading(true)
    setSecAnalysisError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/url-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: secSmsInput.trim() }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const data = await res.json()
      setSecAnalysisResult((prev) => ({
        ...prev,
        url_found: data.url_found,
        url: data.url,
        url_risk_level: data.risk_level,
        url_indicators: data.indicators,
        message: data.message,
      }))
    } catch (err) {
      setSecAnalysisError(err.message || 'Failed to analyze URL.')
    } finally {
      setSecAnalysisLoading(false)
    }
  }

  // Phase 5: Combined Security Analysis (Time Correlation + URL Analysis)
  const handleAnalyzeSecuritySignals = async () => {
    if (!secSmsInput.trim() || !secTxTimeInput.trim()) {
      setSecAnalysisError('Please enter both SMS message text and transaction timestamp.')
      return
    }

    setSecAnalysisLoading(true)
    setSecAnalysisError('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: secSmsInput.trim(),
          transaction_time: secTxTimeInput.trim(),
        }),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const result = await res.json()
      setSecAnalysisResult(result)
    } catch (err) {
      setSecAnalysisError(err.message || 'Failed to analyze security signals.')
    } finally {
      setSecAnalysisLoading(false)
    }
  }

  const loadSignalSample = (smsText, txTime) => {
    setSecSmsInput(smsText)
    setSecTxTimeInput(txTime)
    setSecAnalysisResult(null)
    setSecAnalysisError('')
  }

  // Phase 6: Handle Combined Multi-Factor Risk Assessment (Protected)
  const handleRunRiskAssessment = async (overridePayload = null) => {
    setRiskAssessmentLoading(true)
    setRiskAssessmentError('')

    let payload = overridePayload
    if (!payload) {
      const hasSms = Boolean(riskSmsText && riskSmsText.trim())
      const hasTxAmount = Boolean(riskTxData.amount && riskTxData.amount.toString().trim())

      payload = {
        sms_text: hasSms ? riskSmsText.trim() : undefined,
        transaction_data: hasTxAmount ? {
          amount: parseFloat(riskTxData.amount),
          transaction_type: riskTxData.transaction_type,
          hour: parseInt(riskTxData.hour || '0', 10),
          day_of_week: parseInt(riskTxData.day_of_week || '0', 10),
          location: riskTxData.location || 'Unknown',
          beneficiary_identifier: (riskTxData.beneficiary_identifier || '').trim() || undefined,
          device_identifier: (riskTxData.device_identifier || '').trim() || undefined,
          transaction_time: (riskTxData.transaction_time || '').trim() || undefined,
        } : undefined,
        beneficiary_identifier: (riskTxData.beneficiary_identifier || '').trim() || undefined,
        device_identifier: (riskTxData.device_identifier || '').trim() || undefined,
        transaction_time: (riskTxData.transaction_time || '').trim() || undefined,
        window_minutes: 30,
      }
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/security/risk-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.detail || `Error status ${res.status}`)
      }

      const result = await res.json()
      setRiskAssessmentResult(result)
      fetchDashboard()
      if (result.alert_id) {
        fetchAlerts()
        fetchTimeline()
      }
    } catch (err) {
      setRiskAssessmentError(err.message || 'Failed to evaluate multi-factor risk assessment.')
    } finally {
      setRiskAssessmentLoading(false)
    }
  }

  const loadRiskScenario = (type) => {
    setRiskAssessmentError('')
    if (type === 'HIGH_ATTACK') {
      setRiskSmsText('URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.')
      setRiskTxData({
        amount: '450000',
        transaction_type: 'UPI',
        hour: '3',
        day_of_week: '2',
        location: 'St. Petersburg',
        beneficiary_identifier: 'ACC-NEW-CRYPTO-99',
        device_identifier: 'DEV-NEW-PROXY-99',
        transaction_time: '2026-10-07T10:12:00',
      })
      handleRunRiskAssessment({
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
      })
    } else if (type === 'PHISHING_ONLY') {
      setRiskSmsText('Claim your prize bonus immediately at http://bit.ly/claim-bonus')
      setRiskTxData({
        amount: '',
        transaction_type: 'UPI',
        hour: '14',
        day_of_week: '2',
        location: '',
        beneficiary_identifier: '',
        device_identifier: '',
        transaction_time: '',
      })
      handleRunRiskAssessment({
        sms_text: 'Claim your prize bonus immediately at http://bit.ly/claim-bonus',
      })
    } else if (type === 'CLEAN_PAYMENT') {
      setRiskSmsText('Your electricity bill of Rs 850 was paid successfully.')
      setRiskTxData({
        amount: '120',
        transaction_type: 'UPI',
        hour: '14',
        day_of_week: '2',
        location: 'Mumbai',
        beneficiary_identifier: 'ACC-DEMO-001',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
        transaction_time: '2026-10-06T14:00:00',
      })
      handleRunRiskAssessment({
        sms_text: 'Your electricity bill of Rs 850 was paid successfully.',
        transaction_data: {
          amount: 120,
          transaction_type: 'UPI',
          hour: 14,
          day_of_week: 2,
          location: 'Mumbai',
          beneficiary_identifier: 'ACC-DEMO-001',
          device_identifier: 'DEV-PIXEL8-DEMO-01',
          transaction_time: '2026-10-06T14:00:00',
        },
        beneficiary_identifier: 'ACC-DEMO-001',
        device_identifier: 'DEV-PIXEL8-DEMO-01',
        transaction_time: '2026-10-06T14:00:00',
      })
    } else if (type === 'INSUFFICIENT_DATA') {
      setRiskSmsText('')
      setRiskTxData({
        amount: '',
        transaction_type: 'UPI',
        hour: '',
        day_of_week: '',
        location: '',
        beneficiary_identifier: '',
        device_identifier: '',
        transaction_time: '',
      })
      handleRunRiskAssessment({})
    } else if (type === 'DB_RECORDS') {
      setRiskSmsText('(Referencing Demo User SMS #7 & Tx #9 from Database)')
      handleRunRiskAssessment({
        sms_id: 7,
        transaction_id: 9,
      })
    }
  }

  useEffect(() => {
    fetchBackendStatus()
    fetchAlerts()
    fetchTimeline()
    fetchDashboard()
  }, [])

  return (
    <div className="container">
      {/* User Header / Session Bar */}
      <div className="user-session-bar">
        <div className="user-info-badge">
          <span className="user-avatar-icon">👤</span>
          <div>
            <span className="user-name-text">{user?.name || 'Authenticated User'}</span>
            <span className="user-email-text">{user?.email}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="btn-logout"
          title="Sign out of your session"
        >
          Logout
        </button>
      </div>

      <header className="header">
        <h1>Fraud Warning System</h1>
        <p className="subtitle">
          AI-Based Multi-Layer Fraud Early Warning System
        </p>
      </header>

      <main className="card">
        {/* Main Navigation Tabs */}
        <div className="dashboard-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Security Dashboard
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'labs' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('labs')}
          >
            🔍 Detection Labs &amp; Testing
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'alerts' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🚨 Alerts Center &amp; Timeline
          </button>
        </div>

        {/* =========================================================================
            TAB 1: EXECUTIVE SECURITY DASHBOARD (PHASE 8)
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-section">
            <div className="alerts-header-row">
              <div>
                <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: 0 }}>
                  Security Operations Dashboard
                </h2>
                <p className="section-desc" style={{ margin: '0.25rem 0 0 0' }}>
                  Real-time multi-factor fraud detection intelligence, risk assessment distribution, and advisory guidance.
                </p>
              </div>
              <button
                type="button"
                className="chip-btn"
                onClick={fetchDashboard}
                disabled={dashboardLoading}
              >
                {dashboardLoading ? 'Refreshing...' : '🔄 Refresh Dashboard'}
              </button>
            </div>

            {dashboardError && <div className="error-msg">{dashboardError}</div>}

            {dashboardLoading && !dashboardData ? (
              <div className="status-box loading">
                <span className="indicator-dot loading"></span>
                <p>Aggregating security metrics and assessment telemetry...</p>
              </div>
            ) : (
              <>
                {/* 1. Top Metrics Summary Grid */}
                {(() => {
                  const total = dashboardData?.risk_assessments?.total || 0
                  const high = dashboardData?.risk_assessments?.high || 0
                  const med = dashboardData?.risk_assessments?.medium || 0
                  const low = dashboardData?.risk_assessments?.low || 0
                  const highPct = total > 0 ? (high / total) * 100 : 0
                  const medPct = total > 0 ? (med / total) * 100 : 0
                  const lowPct = total > 0 ? (low / total) * 100 : 0

                  const alertsTotal = dashboardData?.alerts_summary?.total || 0
                  const alertsNew = dashboardData?.alerts_summary?.new || 0
                  const alertsReviewed = dashboardData?.alerts_summary?.reviewed || 0
                  const alertsDismissed = dashboardData?.alerts_summary?.dismissed || 0

                  const usefulFb = dashboardData?.alerts_summary?.feedback_useful || 0
                  const incorrectFb = dashboardData?.alerts_summary?.feedback_incorrect || 0
                  const reviewedFb = dashboardData?.alerts_summary?.feedback_reviewed || 0
                  const totalFb = usefulFb + incorrectFb + reviewedFb

                  const txTotal = dashboardData?.transactions_summary?.total || 0

                  return (
                    <div className="metrics-summary-grid">
                      {/* Metric 1: Risk Assessments Distribution */}
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <span className="metric-title">Risk Assessments</span>
                          <span className="metric-icon-small">📈</span>
                        </div>
                        <div className="metric-primary-val">{total}</div>
                        <div className="metric-progress-bar">
                          <div className="bar-segment-high" style={{ width: `${highPct}%` }} title={`High: ${high}`} />
                          <div className="bar-segment-med" style={{ width: `${medPct}%` }} title={`Medium: ${med}`} />
                          <div className="bar-segment-low" style={{ width: `${lowPct}%` }} title={`Low: ${low}`} />
                        </div>
                        <div className="metric-subchips-row">
                          <span className="metric-subchip subchip-high">🔴 High: {high}</span>
                          <span className="metric-subchip subchip-med">🟡 Med: {med}</span>
                          <span className="metric-subchip subchip-low">🟢 Low: {low}</span>
                        </div>
                      </div>

                      {/* Metric 2: Security Alerts Lifecycle */}
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <span className="metric-title">Security Alerts</span>
                          <span className="metric-icon-small">🚨</span>
                        </div>
                        <div className="metric-primary-val">{alertsTotal}</div>
                        <div className="metric-subchips-row">
                          <span className="metric-subchip subchip-high">New: {alertsNew}</span>
                          <span className="metric-subchip subchip-med">Reviewed: {alertsReviewed}</span>
                          <span className="metric-subchip subchip-muted">Dismissed: {alertsDismissed}</span>
                        </div>
                      </div>

                      {/* Metric 3: User Feedback Metrics */}
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <span className="metric-title">Alert Feedback</span>
                          <span className="metric-icon-small">💬</span>
                        </div>
                        <div className="metric-primary-val">{totalFb}</div>
                        <div className="metric-subchips-row">
                          <span className="metric-subchip subchip-low">👍 Useful: {usefulFb}</span>
                          <span className="metric-subchip subchip-high">👎 Incorrect: {incorrectFb}</span>
                          <span className="metric-subchip subchip-med">👁️ Reviewed: {reviewedFb}</span>
                        </div>
                      </div>

                      {/* Metric 4: Monitored Transactions */}
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <span className="metric-title">Transactions</span>
                          <span className="metric-icon-small">💳</span>
                        </div>
                        <div className="metric-primary-val">{txTotal}</div>
                        <div className="metric-subchips-row">
                          <span className="metric-subchip subchip-muted">Monitored Records</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 2. Advisory Safety Recommendations */}
                {dashboardData?.safety_recommendations && dashboardData.safety_recommendations.length > 0 && (
                  <div className="safety-recommendations-panel">
                    <div className="safety-panel-header">
                      <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                      <h3>Active Safety Recommendations (Advisory Guidance)</h3>
                    </div>
                    <div className="recs-grid">
                      {dashboardData.safety_recommendations.map((rec, idx) => {
                        const pClass =
                          rec.priority === 'HIGH'
                            ? 'priority-high'
                            : rec.priority === 'MEDIUM'
                            ? 'priority-medium'
                            : 'priority-low'
                        const icon = rec.priority === 'HIGH' ? '🚨' : rec.priority === 'MEDIUM' ? '⚠️' : '💡'
                        return (
                          <div key={idx} className="rec-card">
                            <div className="rec-card-top">
                              <div className="rec-title-group">
                                <span className="rec-icon">{icon}</span>
                                <span className="rec-title-text">{rec.title}</span>
                              </div>
                              <span className={`rec-priority-badge ${pClass}`}>{rec.priority}</span>
                            </div>
                            <p className="rec-advice-text">{rec.action || rec.description}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="sec-safety-disclaimer" style={{ marginTop: '0.85rem' }}>
                      ℹ️ <strong>Advisory Disclaimer:</strong> {dashboardData?.disclaimer || 'Safety recommendations are advisory guidance based on detected signals. The system never blocks accounts, transfers funds, or contacts banks.'}
                    </div>
                  </div>
                )}

                {/* 3. Two-Column Row: Recent Alerts & Recent Transactions */}
                <div className="dashboard-grid-2col">
                  {/* Left Column: Recent Security Alerts with Feedback */}
                  <div className="dashboard-panel-card">
                    <div className="panel-card-header">
                      <h3>Recent Security Alerts</h3>
                      <button
                        type="button"
                        className="chip-btn"
                        onClick={() => setActiveTab('alerts')}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                      >
                        View All Alerts →
                      </button>
                    </div>

                    {(!dashboardData?.recent_alerts || dashboardData.recent_alerts.length === 0) ? (
                      <div className="status-box" style={{ background: '#f8fafc', color: '#64748b' }}>
                        <p>No active security alerts on record.</p>
                      </div>
                    ) : (
                      <div className="alerts-grid">
                        {dashboardData.recent_alerts.map((al) => (
                          <div
                            key={al.id}
                            className={`alert-card status-card-${(al.status || 'new').toLowerCase()}`}
                          >
                            <div className="alert-card-header">
                              <div className="alert-badges-group">
                                <span className="alert-id-tag">#{al.id}</span>
                                <span className="alert-type-badge">{al.alert_type}</span>
                                <span
                                  className={`prediction-badge ${
                                    al.risk_level === 'HIGH' ? 'badge-suspicious' : 'badge-new'
                                  }`}
                                >
                                  {al.risk_level}
                                </span>
                              </div>
                              <span className={`alert-status-badge alert-status-${(al.status || 'new').toLowerCase()}`}>
                                {al.status || 'NEW'}
                              </span>
                            </div>
                            <p className="alert-message">{al.message}</p>
                            <span className="alert-timestamp">
                              📅 {al.created_at ? new Date(al.created_at).toLocaleString() : 'Timestamp not recorded'}
                            </span>
                            {renderFeedbackButtons(al)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Recent Monitored Transactions */}
                  <div className="dashboard-panel-card">
                    <div className="panel-card-header">
                      <h3>Recent Monitored Transactions</h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Latest 5</span>
                    </div>

                    {(!dashboardData?.recent_transactions || dashboardData.recent_transactions.length === 0) ? (
                      <div className="status-box" style={{ background: '#f8fafc', color: '#64748b' }}>
                        <p>No transactions found for this account.</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="recent-tx-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Type</th>
                              <th>Beneficiary</th>
                              <th>Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.recent_transactions.map((tx) => (
                              <tr key={tx.id}>
                                <td>#{tx.id}</td>
                                <td>{tx.transaction_time ? new Date(tx.transaction_time).toLocaleDateString() : 'N/A'}</td>
                                <td
                                  className={
                                    tx.amount > 50000
                                      ? 'tx-amount-high'
                                      : tx.amount > 10000
                                      ? 'tx-amount-med'
                                      : 'tx-amount-normal'
                                  }
                                >
                                  ₹{Number(tx.amount).toLocaleString()}
                                </td>
                                <td>{tx.transaction_type}</td>
                                <td>{tx.beneficiary_identifier || `ID ${tx.beneficiary_id || 'N/A'}`}</td>
                                <td>{tx.device_identifier || `ID ${tx.device_id || 'N/A'}`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Recent Activity Timeline Stream */}
                <div className="dashboard-panel-card">
                  <div className="panel-card-header">
                    <h3>Recent Security Activity</h3>
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={() => setActiveTab('alerts')}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      View Full Activity Timeline →
                    </button>
                  </div>

                  {(!dashboardData?.recent_activity || dashboardData.recent_activity.length === 0) ? (
                    <div className="status-box" style={{ background: '#f8fafc', color: '#64748b' }}>
                      <p>No security activity recorded yet.</p>
                    </div>
                  ) : (
                    <div className="timeline-stream">
                      {dashboardData.recent_activity.map((ev) => {
                        const iconMap = {
                          SMS: '💬',
                          TRANSACTION: '💳',
                          BENEFICIARY: '👤',
                          DEVICE: '📱',
                          ALERT: '🚨',
                        }
                        const icon = iconMap[ev.entity_type] || '📌'
                        return (
                          <div key={ev.event_id} className="timeline-event-card">
                            <div className="timeline-icon-bubble">{icon}</div>
                            <div className="timeline-body">
                              <div className="timeline-top-row">
                                <span className="timeline-event-title">{ev.title}</span>
                                {ev.timestamp_available ? (
                                  <span className="timeline-timestamp-chip">
                                    🕒 {new Date(ev.timestamp).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="timeline-timestamp-chip timeline-timestamp-missing">
                                    ⚠️ Timestamp Unavailable
                                  </span>
                                )}
                              </div>
                              <p className="timeline-event-desc">{ev.description}</p>
                              <div className="timeline-meta-tags">
                                <span className="meta-chip">Type: {ev.entity_type}</span>
                                {ev.severity && (
                                  <span
                                    className={`meta-chip ${
                                      ev.severity === 'HIGH'
                                        ? 'badge-suspicious'
                                        : ev.severity === 'MEDIUM'
                                        ? 'badge-new'
                                        : ''
                                    }`}
                                  >
                                    Severity: {ev.severity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Advisory Safety Banner */}
                <div className="sec-safety-disclaimer">
                  🛡️ <strong>Safety Advisory Notice:</strong> {dashboardData?.disclaimer || "This security dashboard provides heuristic risk indicators and early warnings based on analyzed signals. It does not prove fraud, does not block accounts or financial transactions, and does not contact banks."}
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: DETECTION LABS & TESTING (PHASES 0 - 6)
            ========================================================================= */}
        {activeTab === 'labs' && (
          <>
        {/* Phase 0 Backend Connection Section */}
        <div className="connection-section">
          <h2>Backend Connection Status</h2>

          {status === 'loading' && (
            <div className="status-box loading">
              <span className="indicator-dot loading"></span>
              <p>Connecting to backend (http://127.0.0.1:8000/)...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-box success">
              <span className="indicator-dot success"></span>
              <p className="status-title">Backend Connected Successfully</p>
            </div>
          )}

          {status === 'error' && (
            <div className="status-box error">
              <span className="indicator-dot error"></span>
              <div>
                <p className="status-title">Failed to Connect to Backend</p>
                <p className="error-detail">{errorMessage}</p>
                <p className="error-hint">
                  Make sure the FastAPI server is running with:
                  <br />
                  <code>uvicorn main:app --reload</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Phase 1 Database Layer Section */}
        {dbStats && (
          <div className="database-section">
            <h2>Database Status (Protected)</h2>
            <div className="status-box db-success">
              <span className="indicator-dot success"></span>
              <p className="status-title">Database Connected</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Users</span>
                <span className="stat-value">{dbStats.users}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Transactions</span>
                <span className="stat-value">{dbStats.transactions}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">SMS Messages</span>
                <span className="stat-value">{dbStats.sms_messages}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Alerts</span>
                <span className="stat-value">{dbStats.alerts}</span>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: SMS Scam Detection Section */}
        <div className="sms-detection-section">
          <h2>SMS Scam Detection (Protected)</h2>
          <p className="section-desc">
            Early-warning classification using TF-IDF and Logistic Regression.
          </p>

          <div className="sample-chips">
            <span className="sample-label">Quick Test Samples:</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSmsSample(
                  'Congratulations! You have won a cash reward of Rs 50,000. Click this link to claim your prize.'
                )
              }
            >
              Reward Scam
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSmsSample(
                  'Your electricity bill payment of Rs 850 was successful. Thank you.'
                )
              }
            >
              Normal Bill
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSmsSample(
                  'Your bank account will be blocked today. Complete KYC immediately using this link.'
                )
              }
            >
              KYC Threat
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSmsSample('Your order has been shipped and will arrive tomorrow.')
              }
            >
              Normal Delivery
            </button>
          </div>

          <div className="sms-input-group">
            <textarea
              className="sms-textarea"
              rows={3}
              placeholder="Enter SMS text here..."
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={handleAnalyzeSms}
              disabled={smsLoading || !smsInput.trim()}
            >
              {smsLoading ? 'Analyzing...' : 'Analyze SMS'}
            </button>
          </div>

          {smsError && <div className="error-msg">{smsError}</div>}

          {smsResult && (
            <div className="result-box">
              <div className="result-row">
                <span className="result-key">Prediction:</span>
                <span
                  className={`prediction-badge ${
                    smsResult.prediction === 'suspicious'
                      ? 'badge-suspicious'
                      : 'badge-normal'
                  }`}
                >
                  {smsResult.prediction === 'suspicious'
                    ? 'Suspicious'
                    : 'Normal'}
                </span>
              </div>

              <div className="result-row">
                <span className="result-key">Confidence:</span>
                <span className="result-value">
                  {Math.round(smsResult.confidence * 100)}%
                </span>
              </div>

              <div className="result-row explanation">
                <span className="result-key">Explanation:</span>
                <span className="result-explanation">
                  {smsResult.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Phase 3: Transaction Anomaly Detection Section */}
        <div className="tx-detection-section">
          <h2>Transaction Anomaly Detection (Protected)</h2>
          <p className="section-desc">
            Unsupervised pattern analysis using Isolation Forest.
          </p>

          <div className="sample-chips">
            <span className="sample-label">Quick Test Scenarios:</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadTxSample({
                  amount: '450',
                  transaction_type: 'UPI',
                  hour: '14',
                  day_of_week: '2',
                  location: 'Mumbai',
                  beneficiary_id: '6',
                  device_id: '6',
                  beneficiary_identifier: 'ACC-DEMO-001',
                  device_identifier: 'DEV-PIXEL8-DEMO-01',
                })
              }
            >
              Normal UPI (Rs 450)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadTxSample({
                  amount: '2500',
                  transaction_type: 'CARD',
                  hour: '19',
                  day_of_week: '5',
                  location: 'Pune',
                  beneficiary_id: '7',
                  device_id: '6',
                  beneficiary_identifier: 'ACC-DEMO-002',
                  device_identifier: 'DEV-PIXEL8-DEMO-01',
                })
              }
            >
              Normal Card (Rs 2,500)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadTxSample({
                  amount: '10000',
                  transaction_type: 'BANK_TRANSFER',
                  hour: '11',
                  day_of_week: '1',
                  location: 'Delhi',
                  beneficiary_id: '0',
                  device_id: '6',
                  beneficiary_identifier: 'ACC-NEW-9999',
                  device_identifier: 'DEV-PIXEL8-DEMO-01',
                })
              }
            >
              Normal Rent (Rs 10,000)
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadTxSample({
                  amount: '450000',
                  transaction_type: 'UPI',
                  hour: '3',
                  day_of_week: '2',
                  location: 'St. Petersburg',
                  beneficiary_id: '0',
                  device_id: '0',
                  beneficiary_identifier: 'ACC-SUSPICIOUS-CRYPTO',
                  device_identifier: 'DEV-UNKNOWN-PROXY',
                })
              }
            >
              Late Foreign (Rs 450,000)
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadTxSample({
                  amount: '85000',
                  transaction_type: 'ATM',
                  hour: '4',
                  day_of_week: '0',
                  location: 'Unknown_Proxy',
                  beneficiary_id: '0',
                  device_id: '0',
                  beneficiary_identifier: 'ACC-UNKNOWN-ATM',
                  device_identifier: 'DEV-UNKNOWN-ATM',
                })
              }
            >
              Midnight ATM (Rs 85,000)
            </button>
          </div>

          <div className="tx-form-grid">
            <div className="form-group">
              <label>Amount (INR):</label>
              <input
                type="number"
                className="form-input"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                placeholder="e.g. 2500"
              />
            </div>

            <div className="form-group">
              <label>Transaction Type:</label>
              <select
                className="form-input"
                value={txForm.transaction_type}
                onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
              >
                <option value="UPI">UPI</option>
                <option value="CARD">CARD</option>
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="ATM">ATM</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hour (0-23):</label>
              <input
                type="number"
                min="0"
                max="23"
                className="form-input"
                value={txForm.hour}
                onChange={(e) => setTxForm({ ...txForm, hour: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Day of Week (0-6):</label>
              <select
                className="form-input"
                value={txForm.day_of_week}
                onChange={(e) => setTxForm({ ...txForm, day_of_week: e.target.value })}
              >
                <option value="0">Monday (0)</option>
                <option value="1">Tuesday (1)</option>
                <option value="2">Wednesday (2)</option>
                <option value="3">Thursday (3)</option>
                <option value="4">Friday (4)</option>
                <option value="5">Saturday (5)</option>
                <option value="6">Sunday (6)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location:</label>
              <input
                type="text"
                className="form-input"
                value={txForm.location}
                onChange={(e) => setTxForm({ ...txForm, location: e.target.value })}
                placeholder="e.g. Mumbai, Nashik"
              />
            </div>

            <div className="form-group">
              <label>Beneficiary Identifier (Optional):</label>
              <input
                type="text"
                className="form-input"
                value={txForm.beneficiary_identifier || ''}
                onChange={(e) => setTxForm({ ...txForm, beneficiary_identifier: e.target.value })}
                placeholder="e.g. ACC-DEMO-001"
              />
            </div>

            <div className="form-group">
              <label>Device Identifier (Optional):</label>
              <input
                type="text"
                className="form-input"
                value={txForm.device_identifier || ''}
                onChange={(e) => setTxForm({ ...txForm, device_identifier: e.target.value })}
                placeholder="e.g. DEV-PIXEL8-DEMO-01"
              />
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleAnalyzeTransaction}
            disabled={txLoading}
          >
            {txLoading ? 'Analyzing...' : 'Analyze Transaction'}
          </button>

          {txError && <div className="error-msg">{txError}</div>}

          {txResult && (
            <div className="result-box">
              <div className="result-row">
                <span className="result-key">Prediction:</span>
                <span
                  className={`prediction-badge ${
                    txResult.prediction === 'anomalous'
                      ? 'badge-suspicious'
                      : 'badge-normal'
                  }`}
                >
                  {txResult.prediction === 'anomalous'
                    ? 'Anomalous'
                    : 'Normal'}
                </span>
              </div>

              <div className="result-row">
                <span className="result-key">Anomaly Score:</span>
                <span className="result-value">
                  {txResult.anomaly_score > 0 ? `+${txResult.anomaly_score}` : txResult.anomaly_score}
                </span>
                <span className="score-hint">(&lt; 0 indicates anomaly)</span>
              </div>

              {txResult.beneficiary_status && (
                <div className="result-row">
                  <span className="result-key">Beneficiary Signal:</span>
                  <span
                    className={`prediction-badge ${
                      txResult.beneficiary_status === 'new'
                        ? 'badge-new'
                        : 'badge-known'
                    }`}
                  >
                    {txResult.beneficiary_status.toUpperCase()}
                  </span>
                </div>
              )}

              {txResult.device_status && (
                <div className="result-row">
                  <span className="result-key">Device Signal:</span>
                  <span
                    className={`prediction-badge ${
                      txResult.device_status === 'new'
                        ? 'badge-new'
                        : 'badge-known'
                    }`}
                  >
                    {txResult.device_status.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="result-row explanation">
                <span className="result-key">Explanation:</span>
                <span className="result-explanation">
                  {txResult.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Phase 4: Security Context Check (Beneficiary + Device) Section */}
        <div className="security-context-section">
          <h2>Security Context Check (Protected)</h2>
          <p className="section-desc">
            Evaluates whether the transaction beneficiary and device are known or newly encountered for your account.
          </p>

          <div className="sample-chips">
            <span className="sample-label">Quick Test Scenarios:</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSecSample('ACC-DEMO-001', 'DEV-PIXEL8-DEMO-01')
              }
            >
              Known + Known
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSecSample('ACC-NEW-9999', 'DEV-PIXEL8-DEMO-01')
              }
            >
              New Ben + Known Dev
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSecSample('ACC-DEMO-001', 'DEV-NEW-LAPTOP-99')
              }
            >
              Known Ben + New Dev
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadSecSample('ACC-NEW-9999', 'DEV-NEW-LAPTOP-99')
              }
            >
              New Ben + New Dev
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadSecSample('AC-TORRENT-884920', 'DEV-SM-S23-01')
              }
              title="These belong to User Rahul, so for Demo User they must evaluate as NEW (cross-user isolation test)"
            >
              Cross-User Test (Rahul's)
            </button>
          </div>

          <div className="tx-form-grid">
            <div className="form-group">
              <label>Beneficiary Account Identifier:</label>
              <input
                type="text"
                className="form-input"
                value={benInput}
                onChange={(e) => setBenInput(e.target.value)}
                placeholder="e.g. ACC-DEMO-001"
              />
            </div>

            <div className="form-group">
              <label>Device Identifier:</label>
              <input
                type="text"
                className="form-input"
                value={devInput}
                onChange={(e) => setDevInput(e.target.value)}
                placeholder="e.g. DEV-PIXEL8-DEMO-01"
              />
            </div>
          </div>

          <div className="sec-buttons-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCheckBeneficiary}
              disabled={secLoading || !benInput.trim()}
            >
              Check Beneficiary
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCheckDevice}
              disabled={secLoading || !devInput.trim()}
            >
              Check Device
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCheckSecurityContext}
              disabled={secLoading || !benInput.trim() || !devInput.trim()}
            >
              {secLoading ? 'Checking...' : 'Check Security Context'}
            </button>
          </div>

          {secError && <div className="error-msg">{secError}</div>}

          {secResult && (
            <div className="result-box sec-result-box">
              <div className="sec-badges-row">
                {secResult.beneficiary_status && (
                  <div className="sec-signal-item">
                    <span className="result-key">Beneficiary:</span>
                    <span
                      className={`prediction-badge ${
                        secResult.beneficiary_status === 'new'
                          ? 'badge-new'
                          : 'badge-known'
                      }`}
                    >
                      {secResult.beneficiary_status.toUpperCase()}
                    </span>
                    {secResult.beneficiary_id && (
                      <span className="score-hint">(ID #{secResult.beneficiary_id})</span>
                    )}
                  </div>
                )}

                {secResult.device_status && (
                  <div className="sec-signal-item">
                    <span className="result-key">Device:</span>
                    <span
                      className={`prediction-badge ${
                        secResult.device_status === 'new'
                          ? 'badge-new'
                          : 'badge-known'
                      }`}
                    >
                      {secResult.device_status.toUpperCase()}
                    </span>
                    {secResult.device_id && (
                      <span className="score-hint">(ID #{secResult.device_id})</span>
                    )}
                  </div>
                )}
              </div>

              <div className="result-row explanation">
                <span className="result-key">Security Message:</span>
                <span className="result-explanation">
                  {secResult.message}
                </span>
              </div>

              <div className="sec-safety-disclaimer">
                ℹ️ Security signal only — newly observed beneficiary or device status does not prove fraud.
              </div>
            </div>
          )}
        </div>

        {/* Phase 5: Security Analysis (Time Correlation + URL Analysis) Section */}
        <div className="security-analysis-section">
          <h2>Security Analysis (Protected)</h2>
          <p className="section-desc">
            Evaluates temporal proximity between suspicious SMS and transactions, plus safe offline URL risk indicators.
          </p>

          <div className="sample-chips">
            <span className="sample-label">Quick Test Scenarios:</span>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadSignalSample(
                  'URGENT: Your KYC is suspended! Verify at http://192.168.1.100/verify immediately to prevent account freeze.',
                  '2026-10-07T10:12:00'
                )
              }
            >
              Correlated IP Phishing
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() =>
                loadSignalSample(
                  'Congratulations! You won Rs 50,000 cash reward. Claim at http://bit.ly/gift-bonus now.',
                  '2026-10-07T10:12:00'
                )
              }
            >
              Shortened URL Scam
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSignalSample(
                  'URGENT: Verify at http://192.168.1.100/verify immediately.',
                  '2026-10-07T11:00:00'
                )
              }
            >
              Late Tx (&gt; 30 min)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSignalSample(
                  'Your electricity bill of Rs 850 was paid successfully. View receipt at https://hdfcbank.com/statements.',
                  '2026-10-07T11:00:00'
                )
              }
            >
              Legitimate Bank HTTPS
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() =>
                loadSignalSample(
                  'Your order from Kitchen Central has been delivered. Enjoy your meal!',
                  '2026-10-07T12:00:00'
                )
              }
            >
              Normal SMS (No URL)
            </button>
          </div>

          <div className="sec-analysis-form">
            <div className="form-group">
              <label>SMS Message Text:</label>
              <textarea
                className="sms-textarea"
                rows={2}
                value={secSmsInput}
                onChange={(e) => setSecSmsInput(e.target.value)}
                placeholder="Enter SMS message text to inspect for URLs..."
              />
            </div>

            <div className="form-group" style={{ marginTop: '0.85rem' }}>
              <label>Transaction Time (ISO 8601):</label>
              <input
                type="text"
                className="form-input"
                value={secTxTimeInput}
                onChange={(e) => setSecTxTimeInput(e.target.value)}
                placeholder="e.g. 2026-10-07T10:12:00"
              />
            </div>
          </div>

          <div className="sec-buttons-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCheckTimeCorrelation}
              disabled={secAnalysisLoading || !secTxTimeInput.trim()}
            >
              Check Time Correlation
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCheckUrlAnalysis}
              disabled={secAnalysisLoading || !secSmsInput.trim()}
            >
              Analyze URL
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAnalyzeSecuritySignals}
              disabled={secAnalysisLoading || !secSmsInput.trim() || !secTxTimeInput.trim()}
            >
              {secAnalysisLoading ? 'Analyzing...' : 'Analyze Security Signals'}
            </button>
          </div>

          {secAnalysisError && <div className="error-msg">{secAnalysisError}</div>}

          {secAnalysisResult && (
            <div className="result-box sec-result-box">
              <div className="sec-badges-row">
                <div className="sec-signal-item">
                  <span className="result-key">Time Correlation:</span>
                  <span
                    className={`prediction-badge ${
                      secAnalysisResult.time_correlation
                        ? 'badge-suspicious'
                        : 'badge-normal'
                    }`}
                  >
                    {secAnalysisResult.time_correlation ? 'YES' : 'NO'}
                  </span>
                  {secAnalysisResult.time_difference_minutes !== null &&
                    secAnalysisResult.time_difference_minutes !== undefined && (
                      <span className="score-hint">
                        ({secAnalysisResult.time_difference_minutes} min difference)
                      </span>
                    )}
                </div>

                <div className="sec-signal-item">
                  <span className="result-key">URL Found:</span>
                  <span
                    className={`prediction-badge ${
                      secAnalysisResult.url_found
                        ? 'badge-known'
                        : 'badge-normal'
                    }`}
                  >
                    {secAnalysisResult.url_found ? 'YES' : 'NO'}
                  </span>
                </div>

                {secAnalysisResult.url_risk_level && (
                  <div className="sec-signal-item">
                    <span className="result-key">URL Risk:</span>
                    <span
                      className={`prediction-badge ${
                        secAnalysisResult.url_risk_level === 'high'
                          ? 'badge-suspicious'
                          : secAnalysisResult.url_risk_level === 'medium'
                          ? 'badge-new'
                          : 'badge-normal'
                      }`}
                    >
                      {secAnalysisResult.url_risk_level.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {secAnalysisResult.url && (
                <div className="result-row" style={{ marginTop: '0.4rem' }}>
                  <span className="result-key">Extracted URL:</span>
                  <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{secAnalysisResult.url}</code>
                </div>
              )}

              {secAnalysisResult.url_indicators && secAnalysisResult.url_indicators.length > 0 && (
                <div className="result-row indicators-row" style={{ marginTop: '0.6rem' }}>
                  <span className="result-key">URL Indicators:</span>
                  <ul className="indicators-list">
                    {secAnalysisResult.url_indicators.map((ind, idx) => (
                      <li key={idx}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="result-row explanation">
                <span className="result-key">Security Message:</span>
                <span className="result-explanation">
                  {secAnalysisResult.message}
                </span>
              </div>

              <div className="sec-safety-disclaimer">
                ℹ️ Security signal only — temporal proximity and heuristic URL indicators do not prove fraud.
              </div>
            </div>
          )}
        </div>

        {/* Phase 6: Combined Multi-Factor Risk Assessment Section */}
        <div className="risk-engine-section">
          <h2>Combined Multi-Factor Risk Assessment (Protected)</h2>
          <p className="section-desc">
            Holistically evaluates all early-warning vectors (SMS scam model, transaction anomaly model,
            beneficiary recognition, device history, temporal correlation, and offline URL heuristics) into a
            transparent rule-based risk score with actionable recommendations.
          </p>

          <div className="sample-chips">
            <span className="sample-label">Preset Risk Scenarios:</span>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() => loadRiskScenario('HIGH_ATTACK')}
            >
              🚨 Multi-Vector Attack (HIGH)
            </button>
            <button
              type="button"
              className="chip-btn chip-warn"
              onClick={() => loadRiskScenario('PHISHING_ONLY')}
            >
              ⚠️ Phishing SMS Only (MEDIUM)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => loadRiskScenario('CLEAN_PAYMENT')}
            >
              🛡️ Legitimate Payment (LOW)
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => loadRiskScenario('DB_RECORDS')}
            >
              📂 Seeded DB Records (SMS #7 + Tx #9)
            </button>
            <button
              type="button"
              className="chip-btn chip-muted"
              onClick={() => loadRiskScenario('INSUFFICIENT_DATA')}
            >
              ❓ Insufficient Data Test
            </button>
          </div>

          <div className="risk-form-grid">
            <div className="risk-col">
              <h3>Vector 1: SMS &amp; URL Context</h3>
              <div className="form-group">
                <label>SMS Message Text (Optional):</label>
                <textarea
                  className="sms-textarea"
                  rows={3}
                  value={riskSmsText}
                  onChange={(e) => setRiskSmsText(e.target.value)}
                  placeholder="Enter SMS message text to evaluate..."
                />
              </div>
            </div>

            <div className="risk-col">
              <h3>Vector 2: Transaction &amp; Device Context</h3>
              <div className="form-row-2col">
                <div className="form-group">
                  <label>Amount (₹):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={riskTxData.amount}
                    onChange={(e) => setRiskTxData({ ...riskTxData, amount: e.target.value })}
                    placeholder="e.g. 450000"
                  />
                </div>
                <div className="form-group">
                  <label>Type:</label>
                  <select
                    className="form-input"
                    value={riskTxData.transaction_type}
                    onChange={(e) => setRiskTxData({ ...riskTxData, transaction_type: e.target.value })}
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="ATM">ATM</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Beneficiary Identifier:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={riskTxData.beneficiary_identifier}
                    onChange={(e) => setRiskTxData({ ...riskTxData, beneficiary_identifier: e.target.value })}
                    placeholder="e.g. ACC-DEMO-001"
                  />
                </div>
                <div className="form-group">
                  <label>Device Identifier:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={riskTxData.device_identifier}
                    onChange={(e) => setRiskTxData({ ...riskTxData, device_identifier: e.target.value })}
                    placeholder="e.g. DEV-PIXEL8-DEMO-01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Transaction Timestamp (ISO 8601):</label>
                <input
                  type="text"
                  className="form-input"
                  value={riskTxData.transaction_time}
                  onChange={(e) => setRiskTxData({ ...riskTxData, transaction_time: e.target.value })}
                  placeholder="e.g. 2026-10-07T10:12:00"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
            onClick={() => handleRunRiskAssessment()}
            disabled={riskAssessmentLoading}
          >
            {riskAssessmentLoading ? 'Evaluating Multi-Factor Signals...' : 'Run Multi-Factor Risk Assessment'}
          </button>

          {riskAssessmentError && <div className="error-msg">{riskAssessmentError}</div>}

          {riskAssessmentResult && (
            <div className="result-box risk-result-box">
              {/* Main Risk Header Pill */}
              <div className="risk-header-pill-wrapper">
                <div
                  className={`risk-header-pill ${
                    riskAssessmentResult.risk_level === 'HIGH'
                      ? 'risk-pill-high'
                      : riskAssessmentResult.risk_level === 'MEDIUM'
                      ? 'risk-pill-medium'
                      : riskAssessmentResult.risk_level === 'LOW'
                      ? 'risk-pill-low'
                      : 'risk-pill-insufficient'
                  }`}
                >
                  <span className="risk-level-title">
                    {riskAssessmentResult.risk_level === 'HIGH' && '🚨 HIGH RISK'}
                    {riskAssessmentResult.risk_level === 'MEDIUM' && '⚠️ MEDIUM RISK'}
                    {riskAssessmentResult.risk_level === 'LOW' && '🛡️ LOW RISK'}
                    {riskAssessmentResult.risk_level === 'INSUFFICIENT_DATA' && '❓ INSUFFICIENT DATA'}
                  </span>
                  <span className="risk-score-display">
                    {riskAssessmentResult.risk_score !== null && riskAssessmentResult.risk_score !== undefined
                      ? `Score: ${riskAssessmentResult.risk_score} / 100`
                      : 'Score: Not Available'}
                  </span>
                </div>
              </div>

              {/* Evaluated Signals Grid */}
              <h4 style={{ margin: '1rem 0 0.5rem 0' }}>Multi-Layer Signal Matrix:</h4>
              <div className="signals-matrix-grid">
                <div className="signal-card">
                  <span className="signal-label">SMS Scam ML</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.sms === 'suspicious'
                        ? 'badge-suspicious'
                        : riskAssessmentResult.signals.sms === 'normal'
                        ? 'badge-normal'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.sms.toUpperCase()}
                  </span>
                </div>

                <div className="signal-card">
                  <span className="signal-label">Tx Anomaly ML</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.transaction === 'anomalous'
                        ? 'badge-suspicious'
                        : riskAssessmentResult.signals.transaction === 'normal'
                        ? 'badge-normal'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.transaction.toUpperCase()}
                  </span>
                </div>

                <div className="signal-card">
                  <span className="signal-label">Beneficiary</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.beneficiary === 'new'
                        ? 'badge-new'
                        : riskAssessmentResult.signals.beneficiary === 'known'
                        ? 'badge-known'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.beneficiary.toUpperCase()}
                  </span>
                </div>

                <div className="signal-card">
                  <span className="signal-label">Device</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.device === 'new'
                        ? 'badge-new'
                        : riskAssessmentResult.signals.device === 'known'
                        ? 'badge-known'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.device.toUpperCase()}
                  </span>
                </div>

                <div className="signal-card">
                  <span className="signal-label">Time Correlation</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.time_correlation === 'correlated'
                        ? 'badge-suspicious'
                        : riskAssessmentResult.signals.time_correlation === 'not_correlated'
                        ? 'badge-normal'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.time_correlation.toUpperCase()}
                  </span>
                </div>

                <div className="signal-card">
                  <span className="signal-label">URL Offline Risk</span>
                  <span
                    className={`prediction-badge ${
                      riskAssessmentResult.signals.url === 'high'
                        ? 'badge-suspicious'
                        : riskAssessmentResult.signals.url === 'medium'
                        ? 'badge-new'
                        : riskAssessmentResult.signals.url === 'low'
                        ? 'badge-normal'
                        : 'badge-muted'
                    }`}
                  >
                    {riskAssessmentResult.signals.url.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Evidence-Based Explanations */}
              {riskAssessmentResult.explanations && riskAssessmentResult.explanations.length > 0 && (
                <div className="result-section-block">
                  <h4>Evidence-Based Explanations:</h4>
                  <ul className="risk-explanations-list">
                    {riskAssessmentResult.explanations.map((exp, idx) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Safety Actions */}
              {riskAssessmentResult.recommended_actions && riskAssessmentResult.recommended_actions.length > 0 && (
                <div className="result-section-block">
                  <h4>Recommended Safety Actions:</h4>
                  <ul className="risk-actions-list">
                    {riskAssessmentResult.recommended_actions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Phase 7: Explainable Signal Breakdown */}
              {riskAssessmentResult.signal_breakdown && (
                <div className="result-section-block">
                  <h4>Explainable Signal Breakdown (Scoring Rationales):</h4>
                  <div className="breakdown-table-wrapper">
                    <table className="breakdown-table">
                      <thead>
                        <tr>
                          <th>Security Signal</th>
                          <th>Evaluation</th>
                          <th>Points</th>
                          <th>Influence</th>
                          <th>Heuristic Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(riskAssessmentResult.signal_breakdown).map(([sigKey, sigInfo]) => {
                          const sigNameMap = {
                            sms: 'SMS Scam ML',
                            transaction: 'Transaction Anomaly ML',
                            beneficiary: 'Beneficiary Recognition',
                            device: 'Device Recognition',
                            time_correlation: 'Time Correlation',
                            url: 'URL Security Analysis',
                          }
                          return (
                            <tr key={sigKey} className={sigInfo.is_missing ? 'row-missing' : ''}>
                              <td className="signal-cell-name">
                                <strong>{sigNameMap[sigKey] || sigKey}</strong>
                              </td>
                              <td>
                                {sigInfo.is_missing ? (
                                  <span className="badge-missing">⚠️ Missing</span>
                                ) : (
                                  <span className={`status-tag status-${sigInfo.status}`}>
                                    {sigInfo.status.toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`points-badge ${sigInfo.points > 0 ? 'points-risk' : 'points-safe'}`}>
                                  {sigInfo.points > 0 ? `+${sigInfo.points} pts` : '0 pts'}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`influence-tag ${
                                    sigInfo.influence.includes('High Risk')
                                      ? 'influence-high'
                                      : sigInfo.influence.includes('Contextual') ||
                                        sigInfo.influence.includes('Temporal') ||
                                        sigInfo.influence.includes('Heuristic')
                                      ? 'influence-context'
                                      : sigInfo.influence.includes('Missing')
                                      ? 'influence-missing'
                                      : 'influence-safe'
                                  }`}
                                >
                                  {sigInfo.influence}
                                </span>
                              </td>
                              <td className="rationale-cell">
                                {sigInfo.rationale}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Phase 7: Security Alert Triggered Banner */}
              {riskAssessmentResult.alert_id && (
                <div className="alert-generated-banner">
                  <span className="alert-bell-icon">🚨</span>
                  <div>
                    <strong>Security Alert Generated (Alert #{riskAssessmentResult.alert_id})</strong>
                    <p>
                      {riskAssessmentResult.alert_created
                        ? 'A new early-warning alert was automatically persisted to your Security Alerts Center below.'
                        : 'Identical alert was active within the 15-minute duplicate prevention window; existing alert maintained.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="sec-safety-disclaimer" style={{ marginTop: '1rem' }}>
                ℹ️ {riskAssessmentResult.disclaimer}
              </div>
            </div>
          )}
        </div>
          </>
        )}

        {/* =========================================================================
            TAB 3: ALERTS CENTER & TIMELINE (PHASE 7)
            ========================================================================= */}
        {activeTab === 'alerts' && (
          <>
        {/* Phase 7: Security Alerts Center */}
        <div className="alerts-center-section">
          <div className="alerts-header-row">
            <h2>Security Alerts Center (Phase 7)</h2>
            <button
              type="button"
              className="chip-btn"
              onClick={() => fetchAlerts(alertsFilter)}
              disabled={alertsLoading}
            >
              {alertsLoading ? 'Refreshing...' : '🔄 Refresh Alerts'}
            </button>
          </div>
          <p className="section-desc">
            Early-warning security alerts generated strictly for verified medium and high risk events.
            Includes duplicate-prevention within 15 minutes, ownership isolation, and a review/dismissal lifecycle.
          </p>

          <div className="alerts-filter-bar">
            {['ALL', 'NEW', 'REVIEWED', 'DISMISSED'].map((filterTab) => (
              <button
                key={filterTab}
                type="button"
                className={`filter-btn ${alertsFilter === filterTab ? 'active' : ''}`}
                onClick={() => {
                  setAlertsFilter(filterTab)
                  fetchAlerts(filterTab)
                }}
              >
                {filterTab}
              </button>
            ))}
          </div>

          {alertsError && <div className="error-msg">{alertsError}</div>}

          {alertsLoading && alerts.length === 0 ? (
            <div className="status-box loading">
              <span className="indicator-dot loading"></span>
              <p>Loading security alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="status-box" style={{ background: '#f8fafc', color: '#64748b' }}>
              <p>No alerts found matching filter '{alertsFilter}'.</p>
            </div>
          ) : (
            <div className="alerts-grid">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`alert-card status-card-${(al.status || 'new').toLowerCase()}`}
                >
                  <div className="alert-card-header">
                    <div className="alert-badges-group">
                      <span className="alert-id-tag">#{al.id}</span>
                      <span className="alert-type-badge">{al.alert_type}</span>
                      <span
                        className={`prediction-badge ${
                          al.risk_level === 'HIGH' ? 'badge-suspicious' : 'badge-new'
                        }`}
                      >
                        {al.risk_level}
                      </span>
                    </div>
                    <span className={`alert-status-badge alert-status-${(al.status || 'new').toLowerCase()}`}>
                      {al.status || 'NEW'}
                    </span>
                  </div>

                  <p className="alert-message">{al.message}</p>

                  {renderFeedbackButtons(al)}

                  <div className="alert-footer">
                    <span className="alert-timestamp">
                      📅 {al.created_at ? new Date(al.created_at).toLocaleString() : 'Timestamp not recorded'}
                    </span>
                    <div className="alert-actions-group">
                      {al.status !== 'REVIEWED' && (
                        <button
                          type="button"
                          className="btn-alert-action btn-review"
                          onClick={() => handleReviewAlert(al.id)}
                          title="Mark this security alert as reviewed"
                        >
                          ✓ Mark Reviewed
                        </button>
                      )}
                      {al.status !== 'DISMISSED' && (
                        <button
                          type="button"
                          className="btn-alert-action btn-dismiss"
                          onClick={() => handleDismissAlert(al.id)}
                          title="Dismiss this alert"
                        >
                          ✕ Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 7: Activity & Fraud Timeline */}
        <div className="timeline-section">
          <div className="timeline-header-row">
            <h2>Activity &amp; Fraud Timeline (Phase 7)</h2>
            <button
              type="button"
              className="chip-btn"
              onClick={fetchTimeline}
              disabled={timelineLoading}
            >
              {timelineLoading ? 'Refreshing...' : '🔄 Refresh Timeline'}
            </button>
          </div>
          <p className="section-desc">
            Chronological audit trail aggregating SMS messages, transactions, registered beneficiaries,
            recognized devices, and security alerts for your account. Clearly distinguishes verified timestamps
            from un-timestamped events.
          </p>

          {timelineError && <div className="error-msg">{timelineError}</div>}

          {timelineLoading && timelineEvents.length === 0 ? (
            <div className="status-box loading">
              <span className="indicator-dot loading"></span>
              <p>Aggregating timeline events...</p>
            </div>
          ) : timelineEvents.length === 0 ? (
            <div className="status-box" style={{ background: '#f8fafc', color: '#64748b' }}>
              <p>No activity events recorded yet.</p>
            </div>
          ) : (
            <div className="timeline-stream">
              {timelineEvents.map((ev) => {
                const iconMap = {
                  SMS: '💬',
                  TRANSACTION: '💳',
                  BENEFICIARY: '👤',
                  DEVICE: '📱',
                  ALERT: '🚨',
                }
                const icon = iconMap[ev.entity_type] || '📌'

                return (
                  <div key={ev.event_id} className="timeline-event-card">
                    <div className="timeline-icon-bubble">{icon}</div>
                    <div className="timeline-body">
                      <div className="timeline-top-row">
                        <span className="timeline-event-title">{ev.title}</span>
                        {ev.timestamp_available ? (
                          <span className="timeline-timestamp-chip">
                            🕒 {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        ) : (
                          <span className="timeline-timestamp-chip timeline-timestamp-missing">
                            ⚠️ Timestamp Unavailable
                          </span>
                        )}
                      </div>

                      <p className="timeline-event-desc">{ev.description}</p>

                      <div className="timeline-meta-tags">
                        <span className="meta-chip">Type: {ev.entity_type}</span>
                        {ev.severity && (
                          <span
                            className={`meta-chip ${
                              ev.severity === 'HIGH'
                                ? 'badge-suspicious'
                                : ev.severity === 'MEDIUM'
                                ? 'badge-new'
                                : ''
                            }`}
                          >
                            Severity: {ev.severity}
                          </span>
                        )}
                        {ev.metadata?.url && (
                          <span className="meta-chip">URL: {ev.metadata.url}</span>
                        )}
                        {ev.metadata?.status && (
                          <span className="meta-chip">Status: {ev.metadata.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
          </>
        )}

        {/* Backend Root Response */}
        {data && (
          <div className="response-section">
            <h3>Backend Public Root Response:</h3>
            <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}

        <div className="actions">
          <button onClick={fetchBackendStatus} className="btn-refresh">
            Test Connection Again
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>AI-Based Multi-Layer Fraud Early Warning System &bull; Phase 8 (Dashboard, Safety Actions &amp; User Feedback)</p>
      </footer>
    </div>
  )
}

export default ProtectedApp
