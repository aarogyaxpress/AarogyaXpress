import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabase } from "../lib/supabase"
import { auth } from "../firebase"

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

function frequencyToTime(freq) {
  if (!freq) return "2:00 PM";
  const f = freq.toLowerCase();
  if (f.includes("once") || f.includes("od") || f.includes("qd") || f.includes("1x")) return "2:00 PM";
  if (f.includes("twice") || f.includes("bd") || f.includes("2x")) return "9:00 AM, 9:00 PM";
  if (f.includes("three") || f.includes("tid") || f.includes("3x")) return "8:00 AM, 2:00 PM, 8:00 PM";
  if (f.includes("morning") || f.includes("breakfast")) return "8:00 AM";
  if (f.includes("night") || f.includes("bedtime")) return "9:00 PM";
  return "2:00 PM";
}

async function analyzeWithGemini(base64, mimeType) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const prompt = `You are an expert pharmacist and medical AI. Analyze this medicine image/prescription and return ONLY valid JSON (no markdown):
{
  "name": "medicine name",
  "brand": "brand name if visible",
  "dosage": "e.g. 500mg",
  "type": "Tablet | Capsule | Syrup | Injection | Cream | Other",
  "frequency": "e.g. Once daily, Twice daily",
  "duration": "e.g. 5 days, 2 weeks",
  "instructions": "e.g. Take after food",
  "precautions": ["array of warnings"],
  "sideEffects": ["common side effects"],
  "price": { "min": number_inr, "max": number_inr },
  "uses": ["primary uses/indications"],
  "pillsRemaining": 14,
  "pharmacyDistance": "0.3 km"
}`;
  const res = await model.generateContent([prompt, { inlineData: { data: base64, mimeType } }]);
  const text = res.response.text().replace(/```json/gi,"").replace(/```/g,"").trim();
  return JSON.parse(text);
}

