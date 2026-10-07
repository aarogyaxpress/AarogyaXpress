// src/components/BottomNav.jsx
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useRef, useState } from "react"

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    // Find the nearest scrollable parent (.scroll-area)
    const scrollEl = document.querySelector(".scroll-area")
    if (!scrollEl) return

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentY = scrollEl.scrollTop
          const delta = currentY - lastY.current
          if (delta > 8 && currentY > 60) {
            setHidden(true)          // scrolling down → hide
          } else if (delta < -6) {
            setHidden(false)         // scrolling up → show
          }
          lastY.current = currentY
          ticking.current = false
        })
        ticking.current = true
      }
    }

    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    return () => scrollEl.removeEventListener("scroll", onScroll)
  }, [pathname])

  const items = [
    {
      path: "/", label: "Home",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      path: "/analyzer", label: "Analyser",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5m4 0h4m4-11v11m0 0h-4m4 0h2a2 2 0 0 0 2-2V9" />
          <circle cx="12" cy="18" r="3" />
          <path d="M12 15v-3" />
        </svg>
      )
    },
    {
      path: "/scan", label: "Scan",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    },
    {
      path: "/family", label: "Family",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      path: "/services", label: "Services",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        </svg>
      )
    },
    {
      path: "/profile", label: "Profile",
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
  ]


  return (
    <div className={`bottom-nav${hidden ? " nav-hidden" : ""}`}>
      {items.map(item => (
        <div
          key={item.path}
          className={`nav-item ${pathname === item.path ? "active" : ""}`}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <div className="nav-label">{item.label}</div>
          {pathname === item.path && (
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--olive)", marginTop: 1 }} />
          )}
        </div>
      ))}
    </div>
  )
}