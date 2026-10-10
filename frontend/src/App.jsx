import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'

// 13 Working Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SmsAnalysis from './pages/SmsAnalysis'
import TransactionAnalysis from './pages/TransactionAnalysis'
import BeneficiarySecurity from './pages/BeneficiarySecurity'
import DeviceSecurity from './pages/DeviceSecurity'
import TimeCorrelation from './pages/TimeCorrelation'
import UrlSecurity from './pages/UrlSecurity'
import RiskAssessment from './pages/RiskAssessment'
import Alerts from './pages/Alerts'
import ActivityTimeline from './pages/ActivityTimeline'
import Feedback from './pages/Feedback'
import Settings from './pages/Settings'

import './App.css'

function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="login-page-bg">
        <div className="login-auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            className="spinner-spin"
            style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
            }}
          ></div>
          <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
            Verifying cryptographic security session...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout />
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <Login />
          </PublicAuthRoute>
        }
      />

      {/* Root redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected Routes inside AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis/sms" element={<SmsAnalysis />} />
        <Route path="/analysis/transactions" element={<TransactionAnalysis />} />
        <Route path="/security/beneficiaries" element={<BeneficiarySecurity />} />
        <Route path="/security/devices" element={<DeviceSecurity />} />
        <Route path="/analysis/time-correlation" element={<TimeCorrelation />} />
        <Route path="/security/url-analysis" element={<UrlSecurity />} />
        <Route path="/analysis/risk-assessment" element={<RiskAssessment />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/activity" element={<ActivityTimeline />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
