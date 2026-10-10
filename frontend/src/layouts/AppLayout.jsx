import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  Shield,
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  UserCheck,
  Smartphone,
  Clock,
  Link as LinkIcon,
  ShieldAlert,
  Bell,
  Activity,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

export default function AppLayout() {
  const { user, token, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch alerts for top header notification bell
  useEffect(() => {
    if (!token) return
    const fetchNotifs = async () => {
      try {
        const alerts = await api.getAlerts(token)
        if (Array.isArray(alerts)) {
          setRecentAlerts(alerts.slice(0, 5))
          const newCount = alerts.filter((a) => a.status === 'NEW').length
          setUnreadCount(newCount)
        }
      } catch (e) {
        // Silent catch for background notification poll
      }
    }
    fetchNotifs()
  }, [token, location.pathname])

  const navGroups = [
    {
      group: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'DETECTION SIGNALS',
      items: [
        { path: '/analysis/sms', label: 'SMS Scam ML', icon: MessageSquare },
        { path: '/analysis/transactions', label: 'Transaction Anomaly', icon: CreditCard },
        { path: '/security/beneficiaries', label: 'Beneficiary Security', icon: UserCheck },
        { path: '/security/devices', label: 'Device Security', icon: Smartphone },
      ],
    },
    {
      group: 'CORRELATION & RISK',
      items: [
        { path: '/analysis/time-correlation', label: 'Time Correlation', icon: Clock },
        { path: '/security/url-analysis', label: 'URL Security Heuristics', icon: LinkIcon },
        { path: '/analysis/risk-assessment', label: 'Overall Risk Assessment', icon: ShieldAlert },
      ],
    },
    {
      group: 'OPERATIONS & AUDIT',
      items: [
        {
          path: '/alerts',
          label: 'Security Alerts',
          icon: Bell,
          badge: unreadCount > 0 ? unreadCount : null,
        },
        { path: '/activity', label: 'Activity Timeline', icon: Activity },
        { path: '/feedback', label: 'Alert Feedback Hub', icon: MessageCircle },
      ],
    },
    {
      group: 'SYSTEM',
      items: [
        { path: '/settings', label: 'Profile & Settings', icon: Settings },
      ],
    },
  ]

  // Dynamic header title lookup
  const getPageInfo = () => {
    const current = location.pathname
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.path === current) {
          return { title: item.label, group: group.group }
        }
      }
    }
    return { title: 'Sentinel Fraud Intelligence', group: 'PORTAL' }
  }

  const pageInfo = getPageInfo()
  const userInitials = (user?.name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      {/* Dark Navy Sidebar */}
      <aside className={`app-sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="brand-badge" onClick={() => setMobileOpen(false)}>
            <div className="brand-icon">
              <Shield size={22} />
            </div>
            <div className="brand-text">
              <h1>SentinelFraud</h1>
              <span>AI Early Warning System</span>
            </div>
          </NavLink>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.group} className="nav-group-section">
              <div className="nav-group-title">{group.group}</div>
              <div className="nav-group-list">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-link-item ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="nav-icon" />
                      <span>{item.label}</span>
                      {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <div className="user-avatar-circle">{userInitials}</div>
            <div className="user-quick-info">
              <span className="user-quick-name">{user?.name || 'Authenticated User'}</span>
              <span className="user-quick-email">{user?.email || 'user@example.com'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn-sidebar-logout"
            title="Log out of session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="app-main-wrapper">
        <header className="app-header">
          <div className="header-left">
            <button
              type="button"
              className="btn-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="header-title-box">
              <h2>{pageInfo.title}</h2>
              <span>Sentinel Platform &bull; {pageInfo.group}</span>
            </div>
          </div>

          <div className="header-right">
            <div className="system-status-pill">
              <span className="status-dot"></span>
              <span>AI Engine Active</span>
            </div>

            {/* Notifications Popover */}
            <div className="notifications-wrapper">
              <button
                type="button"
                className="btn-header-icon"
                onClick={() => setNotifOpen(!notifOpen)}
                title="View recent alerts"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge-bubble">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="notifications-dropdown">
                  <div className="notif-header">
                    <span>Security Alerts</span>
                    <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>
                      {unreadCount} New
                    </span>
                  </div>
                  <div className="notif-list">
                    {recentAlerts.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                        No alerts recorded
                      </div>
                    ) : (
                      recentAlerts.map((al) => (
                        <div
                          key={al.id}
                          className="notif-item"
                          onClick={() => {
                            setNotifOpen(false)
                            navigate('/alerts')
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                              #{al.id} {al.alert_type}
                            </strong>
                            <span
                              className={`status-badge ${
                                al.risk_level === 'HIGH' ? 'badge-high' : 'badge-medium'
                              }`}
                              style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
                            >
                              {al.risk_level}
                            </span>
                          </div>
                          <p>{al.message?.slice(0, 75)}...</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    className="notif-footer"
                    onClick={() => {
                      setNotifOpen(false)
                      navigate('/alerts')
                    }}
                  >
                    View All In Alerts Center &rarr;
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              onClick={() => window.location.reload()}
              title="Refresh current data"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="app-content">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>
            <strong>SentinelFraud Platform</strong> &bull; AI-Based Multi-Layer Fraud Early Warning System
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Heuristic security early-warning intelligence. Does not claim proof of fraud, does not freeze accounts, and does not contact banks.
          </p>
        </footer>
      </div>
    </div>
  )
}
