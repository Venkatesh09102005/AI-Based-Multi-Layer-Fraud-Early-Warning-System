const BASE_URL = 'http://127.0.0.1:8000'

async function request(endpoint, options = {}, token = null) {
  const url = `${BASE_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      const err = new Error('Session expired or unauthorized')
      err.status = 401
      throw err
    }

    if (!res.ok) {
      let detail = `Server error ${res.status}`
      try {
        const errJson = await res.json()
        if (errJson && errJson.detail) {
          detail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
        }
      } catch (_) {}
      const err = new Error(detail)
      err.status = res.status
      throw err
    }

    return await res.json()
  } catch (error) {
    throw error
  }
}

export const api = {
  // Public & Health
  health: () => request('/health'),
  root: () => request('/'),

  // Auth
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: (token) => request('/api/auth/me', {}, token),

  // Database Summary & Lists
  getStats: (token) => request('/api/stats', {}, token),
  getUsers: (token) => request('/api/users', {}, token),
  getSms: (token) => request('/api/sms', {}, token),
  getTransactions: (token, limit = 50) =>
    request(`/api/transactions?limit=${limit}`, {}, token),
  getBeneficiaries: (token) => request('/api/beneficiaries', {}, token),
  getDevices: (token) => request('/api/devices', {}, token),

  // Phase 2: SMS Scam Detection
  predictSms: (token, message) =>
    request(
      '/api/sms/predict',
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
      token
    ),

  // Phase 3: Transaction Anomaly
  analyzeTransaction: (token, txData) =>
    request(
      '/api/transactions/analyze',
      {
        method: 'POST',
        body: JSON.stringify(txData),
      },
      token
    ),

  // Phase 4: Beneficiaries & Devices
  checkBeneficiary: (token, beneficiary_identifier) =>
    request(
      '/api/beneficiaries/check',
      {
        method: 'POST',
        body: JSON.stringify({ beneficiary_identifier }),
      },
      token
    ),
  checkDevice: (token, device_identifier) =>
    request(
      '/api/devices/check',
      {
        method: 'POST',
        body: JSON.stringify({ device_identifier }),
      },
      token
    ),
  checkSecurityContext: (token, beneficiary_identifier, device_identifier) =>
    request(
      '/api/security/context-check',
      {
        method: 'POST',
        body: JSON.stringify({ beneficiary_identifier, device_identifier }),
      },
      token
    ),

  // Phase 5: Time Correlation & URL Security
  checkTimeCorrelation: (token, sms_time, transaction_time, window_minutes = 30) =>
    request(
      '/api/security/time-correlation',
      {
        method: 'POST',
        body: JSON.stringify({ sms_time, transaction_time, window_minutes }),
      },
      token
    ),
  analyzeUrl: (token, { message = null, url = null }) =>
    request(
      '/api/security/url-analysis',
      {
        method: 'POST',
        body: JSON.stringify({ message, url }),
      },
      token
    ),
  analyzeSecuritySignals: (token, message, transaction_time, window_minutes = 30) =>
    request(
      '/api/security/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ message, transaction_time, window_minutes }),
      },
      token
    ),

  // Phase 6: Overall Risk Engine
  evaluateRiskAssessment: (token, payload) =>
    request(
      '/api/security/risk-assessment',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token
    ),

  // Phase 7: Alerts & Timeline
  getTimeline: (token) => request('/api/security/timeline', {}, token),
  getAlerts: (token, status = null) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : ''
    return request(`/api/alerts${query}`, {}, token)
  },
  getAlert: (token, id) => request(`/api/alerts/${id}`, {}, token),
  reviewAlert: (token, id) =>
    request(`/api/alerts/${id}/review`, { method: 'POST' }, token),
  dismissAlert: (token, id) =>
    request(`/api/alerts/${id}/dismiss`, { method: 'POST' }, token),

  // Phase 8: User Feedback & Dashboard
  submitFeedback: (token, alertId, feedback, notes = '') =>
    request(
      `/api/alerts/${alertId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({ feedback, notes }),
      },
      token
    ),
  getAlertFeedback: (token, alertId) =>
    request(`/api/alerts/${alertId}/feedback`, {}, token),
  getDashboardSummary: (token) => request('/api/dashboard/summary', {}, token),
}
