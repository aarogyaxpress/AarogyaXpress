// src/components/FeatureCards.jsx
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"
import { auth } from "../firebase"

const ELEVENLABS_API_KEY = "138535830db5ae3780aeaedf65561ff9039a0947b6d94cccba3d900f72d86c8f"
const ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"

async function speakWithElevenLabs(text) {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      })
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => URL.revokeObjectURL(url)
  } catch (e) {
    console.warn("ElevenLabs TTS error:", e)
  }
}

const QUICK_PROMPTS = [
  "I have a headache",
  "Check my blood sugar",
  "Book a doctor",
  "Find medicines",
]

const AI_REPLIES = {
  headache: "For a headache, try rest in a dark room, drink water, and take Paracetamol 500mg if needed. If it persists over 2 days, see a doctor.",
  blood: "Normal fasting blood sugar is 70–99 mg/dL. If your reading is above 126 mg/dL on two tests, consult an endocrinologist.",
  doctor: "I can help you find a doctor! Head to the Doctors section via Quick Actions or tap the Doctor shortcut below.",
  medicine: "Visit the Services tab → Medicine section to browse prescriptions and OTC medicines. You can also use Doc Analyser to scan your prescription!",
}

function getAiReply(msg) {
  const m = msg.toLowerCase()
  if (m.includes("head") || m.includes("pain")) return AI_REPLIES.headache
  if (m.includes("blood") || m.includes("sugar") || m.includes("glucose")) return AI_REPLIES.blood
  if (m.includes("doctor") || m.includes("book") || m.includes("appoint")) return AI_REPLIES.doctor
  if (m.includes("medic") || m.includes("drug") || m.includes("tablet") || m.includes("pill")) return AI_REPLIES.medicine
  return `I'm Aarogya AI, your personal health assistant 🌿. You asked: "${msg}". For detailed advice, please consult a qualified doctor. I can help with symptoms, medicines, and booking visits!`
}

