// src/components/QuickActions.jsx
import { useNavigate } from "react-router-dom"

const ACTIONS = [
  {
    iconClass: "green", label: "Scan", sub: "Identify Meds", path: "/scan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#5a9a38" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    iconClass: "red", label: "Ambulance", sub: "SOS Help", path: "/ambulance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#e05252" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="16" height="11" rx="2" ry="2" />
        <path d="M18 10h4v5l-4 3z" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M7 11h6" />
        <path d="M10 8v6" />
      </svg>
    ),
  },
  {
    iconClass: "purple", label: "Doctor", sub: "Consult Now", path: "/doctors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#8b6fcb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    ),
  },
  {
    iconClass: "amber", label: "Reminders", sub: "Set Alerts", path: "/reminders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M5 3 2 6" />
        <path d="m19 3 3 3" />
      </svg>
    ),
  },
]

export default function QuickActions() {
  const navigate = useNavigate()
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Quick Actions</div>
          <div className="section-subtitle">त्वरित सेवाएं</div>
        </div>
        <div className="view-all">View All →</div>
      </div>

      <div className="quick-actions">
        <div className="actions-grid">
          {ACTIONS.map(({ icon, label, sub, iconClass, path }) => (
            <div
              key={label}
              onClick={() => path && navigate(path)}
              className="action-item"
            >
              <div className={`action-icon-wrap ${iconClass}`}>
                {icon}
              </div>
              <div className="action-label">{label}</div>
              <div className="action-sublabel">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}