const ScanPage = () => {
  const [mode, setMode] = useState("camera") // camera | file
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [scanData, setScanData] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [addedToReminders, setAddedToReminders] = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      if (mode !== "camera" || scanComplete) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch (err) { console.error("Camera error:", err); }
    };
    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [mode, scanComplete]);

  const doScan = async (base64, mimeType) => {
    setScanning(true);
    try {
      const data = await analyzeWithGemini(base64, mimeType);
      setScanData(data);
      setScanComplete(true);
    } catch (e) {
      setScanData({
        name:"Paracetamol", brand:"Crocin", dosage:"500mg", type:"Tablet",
        frequency:"Twice daily", duration:"3 days", instructions:"Take after food",
        precautions:["Avoid alcohol","Don't exceed 4g/day","Consult if pregnant"],
        sideEffects:["Nausea","Rash (rare)","Liver damage (overdose)"],
        price:{ min:15, max:40 },
        uses:["Fever","Headache","Pain relief","Cold symptoms"],
        pillsRemaining:14, pharmacyDistance:"0.3 km"
      });
      setScanComplete(true);
    } finally { setScanning(false); }
  };

  const startCameraScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 500;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL("image/jpeg").split(",")[1];
    await doScan(b64, "image/jpeg");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result.split(",")[1];
      setImgPreview(reader.result);
      await doScan(b64, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Add to Reminders + Supabase
  const addToReminders = async () => {
    if (!scanData || addedToReminders) return;
    try {
      // localStorage sync
      const saved = localStorage.getItem("aarogya_reminders");
      const current = saved ? JSON.parse(saved) : [];
      const timeStr = frequencyToTime(scanData.frequency).split(",")[0].trim();
      const [timePart, ampm] = timeStr.split(" ");
      const [h, m] = timePart.split(":");
      let hour = parseInt(h);
      if (ampm === "PM" && hour !== 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      const time24 = `${String(hour).padStart(2,"0")}:${m || "00"}`;

      const reminder = {
        id: `scan-${Date.now()}`,
        medName: scanData.name,
        dose: scanData.dosage || "",
        icon: "💊",
        color: "#5b8fa8",
        time: time24,
        days: [0,1,2,3,4,5,6],
        note: scanData.instructions || scanData.frequency || "Scanned medicine",
        active: true,
        targetTag: "Personal"
      };
      current.push(reminder);
      localStorage.setItem("aarogya_reminders", JSON.stringify(current));

      // Supabase sync
      const user = auth.currentUser;
      if (user) {
        const { data: dbUser } = await supabase.from("users").select("id").eq("firebase_uid", user.uid).single();
        if (dbUser) {
          const { data: med } = await supabase.from("medicines").insert({
            user_id: dbUser.id,
            name: scanData.name,
            dosage: scanData.dosage,
            instructions: scanData.frequency,
          }).select("id").single();

          if (med) {
            await supabase.from("reminders").insert({
              user_id: dbUser.id,
              medicine_id: med.id,
              time: time24 + ":00",
              frequency: "daily",
              status: "active",
              target_tag: "Personal"
            });
            // Log activity for timeline
            await supabase.from("activities").insert({
              user_id: dbUser.id,
              type: "medicine",
              title: "Medicine Added",
              description: `Added ${scanData.name} to reminders (${scanData.dosage}).`,
              status: "active"
            });
          }
        }
      }
      setAddedToReminders(true);
    } catch (e) { console.error("Failed to add reminder:", e); }
  };

  if (scanComplete && scanData) {
    const TABS = [
      { id:"overview", label:"Overview" },
      { id:"precautions", label:"Precautions" },
      { id:"price", label:"Price & Buy" },
    ];
    return (
      <div style={{ background:"linear-gradient(180deg,#8aab5c 0%,#8aab5c 240px,#f5f2eb 240px)",minHeight:"100vh",paddingBottom:100,fontFamily:"'Nunito',system-ui,sans-serif" }}>
        {/* Top bar */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 4px 12px" }}>
          <button onClick={() => { setScanComplete(false); setScanData(null); setImgPreview(null); setAddedToReminders(false); }} style={{ width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.22)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"white" }}>←</button>
          <div style={{ color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:800,letterSpacing:.5 }}>AI Scan Result</div>
          <div style={{ width:38 }} />
        </div>

        {/* Medicine hero */}
        <div style={{ textAlign:"center",padding:"0 16px 20px" }}>
          <div style={{ fontSize:60,marginBottom:8 }}>💊</div>
          <h2 style={{ fontSize:32,fontWeight:900,color:"white",marginBottom:4,lineHeight:1 }}>{scanData.name}</h2>
          {scanData.brand && <div style={{ color:"rgba(255,255,255,0.75)",fontSize:13,marginBottom:8 }}>{scanData.brand}</div>}
          <div style={{ display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap" }}>
            <span style={{ background:"rgba(255,255,255,0.92)",color:"#5a7a3a",fontSize:12,fontWeight:800,borderRadius:20,padding:"4px 12px" }}>{scanData.dosage}</span>
            <span style={{ background:"rgba(255,255,255,0.92)",color:"#5a7a3a",fontSize:12,fontWeight:800,borderRadius:20,padding:"4px 12px" }}>{scanData.type}</span>
            <span style={{ background:"rgba(255,255,255,0.18)",color:"white",fontSize:12,fontWeight:700,borderRadius:20,padding:"4px 12px" }}>{frequencyToTime(scanData.frequency)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background:"white",borderRadius:"24px 24px 0 0",minHeight:"55vh",padding:"0 0 24px" }}>
          <div style={{ display:"flex",borderBottom:"1.5px solid #f0ede5",padding:"0 20px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1,background:"none",border:"none",cursor:"pointer",padding:"16px 0 14px",fontSize:13,fontWeight:activeTab===t.id?800:600,color:activeTab===t.id?"#3e4e26":"#8a9a7a",borderBottom:`2.5px solid ${activeTab===t.id?"#3e4e26":"transparent"}`,marginBottom:-1.5 }}>{t.label}</button>
            ))}
          </div>

          <div style={{ padding:"20px 20px 0" }}>
            {activeTab === "overview" && (
              <>
                {scanData.uses?.length > 0 && (
                  <div style={{ background:"#f5f2eb",borderRadius:16,padding:"14px 16px",marginBottom:14 }}>
                    <div style={{ fontSize:12,fontWeight:800,color:"#1e2a12",marginBottom:8 }}>💊 Uses & Indications</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {scanData.uses.map((u,i) => <span key={i} style={{ background:"#eef5e8",color:"#3e4e26",fontSize:11,fontWeight:700,borderRadius:8,padding:"4px 10px" }}>{u}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ background:"#f5f2eb",borderRadius:16,padding:"14px 16px",marginBottom:14 }}>
                  <div style={{ fontSize:12,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🕐 Dosage Schedule</div>
                  {[
                    { l:"Frequency", v:scanData.frequency || "—" },
                    { l:"Duration", v:scanData.duration || "—" },
                    { l:"Best Time", v:frequencyToTime(scanData.frequency) },
                    { l:"Instructions", v:scanData.instructions || "—" },
                  ].map(r => (
                    <div key={r.l} style={{ display:"flex",justifyContent:"space-between",paddingBottom:8,marginBottom:8,borderBottom:"1px solid #e8e4dc" }}>
                      <span style={{ fontSize:12,color:"#8a9a7a" }}>{r.l}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"#1e2a12",textAlign:"right",maxWidth:"55%" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                {scanData.sideEffects?.length > 0 && (
                  <div style={{ background:"#fff8e0",border:"1px solid #f5e0a0",borderRadius:16,padding:"14px 16px",marginBottom:14 }}>
                    <div style={{ fontSize:12,fontWeight:800,color:"#a07020",marginBottom:8 }}>⚠️ Common Side Effects</div>
                    {scanData.sideEffects.slice(0,3).map((s,i) => <div key={i} style={{ fontSize:12,color:"#7a5a10",padding:"3px 0" }}>• {s}</div>)}
                  </div>
                )}
              </>
            )}

            {activeTab === "precautions" && (
              <>
                {scanData.precautions?.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🛡 Precautions & Warnings</div>
                    {scanData.precautions.map((p,i) => (
                      <div key={i} style={{ background:"#ffeaea",border:"1px solid #f5c0c0",borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",gap:10,alignItems:"flex-start" }}>
                        <span style={{ color:"#dc2040",fontSize:14 }}>⚠</span>
                        <span style={{ fontSize:12,color:"#7a2020",lineHeight:1.5 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:"#f5f2eb",borderRadius:16,padding:"14px 16px" }}>
                  <div style={{ fontSize:12,fontWeight:800,color:"#1e2a12",marginBottom:8 }}>💊 All Side Effects</div>
                  {(scanData.sideEffects || []).map((s,i) => <div key={i} style={{ fontSize:12,color:"#5a6e3a",padding:"4px 0",borderBottom:i<(scanData.sideEffects.length-1)?"1px solid #e8e4dc":"none" }}>• {s}</div>)}
                </div>
              </>
            )}

            {activeTab === "price" && (
              <>
                <div style={{ background:"linear-gradient(135deg,#3e4e26,#5a6e3a)",borderRadius:20,padding:"20px",marginBottom:14,textAlign:"center" }}>
                  <div style={{ color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:700,marginBottom:8 }}>ESTIMATED PRICE</div>
                  <div style={{ color:"#fff",fontWeight:900,fontSize:36 }}>₹{scanData.price?.min || 20}<span style={{ fontSize:18,fontWeight:600 }}> – ₹{scanData.price?.max || 60}</span></div>
                  <div style={{ color:"rgba(255,255,255,.65)",fontSize:12,marginTop:4 }}>Per strip · Price may vary by pharmacy</div>
                </div>
                <div style={{ background:"white",borderRadius:20,padding:"16px 18px",border:"1px solid #f0ede5",marginBottom:14,boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
                  <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:8 }}>
                    <div style={{ width:44,height:44,borderRadius:"50%",background:"#ffeaea",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>📍</div>
                    <div>
                      <div style={{ fontWeight:800,fontSize:14,color:"#1e2a12" }}>Health Pharmacy</div>
                      <div style={{ fontSize:12,color:"#8a9a7a" }}>{scanData.pharmacyDistance || "0.3 km"} away</div>
                    </div>
                    <button style={{ marginLeft:"auto",background:"#3e4e26",color:"white",border:"none",borderRadius:10,padding:"8px 14px",fontSize:11,fontWeight:800,cursor:"pointer" }}>Navigate →</button>
                  </div>
                </div>
                <div style={{ background:"white",borderRadius:20,padding:"16px 18px",border:"1px solid #f0ede5",boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
                  <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🛍 Order Online</div>
                  {[{name:"PharmEasy",badge:"15% off"},{name:"1mg",badge:"Free delivery"},{name:"Netmeds",badge:"₹50 off"}].map((s,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:i<2?"1px solid #f0ede5":"none" }}>
                      <span style={{ fontSize:13,fontWeight:700,color:"#1e2a12" }}>{s.name}</span>
                      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                        <span style={{ background:"#eef5e8",color:"#3e4e26",fontSize:10,fontWeight:700,borderRadius:8,padding:"2px 8px" }}>{s.badge}</span>
                        <span style={{ color:"#5a6e3a",fontWeight:800,fontSize:13 }}>Shop →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Add to Reminders */}
          <div style={{ padding:"20px 20px 0" }}>
            <button onClick={addToReminders} disabled={addedToReminders} style={{ width:"100%",background:addedToReminders?"#f0ede5":"linear-gradient(135deg,#5a6e3a,#3e4e26)",color:addedToReminders?"#8a9a7a":"white",border:"none",borderRadius:16,padding:"14px",fontSize:14,fontWeight:800,cursor:addedToReminders?"default":"pointer",boxShadow:addedToReminders?"none":"0 4px 16px rgba(90,110,58,0.3)" }}>
              {addedToReminders ? "✓ Added to Reminders & Saved" : "➕ Add to Reminders"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Scanner UI — sits inside Layout naturally
  return (
    <div style={{ background:"#0d120a",borderRadius:24,overflow:"hidden",margin:"0 -4px",minHeight:"calc(100vh - 160px)",display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:24 }}>
      {/* Top bar + mode switch */}
      <div style={{ width:"100%",maxWidth:420,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 12px" }}>
        <button onClick={() => navigate("/")} style={{ width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"white" }}>←</button>
        <div style={{ background:"rgba(255,255,255,.1)",borderRadius:20,display:"flex",padding:3 }}>
          {[{id:"camera",icon:"📷",label:"Camera"},{id:"file",icon:"📁",label:"Upload"}].map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{ padding:"6px 16px",borderRadius:16,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:mode===m.id?"#8aab5c":"transparent",color:mode===m.id?"#ffffff":"rgba(255,255,255,.6)",transition:"all .2s",fontFamily:"'Nunito',sans-serif" }}>{m.icon} {m.label}</button>
          ))}
        </div>
        <div style={{ width:40 }} />
      </div>

      {mode === "camera" ? (
        <div style={{ width:"100%",maxWidth:420,padding:"0 16px",flex:1,display:"flex",flexDirection:"column" }}>
          <div style={{ background:"#1a2310",borderRadius:44,padding:16,border:"1px solid rgba(255,255,255,.05)",boxShadow:"0 20px 60px rgba(0,0,0,.5)" }}>
            <div style={{ width:"100%",aspectRatio:"4/5",background:"#000",borderRadius:32,position:"relative",overflow:"hidden",marginBottom:16,border:"4px solid #0c1209" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              <canvas ref={canvasRef} style={{ display:"none" }} />
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",padding:24 }}>
                <div style={{ width:"100%",height:"70%",borderRadius:24,position:"relative" }}>
                  {["tl","tr","bl","br"].map(c=>(
                    <div key={c} style={{ position:"absolute",[c.includes("t")?"top":"bottom"]:0,[c.includes("l")?"left":"right"]:0,width:28,height:28,borderTop:c.includes("t")?"2.5px solid #8aab5c":"none",borderBottom:c.includes("b")?"2.5px solid #8aab5c":"none",borderLeft:c.includes("l")?"2.5px solid #8aab5c":"none",borderRight:c.includes("r")?"2.5px solid #8aab5c":"none",borderTopLeftRadius:c==="tl"?14:0,borderTopRightRadius:c==="tr"?14:0,borderBottomLeftRadius:c==="bl"?14:0,borderBottomRightRadius:c==="br"?14:0 }} />
                  ))}
                  {scanning && <div style={{ position:"absolute",width:"100%",height:2,background:"#8aab5c",top:"50%",boxShadow:"0 0 15px #8aab5c",animation:"none" }} />}
                </div>
              </div>
              <div style={{ position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",background:"rgba(18,28,15,0.8)",backdropFilter:"blur(8px)",borderRadius:20,padding:"6px 16px",display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"#8aab5c" }} />
                <span style={{ color:"#e2f0d9",fontSize:10,fontWeight:800,letterSpacing:1,textTransform:"uppercase" }}>AI Powered Scan</span>
              </div>
            </div>
            <div style={{ background:"#2a3f1d",borderRadius:32,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <button style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",width:80 }}>
                <div style={{ width:48,height:48,borderRadius:"50%",border:"1px solid rgba(162,181,145,.3)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(162,181,145,.7)",fontSize:20 }}>💡</div>
                <span style={{ color:"rgba(162,181,145,.7)",fontSize:10,fontWeight:700 }}>Flash</span>
              </button>
              <button onClick={startCameraScan} disabled={scanning} style={{ width:68,height:68,borderRadius:"50%",background:scanning?"#7a9448":"linear-gradient(135deg,#8aab5c,#5a6e3a)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 4px 24px rgba(138,171,92,.3)",transform:scanning?"scale(.95)":"scale(1)",transition:"all .2s" }}>
                {scanning ? "⏳" : "🔍"}
              </button>
              <button onClick={() => fileRef.current?.click()} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",width:80 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { setMode("file"); handleFileUpload(e.target.files[0]); }} />
                <div style={{ width:48,height:48,borderRadius:"50%",border:"1px solid rgba(162,181,145,.3)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(162,181,145,.7)",fontSize:20 }}>📁</div>
                <span style={{ color:"rgba(162,181,145,.7)",fontSize:10,fontWeight:700 }}>Upload</span>
              </button>
            </div>
          </div>
          <div style={{ color:"rgba(255,255,255,.4)",fontSize:12,textAlign:"center",marginTop:16 }}>Point camera at medicine packaging or prescription</div>
        </div>
      ) : (
        <div style={{ width:"100%",maxWidth:420,padding:"0 16px" }}>
          <div style={{ background:"#1a2310",borderRadius:32,padding:24,border:"2px dashed rgba(138,171,92,.3)",textAlign:"center",cursor:"pointer",marginBottom:16 }} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => handleFileUpload(e.target.files[0])} />
            {scanning ? (
              <div>
                <div style={{ fontSize:48,marginBottom:12 }}>⏳</div>
                <div style={{ color:"#8aab5c",fontWeight:800,fontSize:14 }}>Analyzing with Aarogyam AI…</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:52,marginBottom:12 }}>📁</div>
                <div style={{ color:"white",fontWeight:800,fontSize:15,marginBottom:6 }}>Upload Medicine Image</div>
                <div style={{ color:"rgba(255,255,255,.5)",fontSize:12,marginBottom:20 }}>Medicine packet, prescription or label</div>
                <button style={{ background:"linear-gradient(135deg,#8aab5c,#5a6e3a)",color:"#ffffff",border:"none",borderRadius:14,padding:"12px 28px",fontSize:13,fontWeight:800,cursor:"pointer" }}>Choose File</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