function AarogyaAIChat({ onClose }) {
  const [messages, setMessages] = useState([
    { from: "ai", text: "Namaste! 🌿 I'm Aarogya AI, your personal health assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState("")
  const [speaking, setSpeaking] = useState(false)
  const [typing, setTyping] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, typing])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput("")
    setMessages(m => [...m, { from: "user", text: msg }])
    setTyping(true)
    await new Promise(r => setTimeout(r, 900))
    const reply = getAiReply(msg)
    setTyping(false)
    setMessages(m => [...m, { from: "ai", text: reply }])
    // Speak the reply
    setSpeaking(true)
    await speakWithElevenLabs(reply)
    setSpeaking(false)
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#f5f2eb", borderRadius: "26px 26px 0 0", width: "100%", maxWidth: 480, height: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 44px rgba(0,0,0,0.22)", fontFamily: "'Nunito',sans-serif" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1e5f74,#2e7d9a)", borderRadius: "26px 26px 0 0", padding: "16px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>Aarogya AI {speaking && <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 8, marginLeft: 6 }}>🔊 Speaking…</span>}</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600 }}>AI Health Assistant · Powered by ElevenLabs</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10, width: 34, height: 34, color: "#fff", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: 8, padding: "10px 14px 4px", overflowX: "auto", scrollbarWidth: "none" }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => sendMessage(p)} style={{ flexShrink: 0, background: "#fff", border: "1.5px solid #c8ddb0", borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, color: "#3e4e26", cursor: "pointer", fontFamily: "'Nunito',sans-serif", whiteSpace: "nowrap" }}>{p}</button>
          ))}
        </div>

        {/* Chat messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
              {m.from === "ai" && <div style={{ width: 28, height: 28, borderRadius: 10, background: "linear-gradient(135deg,#1e5f74,#2e7d9a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>🤖</div>}
              <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: 18, fontSize: 13, lineHeight: 1.55, fontWeight: 600, background: m.from === "user" ? "linear-gradient(135deg,#3e4e26,#5a6e3a)" : "#fff", color: m.from === "user" ? "#fff" : "#1e2a12", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderBottomRightRadius: m.from === "user" ? 4 : 18, borderBottomLeftRadius: m.from === "ai" ? 4 : 18 }}>{m.text}</div>
            </div>
          ))}
          {typing && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 10, background: "linear-gradient(135deg,#1e5f74,#2e7d9a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ background: "#fff", borderRadius: 18, borderBottomLeftRadius: 4, padding: "10px 16px", display: "flex", gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                {[0,1,2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2e7d9a", display: "inline-block", animation: `bounce 1s ${d*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 14px 20px", borderTop: "1px solid #f0ede5", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask anything about your health…"
            style={{ flex: 1, background: "#fff", border: "1.5px solid #d8e8c0", borderRadius: 16, padding: "12px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito',sans-serif", outline: "none", color: "#1e2a12" }}
          />
          <button onClick={() => sendMessage()} style={{ background: "linear-gradient(135deg,#3e4e26,#5a6e3a)", border: "none", borderRadius: 16, width: 46, height: 46, color: "#fff", fontSize: 20, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      </div>
    </div>
  )
}

// ─── Smart frequency → time mapper ────────────────────────────────────────────
function frequencyToTime(freq) {
  if (!freq) return ["14:00"];
  const f = freq.toLowerCase();
  if (f.includes("once") || f.includes("1x") || f.includes("od") || f.includes("qd"))
    return ["14:00"]; // 2 PM once a day
  if (f.includes("twice") || f.includes("2x") || f.includes("bd") || f.includes("bid"))
    return ["09:00", "21:00"]; // 9 AM and 9 PM
  if (f.includes("three") || f.includes("3x") || f.includes("tid") || f.includes("tds"))
    return ["08:00", "14:00", "20:00"]; // 8 AM, 2 PM, 8 PM
  if (f.includes("four") || f.includes("4x") || f.includes("qid") || f.includes("qds"))
    return ["08:00", "12:00", "16:00", "20:00"];
  if (f.includes("morning") || f.includes("breakfast")) return ["08:00"];
  if (f.includes("night") || f.includes("bedtime") || f.includes("sleep")) return ["21:00"];
  if (f.includes("afternoon") || f.includes("lunch")) return ["13:30"];
  return ["14:00"];
}

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  return `${((h % 12) || 12)}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default function FeatureCards() {
  const navigate = useNavigate()
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiOpen, setAiOpen] = useState(false)

  // 1. Draggable Moods & Emoji
  const [moodEmoji, setMoodEmoji] = useState("😄")
  const [moodLvl, setMoodLvl] = useState(78)
  const [energyLvl, setEnergyLvl] = useState(61)
  const [painLvl, setPainLvl] = useState(54)

  // 2. Editable Times
  const [mealTimes, setMealTimes] = useState({
    Breakfast: "08:00",
    Lunch: "13:00",
    Dinner: "20:00",
  })
  const [medTimes, setMedTimes] = useState({}) // overrides for meds
  const [editingKey, setEditingKey] = useState(null)
  
  const handleTimeChange = (key, val, isMeal) => {
    if (isMeal) setMealTimes(prev => ({...prev, [key]: val}))
    else setMedTimes(prev => ({...prev, [key]: val}))
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: dbUser } = await supabase
          .from("users").select("id").eq("firebase_uid", user.uid).single();
        if (!dbUser) { setLoading(false); return; }

        const { data: meds } = await supabase
          .from("medicines")
          .select("id,name,dosage,instructions,pills_remaining,created_at")
          .eq("user_id", dbUser.id)
          .order("created_at", { ascending: false })
          .limit(10);

        setMedicines(meds || []);
      } catch (e) {
        console.error("Failed to fetch medicines:", e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Build meal+med schedule from medicines
  const schedule = medicines.flatMap((med, i) => {
    const times = frequencyToTime(med.instructions || "");
    return times.map((t, idx) => {
      const key = `${med.name}-${idx}`
      return { key, isMeal: false, name: med.name, dose: med.dosage || "", time: medTimes[key] || t, emoji: "💊" }
    })
  });

  // Add standard meals if no conflicts
  const mealSlots = [
    { key: "Breakfast", isMeal: true, name: "Breakfast", dose: "Nutritious meal", time: mealTimes.Breakfast, emoji: "🥗" },
    { key: "Lunch", isMeal: true, name: "Lunch", dose: "Balanced diet", time: mealTimes.Lunch, emoji: "🍱" },
    { key: "Dinner", isMeal: true, name: "Dinner", dose: "Light meal", time: mealTimes.Dinner, emoji: "🥘" },
  ];
  const combined = [...mealSlots, ...schedule].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      {/* FEATURE CARDS */}
      <div className="section-header">
        <div>
          <div className="section-title">Health Tools</div>
          <div className="section-subtitle">स्वास्थ्य सेवाएं</div>
        </div>
      </div>

      <div className="feature-cards">
        {/* Netra AI */}
        <div className="feature-card olive-card" onClick={() => navigate("/netra")}>
          <div className="feature-card-text">
            <div className="feature-tags">
              <span className="feature-tag">Tech-Powered</span>
              <span className="feature-tag">AI</span>
            </div>
            <div className="feature-title">Netra.AI</div>
            <div className="feature-desc">Retinal fundus screening research prototype</div>
          </div>
          <div className="feature-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="feature-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>

        <div className="feature-card teal-card" onClick={() => navigate("/xray")}>
          <div className="feature-card-text">
            <div className="feature-tags">
              <span className="feature-tag">Research</span>
              <span className="feature-tag">X-ray</span>
            </div>
            <div className="feature-title">Chest X-ray</div>
            <div className="feature-desc">Open-source screening baseline · clinician review required</div>
          </div>
          <div className="feature-icon-wrap"><span style={{ fontSize: 24 }}>🩻</span></div>
          <div className="feature-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg></div>
        </div>

        {/* Doc Analyser — replaces Bed Finder in cards */}
        <div className="feature-card red-card" onClick={() => navigate("/analyzer")}>
          <div className="feature-card-text">
            <div className="feature-tags">
              <span className="feature-tag">AI-Powered</span>
              <span className="feature-tag">Aarogyam AI</span>
            </div>
            <div className="feature-title">Doc Analyser</div>
            <div className="feature-desc">Scan prescriptions &amp; blood reports with AI</div>
          </div>
          <div className="feature-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12h6M9 16h6M9 8h3" /><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <div className="feature-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>

        {/* Safe Records */}
        <div className="feature-card teal-card" onClick={() => navigate("/profile")}>
          <div className="feature-card-text">
            <div className="feature-tags">
              <span className="feature-tag">Safe</span>
              <span className="feature-tag">Health Records</span>
            </div>
            <div className="feature-title">My Records</div>
            <div className="feature-desc">Store &amp; access your health history securely</div>
          </div>
          <div className="feature-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          </div>
          <div className="feature-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>

        <div className="feature-card olive-card" onClick={() => navigate("/fingerprint-research")}>
          <div className="feature-card-text">
            <div className="feature-tags">
              <span className="feature-tag">Research</span>
              <span className="feature-tag">Experimental</span>
            </div>
            <div className="feature-title">Fingerprint blood group</div>
            <div className="feature-desc">Explore the model as a research demo</div>
          </div>
          <div className="feature-icon-wrap"><span style={{ fontSize: 24 }}>🖐️</span></div>
          <div className="feature-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg></div>
        </div>
      </div>

      {/* PILL TRACKER */}
      <div className="section-header">
        <div>
          <div className="section-title">Pill Tracker</div>
          <div className="section-subtitle">दवाई ट्रैकर</div>
        </div>
        <a href="#" className="view-all" onClick={e => { e.preventDefault(); navigate("/reminders"); }}>View All →</a>
      </div>

      <div className="pill-tracker-section">
        {loading ? (
          <div style={{ textAlign: "center", padding: "28px 20px", color: "#8a9a7a", fontSize: 13 }}>
            <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>⏳</span>
            Loading your medicines…
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-8 px-4 text-gray-500 bg-white mx-5 rounded-[24px] shadow-sm border border-gray-100">
            <span className="text-3xl mb-2 block">💊</span>
            <span className="font-bold text-gray-700 block mb-1">No medicines tracked yet</span>
            <span className="text-xs font-medium">Scan or analyse a document to add medicines!</span>
          </div>
        ) : (
          medicines.map((med, idx) => {
            const times = frequencyToTime(med.instructions || "");
            return (
              <div className="pill-card mb-4" key={med.id || idx}>
                <div className="pill-card-header">
                  <div className="pill-emoji-wrap">💊</div>
                  <div className="pill-info">
                    <div className="pill-name">{med.name}</div>
                    <div className="pill-details">
                      {med.dosage || "—"} · {times.map(fmtTime).join(", ")}
                    </div>
                  </div>
                  <div className="pill-count-badge">
                    {med.pills_remaining ?? "—"}
                    <span>pills left</span>
                  </div>
                </div>
                <div className="pill-progress-row">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`pill-dot ${i < 3 ? "taken" : i === 3 ? "missed" : "pending"}`}>
                      {i < 3 ? "✅" : i === 3 ? "❌" : ""}
                    </div>
                  ))}
                </div>
                <button className="refill-btn" onClick={() => navigate("/reminders")}>Manage Reminder</button>
              </div>
            );
          })
        )}
      </div>

      {/* SYNC MEALS & MEDS */}
      <div className="section-header">
        <div>
          <div className="section-title">🥗 Sync Meals &amp; Meds</div>
          <div className="section-subtitle">
            {loading ? "Loading schedule…" : `${medicines.length} meds · ${combined.length} events today`}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <div className="meals-card">
          {combined.slice(0, 6).map((item, i) => (
            <div className="meal-item" key={i}>
              <div className="meal-emoji-wrap">{item.emoji}</div>
              <div className="meal-info">
                <div className="meal-name">{item.name}</div>
                <div className="meal-detail">{item.dose}</div>
              </div>
              <div className="meal-time">
                {editingKey === item.key ? (
                  <input 
                    type="time" 
                    value={item.time} 
                    onChange={e => handleTimeChange(item.key, e.target.value, item.isMeal)}
                    onBlur={() => setEditingKey(null)}
                    autoFocus
                    style={{ background: "#eef5e8", border: "1px solid #c8ddb0", borderRadius: 8, padding: "2px 4px", fontSize: 13, outline: "none", color: "#3e4e26", fontWeight: 700 }}
                  />
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }} onClick={() => setEditingKey(item.key)}>
                    {fmtTime(item.time)}
                    <span style={{ fontSize: 13, color: "var(--olive)", opacity: 0.6 }}>✏️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {combined.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "16px 0", color: "#8a9a7a", fontSize: 12 }}>
              No schedule yet · Add medicines to see your daily plan
            </div>
          )}
        </div>
      </div>

      {/* MOOD & SYMPTOMS */}
      <div className="section-header">
        <div>
          <div className="section-title">😊 Mood &amp; Symptoms</div>
          <div className="section-subtitle">Track how you feel today</div>
        </div>
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <div className="mood-card">
          {/* EMOJI SELECTOR */}
          <div className="mood-row" style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
            {[
              { e: "😄", l: "Great" },
              { e: "😌", l: "Good" },
              { e: "😐", l: "Okay" },
              { e: "🤒", l: "Sick" },
              { e: "😠", l: "Pain" }
            ].map(m => (
              <div 
                key={m.e} 
                onClick={() => setMoodEmoji(m.e)}
                style={{ 
                  display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer",
                  transform: moodEmoji === m.e ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.2s"
                }}
              >
                <div style={{ fontSize: 32, filter: moodEmoji === m.e ? "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" : "grayscale(30%) opacity(70%)" }}>{m.e}</div>
                <div style={{ fontSize: 11, fontWeight: moodEmoji === m.e ? 800 : 600, color: moodEmoji === m.e ? "var(--olive-dark)" : "var(--olive)", marginTop: 4 }}>{m.l}</div>
              </div>
            ))}
          </div>

          {/* RANGE BAR: MOOD */}
          <div className="symptom-row">
            <div className="symptom-icon">{moodEmoji}</div><div className="symptom-label">Mood</div>
            <div className="symptom-track" style={{ position: "relative", overflow: "visible", background: "transparent" }}>
              <input type="range" min="0" max="100" value={moodLvl} onChange={e => setMoodLvl(Number(e.target.value))} className="modern-range fill-mood" style={{ '--val': `${moodLvl}%` }}/>
            </div>
            <div className="symptom-pct">{moodLvl}%</div>
          </div>

          {/* RANGE BAR: ENERGY */}
          <div className="symptom-row">
            <div className="symptom-icon">⚡</div><div className="symptom-label">Energy</div>
            <div className="symptom-track" style={{ position: "relative", overflow: "visible", background: "transparent" }}>
              <input type="range" min="0" max="100" value={energyLvl} onChange={e => setEnergyLvl(Number(e.target.value))} className="modern-range fill-energy" style={{ '--val': `${energyLvl}%` }}/>
            </div>
            <div className="symptom-pct">{energyLvl}%</div>
          </div>

          {/* RANGE BAR: PAIN */}
          <div className="symptom-row">
            <div className="symptom-icon">🔥</div><div className="symptom-label">Pain</div>
            <div className="symptom-track" style={{ position: "relative", overflow: "visible", background: "transparent" }}>
              <input type="range" min="0" max="100" value={painLvl} onChange={e => setPainLvl(Number(e.target.value))} className="modern-range fill-pain" style={{ '--val': `${painLvl}%` }}/>
            </div>
            <div className="symptom-pct">{painLvl}%</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ACTION BANNERS */}
      {/* ══════════════════════════════════════════ */}
      <div className="section-header">
        <div>
          <div className="section-title">⚡ Quick Services</div>
          <div className="section-subtitle">तत्काल सेवाएं</div>
        </div>
      </div>

      {/* Emergency Ambulance */}
      <div className="action-banner red" onClick={() => navigate("/ambulance")}>
        <div className="ab-icon-wrap">🚑</div>
        <div className="ab-text">
          <div className="ab-title">Emergency Ambulance</div>
          <div className="ab-sub">Free govt. service 24/7</div>
        </div>
        <button className="ab-btn" onClick={e => { e.stopPropagation(); navigate("/ambulance") }}>Book</button>
      </div>

      {/* Shop Medicines */}
      <div className="action-banner orange" onClick={() => navigate("/services")}>
        <div className="ab-icon-wrap">💊</div>
        <div className="ab-text">
          <div className="ab-title">Shop Medicines</div>
          <div className="ab-sub">Order online · Up to 30% off</div>
        </div>
        <button className="ab-btn" onClick={e => { e.stopPropagation(); navigate("/services") }}>Shop</button>
      </div>

      {/* Chat with Aarogya AI */}
      <div className="action-banner teal-ai" onClick={() => setAiOpen(true)}>
        <div className="ab-icon-wrap">🤖</div>
        <div className="ab-text">
          <div className="ab-title">Chat with Aarogya AI ✨</div>
          <div className="ab-sub">Ask health questions, get instant help</div>
        </div>
        <button className="ab-btn" onClick={e => { e.stopPropagation(); setAiOpen(true) }}>Chat</button>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* GOVERNMENT SCHEMES */}
      {/* ══════════════════════════════════════════ */}
      <div className="section-header">
        <div>
          <div className="section-title">🏛️ Government Schemes</div>
          <div className="section-subtitle">सरकारी योजनाएं</div>
        </div>
      </div>

      <div className="govt-schemes" style={{ paddingBottom: 14 }}>
        <div className="scheme-card red-scheme">
          <div className="scheme-icon">❤️</div>
          <div className="scheme-name">Ayushman Bharat</div>
          <div className="scheme-sub">₹5 lakh free treatment</div>
        </div>
        <div className="scheme-card blue-scheme">
          <div className="scheme-icon">📊</div>
          <div className="scheme-name">PM-JAY</div>
          <div className="scheme-sub">Health insurance</div>
        </div>
        <div className="scheme-card green-scheme">
          <div className="scheme-icon">💊</div>
          <div className="scheme-name">Jan Aushadhi</div>
          <div className="scheme-sub">Affordable medicines</div>
        </div>
        <div className="scheme-card purple-scheme">
          <div className="scheme-icon">🏥</div>
          <div className="scheme-name">e-Sanjeevani</div>
          <div className="scheme-sub">Free telemedicine</div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* ══════════════════════════════════════════ */}
      {/* AI CHAT MODAL */}
      {/* ══════════════════════════════════════════ */}
      {aiOpen && <AarogyaAIChat onClose={() => setAiOpen(false)} />}
    </>
  )
}
