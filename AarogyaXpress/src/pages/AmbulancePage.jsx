import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft } from "lucide-react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const AMBULANCE_TYPES = [
  { id:"basic", icon:"🚑", label:"Basic Life Support", desc:"Standard ambulance · EMT team", eta:"8 min", price:"₹500–800" },
  { id:"advanced", icon:"🚨", label:"Advanced Life Support", desc:"ICU-equipped · Paramedic team", eta:"12 min", price:"₹1,200–1,800" },
  { id:"neonatal", icon:"👶", label:"Neonatal Transport", desc:"Incubator-equipped · Specialist", eta:"15 min", price:"₹2,000–3,000" },
];

const HOSPITALS = [
  { name:"AIIMS Delhi", dist:"0.8 km", eta:"4 min", beds:12, emergency:true, color:"#e05252" },
  { name:"Safdarjung Hospital", dist:"1.4 km", eta:"7 min", beds:5, emergency:true, color:"#e0784a" },
  { name:"St. Stephen's Hospital", dist:"2.1 km", eta:"11 min", beds:18, emergency:false, color:"#5b8fa8" },
  { name:"Max Super Speciality", dist:"3.2 km", eta:"15 min", beds:24, emergency:false, color:"#2e9b6a" },
];

export default function AmbulancePage() {
  const [phase, setPhase] = useState("idle");
  const [countdown, setCountdown] = useState(5);
  const [selectedType, setSelectedType] = useState("basic");
  const ivRef = useRef(null);
  const navigate = useNavigate();
  const chosen = AMBULANCE_TYPES.find(a => a.id === selectedType);

  useEffect(() => {
    if (phase === "counting") {
      ivRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { 
            clearInterval(ivRef.current); 
            setPhase("dispatched"); 
            // Sync to Supabase
            const syncDispatch = async () => {
              try {
                const user = auth.currentUser;
                if (user) {
                  const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).single();
                  if (dbUser) {
                    await supabase.from('activities').insert({
                      user_id: dbUser.id,
                      type: 'ambulance',
                      title: 'Ambulance Dispatched',
                      description: `${chosen?.label} requested for emergency.`,
                      status: 'active'
                    });
                  }
                }
              } catch (e) {
                console.error("Failed to sync ambulance dispatch:", e);
              }
            };
            syncDispatch();
            return 0; 
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(ivRef.current);
  }, [phase, chosen]);

  useEffect(() => {
    if (phase === "dispatched") { const t = setTimeout(() => setPhase("arriving"), 4000); return () => clearTimeout(t); }
  }, [phase]);
  const cancel = () => { setPhase("idle"); setCountdown(5); clearInterval(ivRef.current); };

  return (
    <>
      <style>{`
        @keyframes sosRing{0%,100%{box-shadow:0 0 0 0 rgba(220,32,64,0.7)}50%{box-shadow:0 0 0 32px rgba(220,32,64,0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.94)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .amb-c{background:#fff;border-radius:18px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
      `}</style>
      <div style={{ background:"#f5f2eb",minHeight:"100vh",paddingBottom:110,fontFamily:"'Nunito',system-ui,sans-serif" }}>
        <div style={{ background: "linear-gradient(135deg,#c0101a,#e03040)", padding: "20px 20px 24px", borderRadius: "0 0 24px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
          
          {/* Custom Back Button for Ambulance Page */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div
              onClick={() => navigate(-1)}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              <ArrowLeft size={22} color="white" strokeWidth={2.5} />
            </div>
            <div style={{ color: "rgba(255,255,255,.9)", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>SOS Services</div>
          </div>

          <div style={{ position: "relative", zIndex: 2 }}>
            <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>Ambulance Required</h1>
            <div style={{ color: "rgba(255,255,255,.8)", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Fastest response in your area</div>
          </div>
        </div>

        <div style={{ padding:"20px 18px" }}>
          {phase === "idle" && (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <div style={{ textAlign:"center",marginBottom:24 }}>
                <button onClick={() => setPhase("counting")} style={{ width:148,height:148,borderRadius:"50%",background:"linear-gradient(135deg,#dc2040,#e8304a)",border:"6px solid rgba(220,32,64,0.25)",cursor:"pointer",animation:"sosRing 2s ease infinite",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,margin:"0 auto" }}>
                  <span style={{ fontSize:48 }}>🆘</span>
                  <span style={{ color:"#fff",fontWeight:900,fontSize:15 }}>SOS</span>
                  <span style={{ color:"rgba(255,255,255,.7)",fontSize:10,fontWeight:700 }}>Tap to Call</span>
                </button>
                <div style={{ marginTop:14,fontSize:12,color:"#8a9a7a",fontWeight:600 }}>Press SOS to dispatch ambulance immediately</div>
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🚑 Select Ambulance Type</div>
                {AMBULANCE_TYPES.map(t => (
                  <div key={t.id} onClick={() => setSelectedType(t.id)} className="amb-c" style={{ border:`2px solid ${selectedType===t.id?"#dc2040":"#f0ede5"}`,cursor:"pointer",display:"flex",gap:12,alignItems:"center" }}>
                    <span style={{ fontSize:26,flexShrink:0 }}>{t.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800,fontSize:13,color:"#1e2a12" }}>{t.label}</div>
                      <div style={{ fontSize:11,color:"#8a9a7a",marginTop:1 }}>{t.desc}</div>
                      <div style={{ display:"flex",gap:6,marginTop:5 }}>
                        <span style={{ background:"#eef5e8",color:"#3e4e26",fontSize:10,fontWeight:800,borderRadius:7,padding:"2px 8px" }}>⏱ {t.eta}</span>
                        <span style={{ background:"#f5f0e8",color:"#5a4e26",fontSize:10,fontWeight:800,borderRadius:7,padding:"2px 8px" }}>{t.price}</span>
                      </div>
                    </div>
                    {selectedType===t.id && <span style={{ color:"#dc2040",fontSize:18,fontWeight:900 }}>✓</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🏥 Nearby Hospitals</div>
                {HOSPITALS.map((h,i) => (
                  <div key={i} className="amb-c" style={{ display:"flex",gap:12,alignItems:"center" }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:h.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>🏥</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800,fontSize:13,color:"#1e2a12" }}>{h.name}</div>
                      <div style={{ fontSize:11,color:"#8a9a7a",marginTop:1 }}>{h.dist} · {h.beds} emergency beds</div>
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ background:h.emergency?"#ffeaea":"#eef5e8",color:h.emergency?"#dc2040":"#3e4e26",fontSize:10,fontWeight:800,borderRadius:7,padding:"4px 10px" }}>{h.eta}</div>
                      {h.emergency && <div style={{ fontSize:9,color:"#dc2040",fontWeight:700,marginTop:2 }}>Emergency ✦</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="amb-c">
                <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>📞 Quick Dial</div>
                <div style={{ display:"flex",gap:10 }}>
                  {[{num:"108",label:"Ambulance",c:"#dc2040"},{num:"102",label:"Maternal",c:"#e0784a"},{num:"112",label:"Emergency",c:"#5b8fa8"}].map(x=>(
                    <button key={x.num} style={{ flex:1,padding:"11px 0",borderRadius:12,border:"none",background:x.c+"22",color:x.c,cursor:"pointer",fontFamily:"'Nunito',sans-serif" }}>
                      <div style={{ fontWeight:900,fontSize:18 }}>{x.num}</div>
                      <div style={{ fontSize:10,fontWeight:700,marginTop:2 }}>{x.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "counting" && (
            <div style={{ textAlign:"center",padding:"40px 0",animation:"fadeUp .3s ease" }}>
              <div style={{ fontSize:96,fontWeight:900,color:"#dc2040",animation:"pulse 1s ease infinite",lineHeight:1 }}>{countdown}</div>
              <div style={{ fontSize:18,fontWeight:800,color:"#1e2a12",marginBottom:8,marginTop:12 }}>Calling Ambulance…</div>
              <div style={{ fontSize:13,color:"#8a9a7a",marginBottom:32 }}>Your location is being shared. Tap cancel to abort.</div>
              <button onClick={cancel} style={{ background:"#fff",border:"2px solid #dc2040",borderRadius:14,padding:"13px 44px",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:14,color:"#dc2040",cursor:"pointer" }}>✕ Cancel</button>
            </div>
          )}

          {(phase === "dispatched" || phase === "arriving") && (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <div className="amb-c" style={{ background:"linear-gradient(135deg,#dc2040,#e8304a)",textAlign:"center",padding:"28px 20px" }}>
                <div style={{ fontSize:52,marginBottom:8 }}>🚑</div>
                <div style={{ color:"#fff",fontWeight:900,fontSize:18,marginBottom:4 }}>
                  {phase==="arriving"?"Driver is 2 min away 🔴":"Ambulance Dispatched ✅"}
                </div>
                <div style={{ color:"rgba(255,255,255,.75)",fontSize:12,marginBottom:16 }}>{chosen?.desc}</div>
                <div style={{ background:"rgba(255,255,255,.2)",borderRadius:12,padding:"12px 20px" }}>
                  <div style={{ color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:700,marginBottom:4 }}>ESTIMATED ARRIVAL</div>
                  <div style={{ color:"#fff",fontWeight:900,fontSize:26 }}>{chosen?.eta}</div>
                </div>
              </div>
              <div className="amb-c" style={{ display:"flex",gap:14,alignItems:"center" }}>
                <div style={{ width:52,height:52,borderRadius:"50%",background:"#eef5e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26 }}>👨‍⚕️</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800,fontSize:14,color:"#1e2a12" }}>Rajan Kumar</div>
                  <div style={{ fontSize:11,color:"#8a9a7a",marginTop:1 }}>Certified EMT · DL-7C-2481</div>
                  <div style={{ display:"flex",gap:4,marginTop:4 }}>
                    <span style={{ color:"#f0a500",fontSize:12 }}>★★★★★</span>
                    <span style={{ fontSize:11,color:"#bbb" }}>4.9</span>
                  </div>
                </div>
                <button style={{ background:"linear-gradient(135deg,#3e4e26,#5a6e3a)",border:"none",borderRadius:12,width:44,height:44,color:"#fff",fontSize:20,cursor:"pointer" }}>📞</button>
              </div>
              <button onClick={cancel} style={{ width:"100%",padding:"13px",borderRadius:14,border:"2px solid #f0ede5",background:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,color:"#8a9a7a",cursor:"pointer",marginTop:4 }}>✕ Cancel Request</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
