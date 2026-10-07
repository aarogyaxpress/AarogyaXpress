// src/components/ScanCard.jsx  –  Swipeable hero card with smooth transitions + physical nav buttons
import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"

const SALE_MEDS = [
  { name: "Paracetamol", original: 50,  sale: 25,  off: "50%" },
  { name: "Amoxicillin", original: 170, sale: 85,  off: "50%" },
  { name: "Vitamin C",   original: 100, sale: 50,  off: "50%" },
  { name: "Cetirizine",  original: 60,  sale: 30,  off: "50%" },
]

const NAV_BTN = {
  base: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 36, height: 36, borderRadius: "50%",
    background: "rgba(255,255,255,0.22)",
    backdropFilter: "blur(8px)",
    border: "1.5px solid rgba(255,255,255,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 10,
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    transition: "background 0.18s, transform 0.15s",
    userSelect: "none",
  }
}

export default function ScanCard() {
  const navigate  = useNavigate()
  const [slide, setSlide] = useState(0)
  const [animDir, setAnimDir] = useState(null) // "left" | "right" | null
  const startX    = useRef(null)
  const animating = useRef(false)
  const TOTAL     = 2

  const goTo = (next) => {
    if (animating.current || next === slide) return
    setAnimDir(next > slide ? "left" : "right")
    animating.current = true
    setTimeout(() => {
      setSlide(next)
      setAnimDir(null)
      animating.current = false
    }, 280)
  }

  /* touch & mouse swipe */
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx < -40 && slide < TOTAL - 1) goTo(slide + 1)
    if (dx >  40 && slide > 0)          goTo(slide - 1)
    startX.current = null
  }
  const onMouseDown = (e) => { startX.current = e.clientX }
  const onMouseUp   = (e) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    if (dx < -40 && slide < TOTAL - 1) goTo(slide + 1)
    if (dx >  40 && slide > 0)          goTo(slide - 1)
    startX.current = null
  }

  /* chevron SVG helper */
  const Chevron = ({ dir }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      {dir === "left"
        ? <polyline points="15 18 9 12 15 6" />
        : <polyline points="9 18 15 12 9 6" />}
    </svg>
  )

  /* slide-in/out animation name */
  const getAnim = (cardIdx) => {
    if (animDir === null) return undefined
    if (cardIdx === slide) return animDir === "left" ? "slideOutLeft" : "slideOutRight"
    if (cardIdx !== slide) {
      const thisNext = animDir === "left" ? slide + 1 : slide - 1
      if (cardIdx === thisNext) return animDir === "left" ? "slideInRight" : "slideInLeft"
    }
    return undefined
  }

  const CARDS = [
    /* ── card 0 – Scan Medicine ── */
    <div key="scan" style={{
      background: "linear-gradient(145deg,#5a6e3a,#3e4e26)",
      borderRadius: 24, padding: "26px 24px 22px",
      position: "relative", overflow: "hidden", minHeight: 200,
    }}>
      <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, background:"rgba(255,255,255,0.06)", borderRadius:"50%" }} />
      <div style={{ position:"absolute", bottom:-50, right:50, width:140, height:140, background:"rgba(255,255,255,0.04)", borderRadius:"50%" }} />

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <span className="tag tag-tech">Tech-Powered</span>
        <span className="tag tag-ai">AI</span>
      </div>

      <div className="hero-right-icons">
        {["✏️","🛡️","📋"].map((ic,i) => (
          <div key={i} className="side-icon"><span style={{ fontSize:16 }}>{ic}</span></div>
        ))}
      </div>

      <div className="hero-title">Scan Medicine</div>
      <div className="hero-subtitle">दवाई स्कैन करें</div>
      <div className="hero-desc">Instantly identify medications and check safety alerts.</div>

      <div className="hero-actions">
        <div className="hero-action-btn btn-white" onClick={() => navigate("/scan")} title="Go to Scanner" style={{ cursor:"pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="3" strokeLinecap="round" width={22} height={22}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <div className="hero-action-btn btn-outline">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width={22} height={22}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
      </div>

      <div className="hero-dots" style={{ marginTop:14 }}>
        {[0,1].map(i => <div key={i} className={`dot${slide===i?" active":""}`} onClick={() => goTo(i)} style={{ cursor:"pointer" }} />)}
      </div>
    </div>,

    /* ── card 1 – Flash Sale ── */
    <div key="sale" style={{
      background: "linear-gradient(145deg,#d05818,#f07830)",
      borderRadius: 24, padding: "22px 22px 20px",
      position: "relative", overflow: "hidden", minHeight: 200,
    }}>
      <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, background:"rgba(255,255,255,0.08)", borderRadius:"50%" }} />
      <div style={{ position:"absolute", bottom:-40, left:10, width:100, height:100, background:"rgba(255,255,255,0.05)", borderRadius:"50%" }} />

      <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
        <span style={{ background:"rgba(255,255,255,0.22)", color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif", letterSpacing:0.3 }}>🔥 Flash Sale</span>
        <span style={{ background:"rgba(255,255,255,0.22)", color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>Ends Tonight</span>
      </div>

      <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:28, fontWeight:900, color:"#fff", lineHeight:1.1, marginBottom:4 }}>Up to 50% OFF</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:14 }}>On all prescription & OTC medicines</div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {SALE_MEDS.slice(0,3).map(m => (
          <div key={m.name} style={{ background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"6px 12px", display:"flex", flexDirection:"column" }}>
            <span style={{ color:"#fff", fontSize:11, fontWeight:800 }}>{m.name}</span>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10 }}>₹{m.sale} <s style={{ opacity:0.5 }}>₹{m.original}</s></span>
          </div>
        ))}
      </div>

      <button onClick={() => navigate("/services", { state: { tab:"medicine", showSale:true } })} style={{
        background:"#fff", border:"none", borderRadius:20, padding:"11px 24px",
        fontSize:14, fontWeight:900, color:"#d05818", fontFamily:"'Nunito',sans-serif",
        cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8,
        boxShadow:"0 4px 16px rgba(0,0,0,0.15)"
      }}>Shop Now →</button>

      <div className="hero-dots" style={{ marginTop:14 }}>
        {[0,1].map(i => <div key={i} className={`dot${slide===i?" active":""}`} onClick={() => goTo(i)} style={{ cursor:"pointer" }} />)}
      </div>
    </div>,
  ]

  return (
    <div className="hero-section" style={{ userSelect:"none" }}>
      {/* keyframe injection */}
      <style>{`
        @keyframes slideInRight  { from { opacity:0; transform:translateX(48px)  } to { opacity:1; transform:translateX(0) } }
        @keyframes slideInLeft   { from { opacity:0; transform:translateX(-48px) } to { opacity:1; transform:translateX(0) } }
        @keyframes slideOutLeft  { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(-48px) } }
        @keyframes slideOutRight { from { opacity:1; transform:translateX(0) } to { opacity:0; transform:translateX(48px) } }
      `}</style>

      {/* wrapper: relative so the arrow buttons can be positioned */}
      <div style={{ position:"relative" }}>
        {/* ←  left arrow (shown when not on first card) */}
        {slide > 0 && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => goTo(slide - 1)}
            // Position the left arrow at the bottom right, next to the right arrow
            style={{ ...NAV_BTN.base, right: 62, left: "auto", top: "auto", bottom: 20, transform: "none" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.38)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          >
            <Chevron dir="left" />
          </button>
        )}

        {/* →  right arrow (shown when not on last card) */}
        {slide < TOTAL - 1 && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => goTo(slide + 1)}
            // Position the right arrow at the bottom right edge
            style={{ ...NAV_BTN.base, right: 16, left: "auto", top: "auto", bottom: 20, transform: "none" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.38)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          >
            <Chevron dir="right" />
          </button>
        )}

        {/* slide viewport */}
        <div
          style={{ overflow:"hidden", borderRadius:24, position:"relative" }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}   onMouseUp={onMouseUp}
        >
          {CARDS.map((card, idx) => {
            const anim = getAnim(idx)
            return (
              <div key={idx} style={{
                display: idx === slide || anim ? "block" : "none",
                animation: anim ? `${anim} 0.28s ease both` : undefined,
                position: anim && idx !== slide ? "absolute" : "relative",
                top: 0, left: 0, width: "100%",
              }}>
                {card}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}