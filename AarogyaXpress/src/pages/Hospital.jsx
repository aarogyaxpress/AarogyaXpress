import { useState } from "react"
import { Flashlight, Upload, ScanLine } from "lucide-react"

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)

  const startScan = () => {
    setScanning(true)
    setTimeout(() => setScanning(false), 3000)
  }

  return (
    <div style={{ padding: "18px 18px 32px", fontFamily: "'Nunito', sans-serif" }}>

      {/*Title Section*/}
      <p style={{ fontSize: 22, fontWeight: 900, color: "#1e2a12", margin: "0 0 4px" }}>Scan Medicine</p>
      <p style={{ fontSize: 12, color: "#8a9a7a", margin: "0 0 16px" }}>दवाई स्कैन करें — AI-powered identification</p>

      {/* Scanner */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 26, overflow: "hidden", background: "#0a0a0a", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
        <img
          src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
          alt="scanner"
        />

        {/* frame */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "78%", height: "78%", border: "1.5px solid rgba(138,171,92,0.7)", borderRadius: 22, position: "relative", overflow: "hidden" }}>
            {/* corners */}
            {[
              { top: 0, left: 0, borderTop: true, borderLeft: true },
              { top: 0, right: 0, borderTop: true, borderRight: true },
              { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
              { bottom: 0, right: 0, borderBottom: true, borderRight: true },
            ].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                width: 24, height: 24,
                ...pos,
                borderWidth: 3,
                borderStyle: "solid",
                borderColor: "transparent",
                borderTopColor: pos.borderTop ? "#8aab5c" : "transparent",
                borderBottomColor: pos.borderBottom ? "#8aab5c" : "transparent",
                borderLeftColor: pos.borderLeft ? "#8aab5c" : "transparent",
                borderRightColor: pos.borderRight ? "#8aab5c" : "transparent",
                borderTopLeftRadius: pos.borderTop && pos.borderLeft ? 10 : 0,
                borderTopRightRadius: pos.borderTop && pos.borderRight ? 10 : 0,
                borderBottomLeftRadius: pos.borderBottom && pos.borderLeft ? 10 : 0,
                borderBottomRightRadius: pos.borderBottom && pos.borderRight ? 10 : 0,
              }} />
            ))}
            {/* scan line */}
            {scanning && (
              <div style={{
                position: "absolute", width: "100%", height: 2,
                background: "linear-gradient(90deg, transparent, #8aab5c, transparent)",
                animation: "scanLine 2s linear infinite",
              }} />
            )}
          </div>
        </div>

        {/* Shows the Ai badge*/}
        <div style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(90,110,58,0.35)", backdropFilter: "blur(8px)",
          padding: "5px 12px", borderRadius: 20,
          border: "1px solid rgba(138,171,92,0.4)",
          fontSize: 11, fontWeight: 700, color: "rgba(200,230,140,0.95)",
        }}>
          AI Scanner Active
        </div>

        {/* controls */}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 20 }}>
          <button style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Flashlight size={20} color="#fff" />
          </button>
          <button
            onClick={startScan}
            style={{
              width: 62, height: 62, borderRadius: "50%",
              background: "linear-gradient(135deg, #8aab5c 0%, #5a6e3a 100%)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(90,110,58,0.55)", cursor: "pointer",
            }}
          >
            <ScanLine size={26} color="#fff" />
          </button>
          <button style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Upload size={20} color="#fff" />
          </button>
        </div>

        <style>{`
          @keyframes scanLine {
            0%   { top: 10%; }
            50%  { top: 85%; }
            100% { top: 10%; }
          }
        `}</style>
      </div>

      {/* This part of the code is here for results */}
      <div style={{ marginTop: 16, background: "#fff", borderRadius: 22, padding: 20, boxShadow: "0 3px 16px rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 16, fontWeight: 900, color: "#1e2a12", margin: "0 0 2px" }}>Scanning Results</p>
        <p style={{ fontSize: 11, color: "#8a9a7a", margin: "0 0 14px" }}>Real-time AI analysis</p>

        {[
          { label: "Medicine Name", value: scanning ? "Detecting…" : "--", highlight: true },
          { label: "Composition", value: "--" },
          { label: "Dosage Advice", value: "--" },
        ].map(({ label, value, highlight }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #eae8e0", borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#8a9a7a" }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: highlight ? "#5a6e3a" : "#c0bdb5" }}>{value}</span>
          </div>
        ))}

        <button style={{
          marginTop: 6, width: "100%",
          background: "linear-gradient(135deg, #8aab5c 0%, #5a6e3a 100%)",
          color: "#fff", border: "none", borderRadius: 14,
          padding: "13px", fontSize: 14, fontWeight: 800,
          fontFamily: "'Nunito', sans-serif", cursor: "pointer",
        }}>
          Save Scan Result
        </button>
      </div>

      {/* Built by Kartikey For Recent Scans */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: "#1e2a12", margin: 0 }}>Recent Scans</p>
          <span style={{ fontSize: 12, color: "#5a6e3a", fontWeight: 700, cursor: "pointer" }}>Clear History</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { name: "Paracetamol 500mg", note: "Verified · 2h ago" },
            { name: "Amoxicillin", note: "Prescription · Yesterday" },
          ].map((s) => (
            <div key={s.name} style={{ background: "#fff", border: "1px solid #eae8e0", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#1e2a12", margin: "0 0 3px" }}>{s.name}</p>
              <p style={{ fontSize: 11, color: "#8a9a7a", margin: 0 }}>{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}