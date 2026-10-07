import { useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { auth } from "../firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"

/* ── pages that get a DARK top bar (scan camera page) ── */
const DARK_PAGES = ["/scan"]

/* ── pages that show a simple back-arrow bar instead of the greeting ── */
const BACK_PAGES = ["/doctors", "/beds", "/reminders", "/analyzer", "/netra", "/xray", "/ambulance", "/services", "/family"]

const PAGE_TITLES = {
  "/doctors"  : "Find Doctors",
  "/beds"     : "Hospital Beds",
  "/reminders": "Reminders",
  "/analyzer" : "Doc Analyser",
  "/netra"    : "Netra AI",
  "/xray"     : "Chest X-ray AI",
  "/ambulance": "Ambulance",
  "/services" : "Our Services",
  "/family"   : "Family Health Hub",
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u))

    /* Google Translate */
    if (!document.getElementById("google-translate-script-tag")) {
      const scriptCode = document.createElement("script")
      scriptCode.innerHTML = `function googleTranslateElementInit(){new window.google.translate.TranslateElement({pageLanguage:'en',autoDisplay:false},'google_translate_element');}`
      document.body.appendChild(scriptCode)
      const script = document.createElement("script")
      script.id  = "google-translate-script-tag"
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      document.body.appendChild(script)
    }

    return () => unsubscribe()
  }, [])

  const isDark = DARK_PAGES.includes(pathname)
  const isBack = BACK_PAGES.includes(pathname)

  const handleLogout = async () => {
    if (window.confirm("Log out?")) await signOut(auth)
  }

  /* ────────────────── DARK (Scan) header ────────────────── */
  if (isDark) {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 20px",
        background: "rgba(13,18,10,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button onClick={() => navigate("/")} style={{
          width: 38, height: 38, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.13)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 18,
        }}>←</button>
        <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 15, fontFamily: "'Nunito',sans-serif" }}>AI Scan</span>
        <div style={{ width: 38 }} />
      </div>
    )
  }

  /* ────────────────── BACK (sub-page) header ────────────────── */
  if (isBack) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px",
        background: "var(--olive-dark)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 36, height: 36, borderRadius: 12, border: "none",
          background: "rgba(255,255,255,0.13)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 17, flexShrink: 0,
        }}>←</button>
        <span style={{
          color: "#fff", fontWeight: 900, fontSize: 17,
          fontFamily: "'Nunito',sans-serif", flex: 1,
        }}>{PAGE_TITLES[pathname] || "AarogyaXpress"}</span>

        {/* Translate */}
        <div style={{ position: "relative" }}>
          <select onChange={(e) => {
            const lang = e.target.value
            document.cookie = lang === "en"
              ? `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              : `googtrans=/en/${lang}; path=/`
            window.location.reload()
          }} style={{
            background: "rgba(255,255,255,0.15)", color: "#fff", border: "none",
            padding: "6px 22px 6px 10px", borderRadius: 12, fontSize: 12,
            fontWeight: 800, cursor: "pointer", fontFamily: "Nunito", appearance: "none", outline: "none",
          }}>
            <option style={{ color: "#000" }} value="en">A/अ</option>
            <option style={{ color: "#000" }} value="hi">हिंदी</option>
            <option style={{ color: "#000" }} value="ta">தமிழ்</option>
            <option style={{ color: "#000" }} value="te">తెలుగు</option>
            <option style={{ color: "#000" }} value="mr">मराठी</option>
          </select>
          <div style={{ pointerEvents: "none", position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 7, color: "#fff" }}>▼</div>
        </div>
        <div id="google_translate_element" style={{ display: "none" }} />
      </div>
    )
  }

  /* ────────────────── HOME header ────────────────── */
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,"

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "18px 22px 16px",
      background: "linear-gradient(140deg, var(--olive-dark) 0%, #4a6030 100%)",
      borderRadius: "0 0 28px 28px",
      boxShadow: "0 8px 32px rgba(30,42,18,0.22)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {/* Left — greeting */}
      <div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito',sans-serif" }}>
          {greeting}
        </div>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, fontFamily: "'Nunito',sans-serif", marginTop: 1 }}>
          {user ? (user.displayName?.split(" ")[0] || user.email?.split("@")[0]) : "Guest"} 👋
        </div>
      </div>

      {/* Right — controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Language picker */}
        <div style={{ position: "relative" }}>
          <select onChange={(e) => {
            const lang = e.target.value
            document.cookie = lang === "en"
              ? `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              : `googtrans=/en/${lang}; path=/`
            window.location.reload()
          }} style={{
            background: "rgba(255,255,255,0.18)", color: "#fff", border: "none",
            padding: "7px 26px 7px 12px", borderRadius: 16, fontSize: 13,
            fontWeight: 800, cursor: "pointer", fontFamily: "Nunito", appearance: "none", outline: "none",
          }}>
            <option style={{ color: "#000" }} value="en">A/अ</option>
            <option style={{ color: "#000" }} value="hi">हिंदी</option>
            <option style={{ color: "#000" }} value="ta">தமிழ்</option>
            <option style={{ color: "#000" }} value="te">తెలుగు</option>
            <option style={{ color: "#000" }} value="mr">मराठी</option>
          </select>
          <div style={{ pointerEvents: "none", position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 7, color: "#fff" }}>▼</div>
        </div>

        {/* Chat icon */}
        <button style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" width={18} height={18}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>

        {/* Avatar / Login */}
        {user ? (
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=8aab5c&color=fff&size=80`}
            alt="Profile"
            onClick={handleLogout}
            title="Tap to log out"
            style={{ width: 40, height: 40, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.8)", cursor: "pointer", objectFit: "cover", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
          />
        ) : (
          <button onClick={() => navigate("/login")} style={{
            background: "#fff", color: "var(--olive-dark)", border: "none",
            borderRadius: 22, padding: "8px 18px", fontSize: 13,
            fontWeight: 800, fontFamily: "'Nunito',sans-serif", cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          }}>Login</button>
        )}
      </div>

      <div id="google_translate_element" style={{ display: "none" }} />
    </div>
  )
}
