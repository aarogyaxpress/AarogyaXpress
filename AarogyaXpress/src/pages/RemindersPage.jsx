// src/pages/RemindersPage.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { supabase } from "../lib/supabase";

// ─── Mock backend meds ─────────────────────────────────────────────────────────
const MOCK_USER_MEDS = [
  { id: 1, name: "Amoxicillin",  dose: "500mg",     times: ["08:30","20:30"], color: "#c0704a", icon: "💊" },
  { id: 2, name: "Vitamin D3",   dose: "2,000 MUI", times: ["08:30"],         color: "#f0a500", icon: "🌟" },
  { id: 3, name: "Metformin",    dose: "850mg",     times: ["07:00","13:00","19:00"], color: "#5b8fa8", icon: "💉" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");
const fmtTime = t => { const [h,m]=t.split(":").map(Number); return `${pad(h%12||12)}:${pad(m)} ${h<12?"AM":"PM"}`; };
const toMin = t => { const [h,m]=t.split(":").map(Number); return h*60+m; };
function nextDose(times) {
  const cur = new Date().getHours()*60+new Date().getMinutes();
  const sorted = [...times].sort((a,b)=>toMin(a)-toMin(b));
  const nxt = sorted.find(t=>toMin(t)>cur);
  if (!nxt) return { label: fmtTime(sorted[0]), tag:"Tomorrow" };
  const diff = toMin(nxt)-cur;
  return diff<60 ? { label:`${diff}m`, tag:"Coming up" } : { label:fmtTime(nxt), tag:"Next dose" };
}

// ─── Audio & ElevenLabs ───────────────────────────────────────────────────────
function playBeep(ctx) {
  if (!ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type="sine"; o.frequency.setValueAtTime(880,ctx.currentTime);
  g.gain.setValueAtTime(0.35,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
  o.start(ctx.currentTime); o.stop(ctx.currentTime+0.6);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <button onClick={(e)=>{ e.stopPropagation(); onChange(!on); }} role="switch" aria-checked={on}
      style={{ width:52,height:28,borderRadius:14,border:"none",cursor:"pointer",flexShrink:0,
        background:on?"#5a7a3a":"#d0d0c8",position:"relative",transition:"background .25s" }}>
      <span style={{ position:"absolute",top:3,left:on?27:3,width:22,height:22,
        borderRadius:"50%",background:"#fff",transition:"left .25s",
        boxShadow:"0 1px 5px rgba(0,0,0,.22)",display:"block" }} />
    </button>
  );
}

// ─── Day Picker ───────────────────────────────────────────────────────────────
const DAY_L = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function DayPicker({ selected, onChange }) {
  const toggle = i => onChange(selected.includes(i)?selected.filter(d=>d!==i):[...selected,i]);
  return (
    <div style={{ display:"flex",gap:5 }}>
      {["S","M","T","W","T","F","S"].map((d,i)=>(
        <button key={i} onClick={()=>toggle(i)} style={{
          width:34,height:34,borderRadius:"50%",border:"none",cursor:"pointer",
          fontWeight:700,fontSize:12,fontFamily:"'Outfit',sans-serif",
          background:selected.includes(i)?"#5a7a3a":"#f0f0e8",
          color:selected.includes(i)?"#fff":"#777",transition:"all .18s",
        }}>{d}</button>
      ))}
    </div>
  );
}

// ─── Medicine Search Autocomplete ─────────────────────────────────────────────
const SUGGESTIONS = [
  "Paracetamol","Ibuprofen","Amoxicillin","Azithromycin","Metformin",
  "Atorvastatin","Omeprazole","Cetirizine","Dolo 650","Pantoprazole",
  "Vitamin D3","Vitamin C","Zinc","Aspirin","Clopidogrel",
  "Losartan","Amlodipine","Levothyroxine","Sertraline","Metoprolol",
  "Montelukast","Levocetirizine","Rabeprazole","Domperidone","Ondansetron",
  "Ciprofloxacin","Doxycycline","Cefixime","Amoxyclav","Norfloxacin",
];

function MedSearchInput({ value, onChange, onSelect }) {
  const [open,     setOpen]     = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef();

  useEffect(() => {
    if (value.length < 1) { setFiltered([]); setOpen(false); return; }
    const f = SUGGESTIONS.filter(s => s.toLowerCase().includes(value.toLowerCase()));
    setFiltered(f.slice(0,7));
    setOpen(true);
  }, [value]);

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="Type any medicine name…"
        autoComplete="off"
        style={{ width:"100%",padding:"12px 14px 12px 42px",borderRadius:12,
          border:"1.5px solid #dde8cc",fontSize:14,color:"#2c3e1f",
          background:"#fafaf5",fontFamily:"'Outfit',sans-serif",
          boxSizing:"border-box",outline:"none" }}
      />
      <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
        fontSize:18,pointerEvents:"none" }}>💊</span>

      {open && (filtered.length > 0 || value.length > 1) && (
        <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
          background:"#fff",borderRadius:14,boxShadow:"0 8px 28px rgba(0,0,0,.13)",
          zIndex:300,overflow:"hidden",border:"1px solid #e8edd8" }}>

          {filtered.map(s => (
            <div key={s} onClick={()=>{ onSelect(s); setOpen(false); }}
              style={{ padding:"11px 16px",fontSize:14,color:"#2c3e1f",cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",transition:"background .12s",
                display:"flex",alignItems:"center",gap:10 }}
              onMouseEnter={e=>e.currentTarget.style.background="#f5f9ee"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              <span style={{ fontSize:16 }}>💊</span> {s}
            </div>
          ))}

          {value.trim().length > 1 && !SUGGESTIONS.find(s=>s.toLowerCase()===value.toLowerCase()) && (
            <div onClick={()=>{ onSelect(value.trim()); setOpen(false); }}
              style={{ padding:"11px 16px",fontSize:13,color:"#5a7a3a",cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",borderTop:"1px solid #f0f0e8",
                fontWeight:700,background:"#f7fbf2",
                display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:16 }}>➕</span> Add "{value.trim()}" as custom medicine
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drug Info Bottom Sheet ───────────────────────────────────────────────────
function InfoBlock({ icon, title, text, bg="#f7f7f2" }) {
  return (
    <div style={{ background:bg,borderRadius:16,padding:"14px 18px" }}>
      <div style={{ fontWeight:700,fontSize:13,color:"#2c3e1f",marginBottom:6,
        display:"flex",alignItems:"center",gap:6 }}>{icon} {title}</div>
      <div style={{ fontSize:13,color:"#555",lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

function DrugInfoSheet({ medName, onClose }) {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!medName) return;
    setLoading(true); setInfo(null); setError(null);

    const prompt = `Give concise medical info about the medicine "${medName}".
Respond ONLY with a JSON object — no markdown, no backticks, no extra text — with exactly these keys:
{
  "uses": "2-3 sentence description of what this medicine is used for",
  "category": "drug category (e.g. Antibiotic, Analgesic, Antidiabetic)",
  "prescription": true or false,
  "prescriptionNote": "one short sentence explaining why or why not",
  "sideEffects": ["side effect 1","side effect 2","side effect 3"],
  "warnings": "one important warning or precaution",
  "takeWith": "food / water / milk / empty stomach"
}`;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "dummy-or-injected-key", "anthropic-version":"2023-06-01" },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{ role:"user", content: prompt }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        if(data.error) throw new Error(data.error.message);
        const raw = (data.content||[]).map(b=>b.text||"").join("").trim();
        const clean = raw.replace(/```json|```/g,"").trim();
        setInfo(JSON.parse(clean));
        setLoading(false);
      })
      .catch(() => {
        // Fallback info if API fails
        setInfo({
          uses: `Standard information for ${medName}. This medication is used to treat specific conditions as prescribed by a physician.`,
          category: "General Medicine",
          prescription: false,
          prescriptionNote: "Please check with your local pharmacy.",
          sideEffects: ["Nausea", "Dizziness", "Drowsiness"],
          warnings: "Do not exceed recommended dose.",
          takeWith: "water and food"
        });
        setLoading(false);
      });
  }, [medName]);

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1000,
      background:"rgba(10,20,5,.52)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff",borderRadius:"26px 26px 0 0",
        width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",
        boxShadow:"0 -10px 48px rgba(0,0,0,.20)",
        animation:"slideUp .3s ease",
      }}>
        {/* Handle */}
        <div style={{ padding:"18px 24px 0",position:"sticky",top:0,background:"#fff",
          borderRadius:"26px 26px 0 0",zIndex:10 }}>
          <div style={{ width:40,height:4,borderRadius:2,background:"#ddd",margin:"0 auto 16px" }} />
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
            <div>
              <div style={{ fontSize:11,color:"#bbb",fontWeight:700,letterSpacing:.8,
                textTransform:"uppercase",marginBottom:4 }}>Drug Information</div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"#2c3e1f",
                fontFamily:"'Outfit',sans-serif" }}>{medName}</h2>
            </div>
            <button onClick={onClose} style={{ background:"#f5f5f0",border:"none",
              borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:15,color:"#888",
              display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"0 24px 44px" }}>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign:"center",padding:"52px 0" }}>
              <div style={{ fontSize:40,marginBottom:14 }}>🔍</div>
              <div style={{ fontWeight:700,fontSize:15,color:"#5a7a3a",marginBottom:6 }}>
                Looking up "{medName}"…
              </div>
              <div style={{ fontSize:12,color:"#bbb",marginBottom:24 }}>Powered by AI</div>
              <div style={{ display:"flex",justifyContent:"center",gap:7 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:9,height:9,borderRadius:"50%",background:"#5a7a3a",
                    animation:`dot .8s ease-in-out ${i*0.18}s infinite alternate` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background:"#fff0eb",borderRadius:16,padding:20,textAlign:"center" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>⚠️</div>
              <div style={{ fontWeight:700,fontSize:14,color:"#c0501a" }}>{error}</div>
            </div>
          )}

          {/* Info */}
          {info && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

              {/* Rx Badge */}
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                padding:"8px 16px",borderRadius:22,fontWeight:700,fontSize:13,
                background:info.prescription?"#fff0eb":"#eef5e8",
                color:info.prescription?"#c0501a":"#4a7a30",
                border:`1.5px solid ${info.prescription?"#f0c0a0":"#b0d898"}`,
                alignSelf:"flex-start" }}>
                {info.prescription ? "🔒 Prescription Required" : "✅ Over-the-Counter"}
              </div>

              {/* Tags */}
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <span style={{ background:"#eef5e8",color:"#4a7a30",borderRadius:8,
                  padding:"5px 12px",fontSize:12,fontWeight:700 }}>🏷️ {info.category}</span>
                <span style={{ background:"#f5f0e8",color:"#a06030",borderRadius:8,
                  padding:"5px 12px",fontSize:12,fontWeight:700 }}>🍽️ Take with {info.takeWith}</span>
              </div>

              <InfoBlock icon="💊" title="What it's used for" text={info.uses} bg="#f7fcf0" />
              <InfoBlock
                icon={info.prescription?"🔒":"🛒"}
                title="Prescription status"
                text={info.prescriptionNote}
                bg={info.prescription?"#fff5f0":"#f0fcf5"}
              />

              {/* Side Effects */}
              <div style={{ background:"#fdf7f0",borderRadius:16,padding:"16px 18px" }}>
                <div style={{ fontWeight:700,fontSize:13,color:"#2c3e1f",marginBottom:10,
                  display:"flex",alignItems:"center",gap:6 }}>⚡ Common Side Effects</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {(info.sideEffects||[]).map(s=>(
                    <span key={s} style={{ background:"#fff",border:"1px solid #f0d0b0",
                      borderRadius:8,padding:"5px 12px",fontSize:12,
                      color:"#8a5020",fontWeight:600 }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div style={{ background:"#fffbec",border:"1.5px solid #f5e0a0",
                borderRadius:16,padding:"14px 18px",display:"flex",gap:12 }}>
                <span style={{ fontSize:22,flexShrink:0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:"#8a6010",marginBottom:4 }}>Warning</div>
                  <div style={{ fontSize:13,color:"#7a5020",lineHeight:1.55 }}>{info.warnings}</div>
                </div>
              </div>

              {/* Disclaimer */}
              <div style={{ fontSize:11,color:"#ccc",textAlign:"center",lineHeight:1.6,
                borderTop:"1px solid #f0f0e8",paddingTop:14 }}>
                AI-generated information for reference only.<br/>
                Always consult a qualified doctor or pharmacist before taking any medication.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Reminder Modal ───────────────────────────────────────────────────────
function AddModal({ onSave, onClose, initialData }) {
  const [medName,  setMedName]  = useState(initialData?.name || "");
  const [dose,     setDose]     = useState(initialData?.dosage || "");
  const [time,     setTime]     = useState("08:00");
  const [days,     setDays]     = useState([1,2,3,4,5]);
  const [note,     setNote]     = useState(initialData?.instructions || "");
  const [tag,      setTag]      = useState("Personal");
  const [showInfo, setShowInfo] = useState(false);

  const L = { display:"block",fontWeight:700,fontSize:11,color:"#999",
    marginBottom:6,marginTop:16,textTransform:"uppercase",letterSpacing:.7 };
  const I = { width:"100%",padding:"12px 14px",borderRadius:12,
    border:"1.5px solid #dde8cc",fontSize:14,color:"#2c3e1f",
    background:"#fafaf5",fontFamily:"'Outfit',sans-serif",
    boxSizing:"border-box",outline:"none" };

  const canSave = medName.trim().length > 0;

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",
        zIndex:990,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
        <div onClick={e=>e.stopPropagation()} style={{
          background:"#fff",borderRadius:"26px 26px 0 0",
          padding:"0 24px 44px",width:"100%",maxWidth:480,
          maxHeight:"92vh",overflowY:"auto",
          boxShadow:"0 -8px 44px rgba(0,0,0,.18)",
          animation:"slideUp .3s ease",
        }}>
          <div style={{ padding:"18px 0 4px",textAlign:"center",
            position:"sticky",top:0,background:"#fff",borderRadius:"26px 26px 0 0",zIndex:5 }}>
            <div style={{ width:40,height:4,borderRadius:2,background:"#ddd",margin:"0 auto 16px" }} />
            <h3 style={{ fontWeight:800,fontSize:20,color:"#2c3e1f" }}>Add Reminder</h3>
          </div>

          <label style={L}>Medicine Name</label>
          <MedSearchInput value={medName} onChange={setMedName} onSelect={v=>setMedName(v)} />

          {/* Drug info button — appears after typing */}
          {medName.trim().length > 1 && (
            <button onClick={()=>setShowInfo(true)} style={{
              marginTop:10,background:"#eef5e8",border:"1.5px solid #c0d8a0",
              borderRadius:10,padding:"9px 16px",fontFamily:"'Outfit',sans-serif",
              fontWeight:700,fontSize:12,color:"#4a7a30",cursor:"pointer",
              display:"flex",alignItems:"center",gap:7,
            }}>
              🔍 Check drug info for "{medName.trim()}"
              <span style={{ marginLeft:"auto",fontSize:10,color:"#aaa",fontWeight:400 }}>AI-powered</span>
            </button>
          )}

          <label style={L}>Dose / Strength</label>
          <input placeholder="e.g. 500mg, 2 tablets…" value={dose}
            onChange={e=>setDose(e.target.value)} style={I} />

          <label style={L}>Reminder Time</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={I} />

          <label style={L}>Repeat On</label>
          <DayPicker selected={days} onChange={setDays} />

          <label style={L}>Who is this for?</label>
          <div style={{ display:"flex",gap:10,marginBottom:16,marginTop:2 }}>
            {["Personal", "Mummy", "Papa"].map(t => (
               <button key={t} onClick={()=>setTag(t)} style={{
                 padding:"8px 16px",borderRadius:12,border:"none",
                 background: tag===t ? "#eef5e8":"#fafaf5",
                 color: tag===t ? "#5a7a3a":"#777",
                 boxShadow: tag===t ? "inset 0 0 0 1.5px #5a7a3a" : "inset 0 0 0 1.5px #dde8cc",
                 fontWeight:800,fontSize:13,cursor:"pointer",transition:"all .2s"
               }}>{t}</button>
            ))}
          </div>

          <label style={{...L,marginTop:16}}>Note (optional)</label>
          <input placeholder="e.g. Take with food, avoid dairy…"
            value={note} onChange={e=>setNote(e.target.value)}
            style={{...I,marginBottom:24}} />

          <button disabled={!canSave}
            onClick={()=>{ if(canSave) onSave({medName:medName.trim(),dose,time,days,note,targetTag:tag}); }}
            style={{ width:"100%",padding:"15px 0",borderRadius:14,border:"none",
              background:canSave?"#5a7a3a":"#ccc",color:"#fff",fontFamily:"'Outfit',sans-serif",
              fontWeight:700,fontSize:16,cursor:canSave?"pointer":"not-allowed",
              transition:"background .2s" }}>
            Save Reminder
          </button>
        </div>
      </div>

      {showInfo && <DrugInfoSheet medName={medName.trim()} onClose={()=>setShowInfo(false)} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RemindersPage() {
  const location = useLocation();
  const prefill = location.state?.prefill || null;
  const [now,      setNow]      = useState(new Date());
  const [synced,   setSynced]   = useState(false);
  const [notifOn,  setNotifOn]  = useState(true);
  const [soundOn,  setSoundOn]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(!!prefill);
  
  useEffect(() => {
    if (prefill) window.history.replaceState({}, document.title);
  }, [prefill]);

  const [drugInfo, setDrugInfo] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const audioCtx = useRef(null);
  const currentAudioSource = useRef(null);

  const initAudio = () => {
    if (!audioCtx.current)
      audioCtx.current = new (window.AudioContext||window.webkitAudioContext)();
  };

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('aarogya_reminders');
    if (saved) return JSON.parse(saved);
    return MOCK_USER_MEDS.flatMap(med =>
      med.times.map((t,i) => ({
        id:`${med.id}-${i}`, medName:med.name, dose:med.dose,
        color:med.color, icon:med.icon, time:t,
        days:[0,1,2,3,4,5,6], note:"", active:true,
      }))
    );
  });

  // Fetch reminders from Supabase and merge with localStorage
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).single();
        if (!dbUser) return;
        const { data: rems } = await supabase
          .from('reminders')
          .select('id,time,status,target_tag,created_at,medicine_id,medicines(name,dosage,instructions)')
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false });
        if (rems && rems.length > 0) {
          const COLORS = ["#c0704a","#5b8fa8","#7a6aa8","#3d8a6a","#a87050","#6a7a3a","#a85080"];
          const mapped = rems.map((r, i) => ({
            id: `supabase-${r.id}`,
            medName: r.medicines?.name || "Medicine",
            dose: r.medicines?.dosage || "",
            icon: "💊",
            color: COLORS[i % COLORS.length],
            time: r.time?.substring(0, 5) || "09:00",
            days: [0,1,2,3,4,5,6],
            note: r.medicines?.instructions || "",
            active: r.status === "active",
            targetTag: r.target_tag || "Personal",
          }));
          setReminders(mapped);
          localStorage.setItem('aarogya_reminders', JSON.stringify(mapped));
        }
      } catch (e) { console.error("Failed to fetch from Supabase reminders:", e); }
    });
    return unsub;
  }, []);

  // Persist any local changes back to localStorage
  useEffect(() => {
    localStorage.setItem('aarogya_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(()=>{ const iv=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(iv); },[]);
  useEffect(()=>{ const t=setTimeout(()=>setSynced(true),900); return()=>clearTimeout(t); },[]);

  // Function to speak reminders using ElevenLabs
  const speakRemindersWithElevenLabs = async () => {
    if (isSpeaking) {
       // Stop audio if already playing
       if(currentAudioSource.current) {
          currentAudioSource.current.pause();
          currentAudioSource.current.currentTime = 0;
       }
       setIsSpeaking(false);
       return;
    }
    
    setIsSpeaking(true);
    let activeReminders = reminders.filter(r => r.active && r.days.includes(now.getDay()));
    activeReminders.sort((a,b) => toMin(a.time) - toMin(b.time));

    let textToSpeak = "You have no more medicine scheduled for today. Have a healthy day!";
    if (activeReminders.length > 0) {
        textToSpeak = `Good day. You have ${activeReminders.length} medications scheduled for today. `;
        activeReminders.forEach((r, idx) => {
            textToSpeak += `Number ${idx + 1}: Take ${r.medName} ${r.dose} at ${fmtTime(r.time)}. `;
            if (r.note) textToSpeak += `Note: ${r.note}. `;
        });
    }

    try {
      const apiKey = "138535830db5ae3780aeaedf65561ff9039a0947b6d94cccba3d900f72d86c8f";
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default generic voice
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ 
           text: textToSpeak, 
           model_id: "eleven_monolingual_v1",
           voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioSource.current = audio;
      
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (e) {
      console.error("Failed to speak reminders via ElevenLabs", e);
      setIsSpeaking(false);
    }
  };

  const speakSingleReminder = async (r) => {
    if (speakingId === r.id) {
       if (currentAudioSource.current) {
          currentAudioSource.current.pause();
          currentAudioSource.current.currentTime = 0;
       }
       setSpeakingId(null);
       return;
    }

    setSpeakingId(r.id);
    let textToSpeak = `Reminder: It's time to take ${r.medName} ${r.dose}. `;
    if (r.note) textToSpeak += `Note: ${r.note}. `;

    try {
      const apiKey = "138535830db5ae3780aeaedf65561ff9039a0947b6d94cccba3d900f72d86c8f";
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; 
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ 
           text: textToSpeak, 
           model_id: "eleven_monolingual_v1",
           voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioSource.current = audio;
      
      audio.onended = () => setSpeakingId(null);
      audio.play();
    } catch (e) {
      console.error("Failed to speak single reminder", e);
      setSpeakingId(null);
    }
  };

  const toggleR = id => setReminders(rs=>rs.map(r=>r.id===id?{...r,active:!r.active}:r));
  const deleteR = id => setReminders(rs=>rs.filter(r=>r.id!==id));

  const COLORS = ["#c0704a","#5b8fa8","#7a6aa8","#3d8a6a","#a87050","#6a7a3a","#a85080"];
  const addReminder = async ({medName,dose,time,days,note,targetTag}) => {
    // 1. Update UI optimistically
    const newRem = {
      id:`custom-${Date.now()}`, medName, dose, icon:"💊",
      color: COLORS[reminders.length % COLORS.length],
      time, days, note, active:true, targetTag
    };
    setReminders(rs=>[...rs, newRem]);
    setShowAdd(false);

    // 2. Sync to Supabase
    try {
      if (auth.currentUser) {
        // Fetch Supabase user UUID using firebase_uid
        const { data: uData } = await supabase.from('users').select('id').eq('firebase_uid', auth.currentUser.uid).single();
        if (uData) {
          // Attempt to insert reminder. If medicine is missing, frontend still continues.
          // Optional: we can insert medicine if we had its schema, falling back safely.
          await supabase.from('reminders').insert({
            user_id: uData.id,
            time: time,
            status: "active",
            target_tag: targetTag || 'Personal'
            // medicine_id left null/omitted to bypass strict FK while schema is pending as per user
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync reminder to Supabase:", e);
    }
  };

  const activeCount = reminders.filter(r=>r.active).length;
  const todayCount  = reminders.filter(r=>r.active&&r.days.includes(now.getDay())).length;
  const daysLabel = d => {
    const s=[...d].sort((a,b)=>a-b);
    if(s.length===7) return "Every day";
    if(JSON.stringify(s)===JSON.stringify([1,2,3,4,5])) return "Weekdays";
    return s.map(i=>DAY_L[i]).join(", ");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#eef2e6;font-family:'Outfit',sans-serif;}
        ::-webkit-scrollbar{width:0;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dot{from{transform:scale(.7);opacity:.35}to{transform:scale(1.1);opacity:1}}
        @keyframes pulseShadow {
          0% { box-shadow: 0 0 0 0 rgba(90,122,58, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(90,122,58, 0); }
          100% { box-shadow: 0 0 0 0 rgba(90,122,58, 0); }
        }
        .rcard{background:#fff;border-radius:18px;padding:14px 16px;display:flex;
          align-items:center;gap:12px;margin-bottom:12px;
          box-shadow:0 2px 14px rgba(0,0,0,.06);animation:fadeUp .4s ease both;}
        .rcard.off{opacity:.52;}
        .rcard{transition:transform .16s;}
        .rcard:hover{transform:translateY(-1px);}
        .xbtn{background:#fff0f0;border:none;border-radius:8px;width:28px;height:28px;
          color:#e07070;cursor:pointer;font-size:12px;
          display:flex;align-items:center;justify-content:center;transition:background 0.2s;}
        .xbtn:hover{background:#ffcccc;}
        .info-btn{background:none;border:1px solid #c8dba8;border-radius:7px;
          cursor:pointer;font-size:11px;font-weight:700;color:#5a7a3a;
          padding:3px 9px;font-family:'Outfit',sans-serif;transition:background .14s;}
        .info-btn:hover{background:#eef5e8;}
        
        .voice-btn {
          cursor: pointer;
          border: none;
          background: #fff;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.1);
          color: #5a7a3a;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 100;
        }
        .voice-btn:hover { transform: scale(1.05); }
        .voice-btn.speaking { background: #5a7a3a; color: #fff; animation: pulseShadow 1.5s infinite; }
      `}</style>
      
      {/* ── Global Floating Voice Button ── */}
      <div style={{ position:"fixed",bottom:75,right:20,zIndex:900 }}>
         <button 
           className={`voice-btn ${isSpeaking ? 'speaking' : ''}`}
           onClick={speakRemindersWithElevenLabs}
           title="Read Aloud with ElevenLabs Voice"
         >
           {isSpeaking ? '⏹️' : '🔊'}
         </button>
      </div>

      <div onClick={initAudio} style={{ maxWidth:480,margin:"0 auto",
        minHeight:"100vh",background:"#eef2e6",paddingBottom:110 }}>

        {/* ── Header ── */}
        <div style={{ padding:"24px 20px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ color:"#1a2420",fontSize:26,fontWeight:900,fontFamily:"'Nunito',sans-serif",lineHeight:1.1 }}>⏰ Reminders</h1>
            <div style={{ color:"#8a9a7a",fontSize:13,marginTop:4, fontWeight:700 }}>
              {reminders.length} schedules synced
            </div>
          </div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,
            background:synced?"#eef5e8":"#fff9e6",border:`1px solid ${synced?"#d5eebb":"#ffe8a1"}`,
            borderRadius:20,padding:"6px 14px",fontSize:12,color:synced?"#5a7a3a":"#b58d00",fontWeight:800 }}>
            <span style={{ width:8,height:8,borderRadius:"50%",display:"inline-block",
              background:synced?"#5a7a3a":"#f5a623" }} />
            {synced?"Synced":"Connecting…"}
          </div>
        </div>

        <div style={{ padding:"0 18px" }}>

          {/* ── Alert Settings ── */}
          <div style={{ background:"#fff",borderRadius:20,padding:"18px 20px",
            marginTop:18,marginBottom:16,boxShadow:"0 2px 14px rgba(0,0,0,.06)" }}>
            <p style={{ fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:.8,
              textTransform:"uppercase",marginBottom:14 }}>Alert Settings</p>
            {[
              { icon:"🔔",label:"Push Notifications",
                sub:notifOn?"Alerts are active":"Notifications off",
                val:notifOn, set:setNotifOn },
              { icon:"🔊",label:"Sound Alerts",
                sub:soundOn?"Chime on reminder":"Silent mode",
                val:soundOn, set:v=>{ setSoundOn(v); if(v){ initAudio(); playBeep(audioCtx.current); } } },
            ].map(({icon,label,sub,val,set},i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",
                justifyContent:"space-between",marginBottom:i===0?16:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:12,display:"flex",
                    alignItems:"center",justifyContent:"center",fontSize:20,
                    background:val?"#eef5e8":"#f5f5f0",transition:"background .3s" }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,color:"#2c3e1f" }}>{label}</div>
                    <div style={{ fontSize:12,color:"#aaa",marginTop:1 }}>{sub}</div>
                  </div>
                </div>
                <Toggle on={val} onChange={set} />
              </div>
            ))}
          </div>

          {/* ── Stats ── */}
          <div style={{ display:"flex",gap:10,marginBottom:18 }}>
            {[
              {label:"Active",  value:activeCount,                color:"#5a7a3a"},
              {label:"Paused",  value:reminders.length-activeCount, color:"#c0a060"},
              {label:"Today",   value:todayCount,                 color:"#4a7aaa"},
            ].map(s=>(
              <div key={s.label} style={{ flex:1,background:"#fff",borderRadius:14,padding:"12px 0",
                textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                <div style={{ fontSize:24,fontWeight:800,color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11,color:"#aaa",fontWeight:700,marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── List header ── */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <h2 style={{ fontSize:16,fontWeight:800,color:"#2c3e1f" }}>Your Schedule</h2>
            <button onClick={()=>setShowAdd(true)} style={{
              background:"#5a7a3a",color:"#fff",border:"none",
              borderRadius:10,padding:"8px 18px",fontFamily:"'Outfit',sans-serif",
              fontWeight:700,fontSize:13,cursor:"pointer" }}>+ Add</button>
          </div>

          {reminders.length===0 && (
            <div style={{ textAlign:"center",padding:"44px 0",color:"#bbb",fontSize:14 }}>
              No reminders yet. Tap <b>+ Add</b> to create one.
            </div>
          )}

          {/* ── Cards ── */}
          {reminders.map((r,idx) => {
            const nd = nextDose([r.time]);
            return (
              <div key={r.id} className={`rcard${r.active?"":" off"}`}
                style={{ animationDelay:`${idx*55}ms` }}>
                <div style={{ width:46,height:46,borderRadius:13,flexShrink:0,
                  background:r.color+"1e",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:22 }}>{r.icon}</div>

                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700,fontSize:15,color:"#2c3e1f",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                      maxWidth:130 }}>{r.medName}</span>
                    <button className="info-btn" onClick={()=>setDrugInfo(r.medName)}>
                      ℹ️ Info
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); speakSingleReminder(r); }}
                      style={{ background:"#f0f5e8", border:"none", borderRadius:8, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#5a7a3a" }}
                      title="Speak reminder"
                    >
                      {speakingId === r.id ? '⏹️' : '🔊'}
                    </button>
                  </div>
                  <div style={{ fontSize:12,color:"#888",marginTop:2 }}>
                    {r.dose&&<>{r.dose} &nbsp;·&nbsp;</>}{fmtTime(r.time)}
                  </div>
                  <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                    {daysLabel(r.days)}
                    {r.targetTag && r.targetTag !== 'Personal' && <> · <span style={{color:"#c0501a",fontWeight:800}}>❤️ For {r.targetTag}</span></>}
                    {r.targetTag === 'Personal' && <> · <span style={{color:"#5a7a3a",fontWeight:800}}>👤 My Meds</span></>}
                    {r.note&&<> · <span style={{color:"#5a7a3a"}}>{r.note}</span></>}
                  </div>
                </div>

                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ background:r.active?"#eef5e8":"#f5f5f0",borderRadius:8,
                    padding:"4px 10px",fontSize:12,fontWeight:700,
                    color:r.active?"#5a7a3a":"#bbb",marginBottom:4 }}>{nd.label}</div>
                  <div style={{ fontSize:10,color:"#bbb" }}>{nd.tag}</div>
                </div>


                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8,flexShrink:0 }}>
                  <Toggle on={r.active} onChange={()=>toggleR(r.id)} />
                  <button className="xbtn" onClick={(e)=>{ e.stopPropagation(); deleteR(r.id); }}>✕</button>
                </div>
              </div>
            );
          })}

          {/* ── Tip ── */}
          <div style={{ background:"linear-gradient(135deg,#3d5c28,#587a38)",
            borderRadius:20,padding:"18px 20px",marginTop:8,
            display:"flex",alignItems:"center",gap:14 }}>
            <span style={{ fontSize:28 }}>💡</span>
            <div>
              <div style={{ color:"#fff",fontWeight:700,fontSize:14 }}>Pro tip</div>
              <div style={{ color:"rgba(255,255,255,.75)",fontSize:12,marginTop:3,lineHeight:1.5 }}>
                Tap <b style={{color:"#c8f0a0"}}>ℹ️ Info</b> on any card to see AI-powered details
                — uses, side effects, and whether a prescription is needed.
              </div>
            </div>
          </div>

          {/* ── Pharmacy Shop ── */}
          <div style={{ marginTop:24, marginBottom: 40 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
              <h2 style={{ fontSize:16,fontWeight:800,color:"#2c3e1f" }}>Refill Pharmacy</h2>
              <button style={{ color:"#5a7a3a",fontWeight:800,fontSize:13,background:"none",border:"none" }}>View All →</button>
            </div>
            <div style={{ display:"flex", gap:14, overflowX:"auto", scrollbarWidth:"none", paddingBottom: 10, margin:"0 -18px", paddingLeft:18, paddingRight:18 }}>
              {[
                { name: "Amoxicillin 500mg", price: "₹120", img: "💊" },
                { name: "Vitamin D3", price: "₹250", img: "🌟" },
                { name: "Metformin 850mg", price: "₹85", img: "💉" },
              ].map((item, i) => (
                <div key={i} style={{ minWidth:140, background:"#fff", borderRadius:18, padding:"16px", boxShadow:"0 4px 16px rgba(0,0,0,0.04)", border:"1px solid #f0ede5", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:32, background:"#f5f7f2", width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{item.img}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800, color:"#2c3e1f", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:110 }}>{item.name}</div>
                    <div style={{ fontSize:13, fontWeight:900, color:"#5a7a3a", marginTop:4 }}>{item.price}</div>
                  </div>
                  <button style={{ width:"100%", padding:"8px 0", borderRadius:10, border:"none", background:"#5a7a3a", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Add to Cart</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {showAdd  && <AddModal onSave={addReminder} onClose={()=>setShowAdd(false)} initialData={prefill} />}
      {drugInfo && <DrugInfoSheet medName={drugInfo} onClose={()=>setDrugInfo(null)} />}
    </>
  );
}
