import { useState, useEffect } from "react";
import { getDoctorDirectory, requestDoctorAppointment } from "../lib/doctors";

const ALL_SPECIALTY = { id:"all", label:"All", icon:"🏥" };

const TIME_SLOTS = {
  Today: ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  Tomorrow: ["09:00","10:00","10:30","11:00","11:30","12:00","13:00","14:00","15:00","15:30","16:00","17:00"],
  Other: ["09:30","10:30","11:30","14:00","15:00","16:30"],
};

const DAYS = (() => {
  const today = new Date();
  return Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(today.getDate()+i);
    const key = i===0?"Today":i===1?"Tomorrow":"Other";
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return { label:i===0?"Today":i===1?"Tomorrow":d.toLocaleDateString("en-IN",{weekday:"short"}), date:d.getDate(), month:d.toLocaleDateString("en-IN",{month:"short"}), iso, slotKey:key };
  });
})();

const Stars = ({n}) => <span style={{color:"#f0a500",fontSize:12,letterSpacing:-1}}>{"★".repeat(Math.floor(n))}{"☆".repeat(5-Math.floor(n))}</span>;

function Avatar({initials, color, size=50}) {
  return (
    <div style={{ width:size,height:size,borderRadius:size/3.6,flexShrink:0,background:`${color}20`,border:`2px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.3,fontWeight:800,color,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {initials}
    </div>
  );
}

function VideoCallScreen({doctor, onEnd}) {
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([{from:"doctor", text:`Hello! I'm ${doctor.name}. How can I help you today?`}]);

  useEffect(() => { const iv = setInterval(()=>setElapsed(e=>e+1),1000); return ()=>clearInterval(iv); },[]);
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages(m=>[...m,{from:"user",text:msg.trim()}]);
    setMsg("");
    setTimeout(()=>setMessages(m=>[...m,{from:"doctor",text:"I see. Can you describe this further?"}]),1500);
  };

  const controls = [
    {icon:muted?"🔇":"🎤",label:muted?"Unmute":"Mute",action:()=>setMuted(v=>!v),active:!muted},
    {icon:camOff?"📵":"📹",label:camOff?"Cam On":"Camera",action:()=>setCamOff(v=>!v),active:!camOff},
    {icon:"💬",label:"Chat",action:()=>setChatOpen(v=>!v),active:chatOpen},
    {icon:"📋",label:"Notes",action:()=>{},active:false},
  ];

  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,background:"#080f06",display:"flex",flexDirection:"column",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ flex:1,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,background:`radial-gradient(ellipse at 60% 40%, ${doctor.color}28 0%, #0c150a 70%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:110,height:110,borderRadius:32,background:`${doctor.color}28`,border:`3px solid ${doctor.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,fontWeight:800,color:doctor.color,marginBottom:16 }}>{doctor.avatar}</div>
          <div style={{ color:"#fff",fontWeight:800,fontSize:20 }}>{doctor.name}</div>
          <div style={{ color:"rgba(255,255,255,.45)",fontSize:13,marginTop:4 }}>{doctor.tag}</div>
          <div style={{ display:"flex",alignItems:"center",gap:7,marginTop:14,background:"rgba(255,255,255,.08)",borderRadius:20,padding:"6px 16px" }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:"#6aee7a",display:"inline-block" }} />
            <span style={{ color:"#6aee7a",fontSize:12,fontWeight:700 }}>Connected · {fmt(elapsed)}</span>
          </div>
        </div>
        <div style={{ position:"absolute",top:20,right:20,width:88,height:118,borderRadius:16,background:camOff?"#1a2a18":"#142210",border:"2.5px solid rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ fontSize:30 }}>{camOff?"🚫":"👤"}</div>
          <div style={{ position:"absolute",bottom:6,left:0,right:0,textAlign:"center",fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600 }}>You</div>
        </div>
        <div style={{ position:"absolute",top:0,left:0,right:0,padding:"44px 20px 20px",background:"linear-gradient(to bottom,rgba(0,0,0,.65),transparent)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ color:"rgba(255,255,255,.5)",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase" }}>Video Consultation</div>
              <div style={{ color:"#fff",fontWeight:700,fontSize:15,marginTop:3 }}>{doctor.name}</div>
            </div>
            <div style={{ background:"rgba(255,255,255,.1)",borderRadius:10,padding:"6px 14px",color:"#fff",fontSize:13,fontWeight:800 }}>{fmt(elapsed)}</div>
          </div>
        </div>
      </div>

      {chatOpen && (
        <div style={{ height:240,background:"#0c1a0a",borderTop:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column" }}>
          <div style={{ flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8 }}>
            {messages.map((m,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"76%",padding:"9px 14px",fontSize:13,lineHeight:1.45,borderRadius:14,background:m.from==="user"?"#3e6830":"rgba(255,255,255,.1)",color:"rgba(255,255,255,.9)",borderBottomRightRadius:m.from==="user"?3:14,borderBottomLeftRadius:m.from==="doctor"?3:14 }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",gap:8,padding:"8px 16px 12px",borderTop:"1px solid rgba(255,255,255,.05)" }}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Type a message…" style={{ flex:1,background:"rgba(255,255,255,.08)",border:"none",borderRadius:12,padding:"10px 14px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit" }} />
            <button onClick={sendMsg} style={{ background:"#3e6830",border:"none",borderRadius:12,width:42,height:42,color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0 }}>↑</button>
          </div>
        </div>
      )}

      <div style={{ background:"#0a140a",padding:"16px 0 40px",display:"flex",justifyContent:"center",alignItems:"center",gap:14 }}>
        {controls.map(c=>(
          <button key={c.label} onClick={c.action} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer" }}>
            <div style={{ width:54,height:54,borderRadius:17,background:c.active?"rgba(255,255,255,.14)":"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`1.5px solid ${c.active?"rgba(255,255,255,.22)":"rgba(255,255,255,.07)"}` }}>{c.icon}</div>
            <span style={{ fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:600 }}>{c.label}</span>
          </button>
        ))}
        <button onClick={onEnd} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer" }}>
          <div style={{ width:54,height:54,borderRadius:17,background:"#dc2040",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 4px 20px rgba(220,32,64,.45)" }}>📵</div>
          <span style={{ fontSize:10,color:"#e06070",fontWeight:700 }}>End</span>
        </button>
      </div>
    </div>
  );
}

function DoctorCard({doc, idx, onBook, onCall}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="dcard" style={{ animationDelay:`${idx*55}ms` }}>
      <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
        <div style={{ position:"relative" }}>
          <Avatar initials={doc.avatar} color={doc.color} size={54} />
          {doc.online && <span style={{ position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:"#5cdc6a",border:"2.5px solid #fff",display:"block" }} />}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:800,fontSize:15,color:"#1a2c12" }}>{doc.name}</div>
          <div style={{ fontSize:12,color:"#7a8a6a",marginTop:2,fontWeight:600 }}>{doc.tag} · {doc.exp} exp.</div>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap" }}>
            <Stars n={doc.rating} />
            <span style={{ fontSize:11,color:"#bbb" }}>{doc.rating} ({doc.reviews})</span>
            <span style={{ background:doc.online?"#e8f8ec":"#f5f5f0",color:doc.online?"#2a7a3a":"#aaa",borderRadius:7,padding:"2px 8px",fontSize:11,fontWeight:700 }}>{doc.online?"● Online":"○ Offline"}</span>
          </div>
        </div>
        <div style={{ textAlign:"right",flexShrink:0 }}>
          <div style={{ fontWeight:800,fontSize:16,color:"#1a2c12" }}>₹{doc.fee}</div>
          <div style={{ fontSize:10,color:"#bbb",marginTop:1 }}>per consult</div>
          <span style={{ background:"#fff8e8",color:"#a07020",borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700,marginTop:4,display:"inline-block" }}>{doc.avail}</span>
        </div>
      </div>
      {expanded && <div style={{ marginTop:12,padding:"10px 14px",background:"#f7faf2",borderRadius:12,fontSize:13,color:"#5a6a4a",lineHeight:1.6 }}>{doc.bio}</div>}
      <button onClick={()=>setExpanded(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#7a9a5a",fontWeight:700,padding:"6px 0",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        {expanded?"▲ Less info":"▼ More info"}
      </button>
      <div style={{ display:"flex",gap:10,marginTop:6 }}>
        <button onClick={()=>onBook(doc)} style={{ flex:1,padding:"11px 0",borderRadius:12,border:"1.5px solid #b8d89a",background:"#f4faea",color:"#3a6a28",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>📅 Book Visit</button>
        <button onClick={()=>doc.online&&onCall(doc)} style={{ flex:1,padding:"11px 0",borderRadius:12,border:"none",background:doc.online?"linear-gradient(135deg,#3e6830,#5a8a40)":"#eee",color:doc.online?"#fff":"#bbb",fontWeight:700,fontSize:13,cursor:doc.online?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:doc.online?"0 3px 14px rgba(58,104,40,.3)":"none" }}>📹 {doc.online?"Video Call":"Unavailable"}</button>
      </div>
    </div>
  );
}

function BookingSheet({doctor, onClose, onConfirm}) {
  const [step, setStep] = useState(1);
  const [selDay, setSelDay] = useState(0);
  const [selSlot, setSelSlot] = useState(null);
  const [type, setType] = useState("clinic");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const slots = TIME_SLOTS[DAYS[selDay]?.slotKey] || TIME_SLOTS.Other;
  const I = { width:"100%",padding:"11px 14px",borderRadius:12,border:"1.5px solid #dde8cc",fontSize:14,color:"#1a2c12",background:"#fafaf5",fontFamily:"'Plus Jakarta Sans',sans-serif",boxSizing:"border-box",outline:"none",marginBottom:12 };
  const Lbl = ({children}) => <div style={{ fontWeight:700,fontSize:11,color:"#aaa",letterSpacing:.7,textTransform:"uppercase",marginBottom:8,marginTop:16 }}>{children}</div>;

  if (done) return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,.46)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:"26px 26px 0 0",padding:"44px 28px 64px",width:"100%",maxWidth:480,textAlign:"center" }}>
        <div style={{ fontSize:66,marginBottom:16 }}>🎉</div>
        <h2 style={{ fontWeight:800,fontSize:22,color:"#1a2c12",marginBottom:8 }}>Request submitted</h2>
        <p style={{ fontSize:14,color:"#7a8a6a",lineHeight:1.65,marginBottom:24 }}>Your request for <b style={{color:"#3e6830"}}>{doctor.name}</b> was saved for<br/><b style={{color:"#1a2c12"}}>{DAYS[selDay].label} at {selSlot}</b> · {type==="video"?"📹 Video":"🏥 Clinic"}. The clinic must confirm it.</p>
        <button onClick={onClose} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:"#3e6830",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,.46)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:"26px 26px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 44px rgba(0,0,0,.18)" }}>
        <div style={{ padding:"18px 24px 0",position:"sticky",top:0,background:"#fff",borderRadius:"26px 26px 0 0",zIndex:5,borderBottom:"1px solid #f0f0e8" }}>
          <div style={{ width:40,height:4,borderRadius:2,background:"#ddd",margin:"0 auto 16px" }} />
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div>
          <div style={{ fontSize:11,color:"#bbb",fontWeight:700,letterSpacing:.7,textTransform:"uppercase",marginBottom:3 }}>{step===1?"Pick Date & Time":step===2?"Your Details":"Review Request"}</div>
              <h2 style={{ fontWeight:800,fontSize:19,color:"#1a2c12" }}>{doctor.name}</h2>
            </div>
            <button onClick={onClose} style={{ background:"#f5f5f0",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:14,color:"#888" }}>✕</button>
          </div>
          <div style={{ display:"flex",gap:5,marginBottom:16 }}>
            {[1,2,3].map(s=><div key={s} style={{ flex:1,height:4,borderRadius:2,background:s<=step?"#3e6830":"#e8e8e0" }} />)}
          </div>
        </div>
        <div style={{ padding:"4px 24px 44px" }}>
          {step===1 && <>
            <Lbl>Consultation Type</Lbl>
            <div style={{ display:"flex",gap:10,marginBottom:4 }}>
              {[{id:"clinic",icon:"🏥",label:"Clinic Visit"},{id:"video",icon:"📹",label:"Video Call"}].map(t=>(
                <button key={t.id} onClick={()=>setType(t.id)} style={{ flex:1,padding:"12px 0",borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:13,border:`2px solid ${type===t.id?"#3e6830":"#e8edd8"}`,background:type===t.id?"#ecf5e4":"#fafaf5",color:type===t.id?"#3e6830":"#aaa",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>{t.icon} {t.label}</button>
              ))}
            </div>
            <Lbl>Select Date</Lbl>
            <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:6,marginBottom:4 }}>
              {DAYS.map((d,i)=>(
                <button key={i} onClick={()=>{setSelDay(i);setSelSlot(null);}} style={{ flexShrink:0,width:56,padding:"10px 0",borderRadius:14,cursor:"pointer",textAlign:"center",border:`2px solid ${selDay===i?"#3e6830":"#e8edd8"}`,background:selDay===i?"#3e6830":"#fafaf5",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",color:selDay===i?"rgba(255,255,255,.65)":"#bbb" }}>{d.label.slice(0,3)}</div>
                  <div style={{ fontSize:20,fontWeight:800,color:selDay===i?"#fff":"#1a2c12",marginTop:2 }}>{d.date}</div>
                  <div style={{ fontSize:10,color:selDay===i?"rgba(255,255,255,.55)":"#ccc" }}>{d.month}</div>
                </button>
              ))}
            </div>
            <Lbl>Available Slots</Lbl>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:24 }}>
              {slots.map(s=><button key={s} onClick={()=>setSelSlot(s)} style={{ padding:"9px 16px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,border:`1.5px solid ${selSlot===s?"#3e6830":"#dde8c8"}`,background:selSlot===s?"#3e6830":"#f5f9f0",color:selSlot===s?"#fff":"#3a5828",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s}</button>)}
            </div>
            <button disabled={!selSlot} onClick={()=>setStep(2)} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",fontWeight:800,fontSize:16,background:selSlot?"#3e6830":"#ccc",color:"#fff",cursor:selSlot?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Continue →</button>
          </>}
          {step===2 && <>
            <Lbl>Patient Details</Lbl>
            <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} style={I} />
            <input placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} style={I} />
            <textarea placeholder="Reason for visit / symptoms…" rows={4} value={reason} onChange={e=>setReason(e.target.value)} style={{...I,resize:"none",marginBottom:24}} />
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1,padding:"13px",borderRadius:14,border:"1.5px solid #d0d8c8",background:"#fafaf5",color:"#7a8a6a",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>← Back</button>
              <button disabled={!name.trim()||!phone.trim()} onClick={()=>setStep(3)} style={{ flex:2,padding:"13px",borderRadius:14,border:"none",fontWeight:800,fontSize:14,background:name.trim()&&phone.trim()?"#3e6830":"#ccc",color:"#fff",cursor:name.trim()&&phone.trim()?"pointer":"not-allowed",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Review →</button>
            </div>
          </>}
          {step===3 && <>
            <div style={{ background:"#f4faea",borderRadius:18,padding:"18px 20px",marginBottom:20,border:"1.5px solid #c8e0a8" }}>
              <div style={{ display:"flex",gap:14,alignItems:"center",marginBottom:16,paddingBottom:16,borderBottom:"1px solid #d8ecc0" }}>
                <Avatar initials={doctor.avatar} color={doctor.color} size={50} />
                <div><div style={{ fontWeight:800,fontSize:16,color:"#1a2c12" }}>{doctor.name}</div><div style={{ fontSize:12,color:"#7a8a6a",marginTop:2 }}>{doctor.tag}</div><Stars n={doctor.rating} /></div>
              </div>
              {[["📅","Date & Time",`${DAYS[selDay].label} · ${selSlot}`],["💊","Type",type==="video"?"Video Call":"Clinic Visit"],["👤","Patient",name],["📞","Phone",phone],["💰","Fee",`₹${doctor.fee}`]].map(([i,l,v])=>(
                <div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #deeec8" }}>
                  <span style={{ fontSize:13,color:"#7a8a6a" }}>{i} {l}</span>
                  <span style={{ fontSize:13,fontWeight:700,color:"#1a2c12",textAlign:"right",maxWidth:"58%" }}>{v}</span>
                </div>
              ))}
            </div>
            {reason && <div style={{ background:"#fffbec",border:"1px solid #f0e0a0",borderRadius:14,padding:"12px 16px",marginBottom:20,fontSize:13,color:"#7a6020",lineHeight:1.5 }}>📋 {reason}</div>}
            {saveError && <div role="alert" style={{ background:"#fff0ef",border:"1px solid #f2c2be",borderRadius:12,padding:"10px 12px",marginBottom:12,fontSize:13,color:"#a52d26" }}>{saveError}</div>}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setStep(2)} style={{ flex:1,padding:"13px",borderRadius:14,border:"1.5px solid #d0d8c8",background:"#fafaf5",color:"#7a8a6a",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif" }}>← Edit</button>
              <button disabled={saving} onClick={async()=>{setSaving(true);setSaveError("");try{await onConfirm({doctor,day:DAYS[selDay],slot:selSlot,type,name,phone,reason});setDone(true);}catch(error){setSaveError(error.message||"Could not save your request.");}finally{setSaving(false);}}} style={{ flex:2,padding:"13px",borderRadius:14,border:"none",fontWeight:800,fontSize:14,background:"linear-gradient(135deg,#3e6830,#5a8a40)",color:"#fff",cursor:saving?"wait":"pointer",opacity:saving ? .7 : 1,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{saving?"Saving…":"✅ Send appointment request"}</button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

export default function DoctorPage() {
  const [specialty, setSpecialty] = useState("all");
  const [search, setSearch] = useState("");
  const [bookDoc, setBookDoc] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),3200); };
  useEffect(() => {
    let active = true;
    getDoctorDirectory().then(({ doctors: rows = [], specialties: categories = [], appointments: saved = [] }) => {
      if (!active) return;
      const mapped = rows.map((d) => ({
        id:d.id, name:d.name, specialty:d.specialty_id, tag:d.specialty_label,
        exp:`${d.experience_years} yrs`, fee:Number(d.fee), rating:Number(d.rating), reviews:d.review_count,
        avail:d.availability_label, online:d.available_online, avatar:d.avatar_initials, color:d.avatar_color,
        bio:d.bio, isSample:d.is_sample,
      }));
      setDoctors(mapped);
      setSpecialties([ALL_SPECIALTY, ...categories.map((s) => ({ id:s.id, label:s.label, icon:s.icon }))]);
      setAppointments(saved.filter((a) => a.date >= new Date().toISOString().slice(0,10)).map((a) => ({
        id:a.id, doctor:mapped.find((d) => d.id === a.doctor_id) || { name:a.doctor_name },
        day:{ label:a.date === new Date().toISOString().slice(0,10) ? "Today" : a.date },
        slot:String(a.time).slice(0,5), type:a.consultation_type,
      })));
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setDirectoryError(error.message || "Could not load doctors from Supabase.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const filtered = doctors.filter(d => (specialty==="all"||d.specialty===specialty) && (!search.trim()||d.name.toLowerCase().includes(search.toLowerCase())||d.tag.toLowerCase().includes(search.toLowerCase())));
  const latestAppt = appointments[appointments.length-1];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .dcard{background:#fff;border-radius:20px;padding:16px 18px;margin-bottom:14px;box-shadow:0 2px 16px rgba(0,0,0,.07);animation:fadeUp .38s ease both;transition:transform .16s,box-shadow .16s;}
        .dcard:hover{transform:translateY(-2px);box-shadow:0 6px 26px rgba(0,0,0,.11);}
      `}</style>


        <div style={{ background: "var(--cream)", minHeight: "100vh", paddingBottom: 110, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Search & Specialties Area */}
        <div style={{ background: "linear-gradient(135deg,var(--olive-dark),var(--olive))", padding: "20px 22px 30px", borderRadius: "0 0 32px 32px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 170, height: 170, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔍 Search Specialists</div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: .7, pointerEvents: "none" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or specialty…" style={{ width: "100%", padding: "13px 16px 13px 46px", borderRadius: 16, border: "none", background: "rgba(255,255,255,.2)", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        <div style={{ padding:"0 18px" }}>
          {latestAppt && (
            <div style={{ background:"linear-gradient(135deg,var(--olive-dark),var(--olive))",borderRadius:20,padding:"16px 20px",marginTop:18,display:"flex",gap:14,alignItems:"center" }}>
              <span style={{ fontSize:28 }}>📅</span>
              <div style={{ flex:1 }}>
                <div style={{ color:"rgba(255,255,255,.6)",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:3 }}>Appointment request</div>
                <div style={{ color:"#fff",fontWeight:700,fontSize:14 }}>{latestAppt.doctor.name}</div>
                <div style={{ color:"rgba(255,255,255,.65)",fontSize:12,marginTop:2 }}>{latestAppt.day.label} · {latestAppt.slot} · {latestAppt.type==="video"?"📹 Video":"🏥 Clinic"}</div>
              </div>
              <span style={{ background:"rgba(255,255,255,.15)",borderRadius:8,padding:"5px 12px",color:"#fff",fontSize:12,fontWeight:700 }}>{appointments.length} requests</span>
            </div>
          )}

          <div style={{ marginTop:20 }}>
            <div style={{ fontWeight:700,fontSize:11,color:"#9aaa8a",letterSpacing:.8,textTransform:"uppercase",marginBottom:12 }}>Specialties</div>
            <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:8 }}>
              {specialties.map(s=>(
                <button key={s.id} onClick={()=>setSpecialty(s.id)} style={{ flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:22,cursor:"pointer",fontWeight:700,fontSize:12,border:`1.5px solid ${specialty===s.id?"var(--olive-dark)":"#d0e0c0"}`,background:specialty===s.id?"var(--olive-dark)":"#fff",color:specialty===s.id?"#fff":"#5a7a4a",fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:specialty===s.id?"0 3px 12px rgba(62,78,38,.22)":"none" }}>
                  <span style={{ fontSize:15 }}>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,marginBottom:14 }}>
            <div style={{ fontWeight:700,fontSize:12,color:"#9aaa8a",letterSpacing:.8,textTransform:"uppercase" }}>
              {specialty==="all"?"All Doctors":specialties.find(s=>s.id===specialty)?.label} <span style={{color:"#3e6830"}}>({filtered.length})</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5,background:"#e8f4dc",borderRadius:8,padding:"4px 10px" }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:"#5cdc6a",display:"inline-block" }} />
              <span style={{ fontSize:11,fontWeight:700,color:"#3a7a28" }}>{filtered.filter(d=>d.online).length} online</span>
            </div>
          </div>

          {directoryError && <div role="alert" style={{ marginTop:20,padding:16,borderRadius:14,border:"1px solid #f2e0bb",background:"#fff8e8",color:"#77591e",fontSize:13,lineHeight:1.55 }}>⚠️ {directoryError}</div>}
          {loading && <div style={{ textAlign:"center",padding:"40px 0",color:"#7a8a6a",fontSize:14 }}>Loading doctor directory…</div>}
          {!loading && !directoryError && <div style={{ margin:"4px 0 14px",padding:"11px 13px",borderRadius:12,background:"#fff8e8",color:"#77591e",fontSize:11,lineHeight:1.5 }}>Sample doctor profiles: names, ratings, fees, and availability are examples only. Appointment requests are saved for follow-up; the clinic must confirm them.</div>}
          {!loading && !directoryError && filtered.length===0 && <div style={{ textAlign:"center",padding:"52px 0",color:"#bbb",fontSize:14 }}>No doctors found. Try a different specialty or search term.</div>}
          {filtered.map((doc,idx)=><DoctorCard key={doc.id} doc={doc} idx={idx} onBook={d=>setBookDoc(d)} onCall={()=>showToast("Video consultation is not connected yet. Send an appointment request instead.")} />)}
        </div>
      </div>

      {bookDoc && (
        <BookingSheet 
          doctor={bookDoc} 
          onClose={()=>setBookDoc(null)} 
          onConfirm={async (appt)=>{
            const { appointment } = await requestDoctorAppointment({
              doctor_id: appt.doctor.id,
              date: appt.day.iso,
              time: appt.slot,
              consultation_type: appt.type,
              patient_name: appt.name,
              patient_phone: appt.phone,
              reason: appt.reason,
            });
            setAppointments((items)=>[...items, { ...appt, id:appointment.id }]);
            showToast(`✅ Request sent for ${appt.doctor.name}`);
          }} 
        />
      )}
      {toast && <div style={{ position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"#1a2c12",color:"#fff",borderRadius:14,padding:"10px 22px",fontSize:13,fontWeight:700,zIndex:300,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,.25)" }}>{toast}</div>}
    </>
  );
}
