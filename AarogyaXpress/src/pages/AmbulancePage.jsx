import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  cancelAmbulanceRequest,
  fetchAmbulanceCatalog,
  readCachedAmbulanceCatalog,
  saveAmbulanceRequest,
} from "../lib/ambulance";

const COLORS = ["#e05252", "#e0784a", "#5b8fa8", "#2e9b6a"];

export default function AmbulancePage() {
  const cached = useMemo(() => readCachedAmbulanceCatalog() || {}, []);
  const [ambulanceTypes, setAmbulanceTypes] = useState(cached.ambulanceTypes || []);
  const [hospitals, setHospitals] = useState((cached.hospitals || []).filter((hospital) => hospital.city === "Dehradun"));
  const [emergencyContacts, setEmergencyContacts] = useState(cached.emergencyContacts || []);
  const [activeRequest, setActiveRequest] = useState((cached.requests || []).find((request) => request.status === "request_logged") || null);
  const [selectedType, setSelectedType] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();
  const chosen = ambulanceTypes.find((type) => type.id === selectedType) || ambulanceTypes[0];
  const emergencyCall = emergencyContacts.find((contact) => contact.phone === "108") || emergencyContacts[0] || { label: "Emergency", phone: "112", icon: "🆘" };

  useEffect(() => {
    let active = true;
    fetchAmbulanceCatalog().then((catalog) => {
      if (!active) return;
      setAmbulanceTypes(catalog.ambulanceTypes || []);
      setHospitals((catalog.hospitals || []).filter((hospital) => hospital.city === "Dehradun"));
      setEmergencyContacts(catalog.emergencyContacts || []);
      setActiveRequest((catalog.requests || []).find((request) => request.status === "request_logged") || null);
      setSelectedType((current) => (catalog.ambulanceTypes || []).some((type) => type.id === current)
        ? current
        : catalog.ambulanceTypes?.[0]?.id || "");
      setCatalogError("");
    }).catch((error) => {
      if (active) setCatalogError(error.message || "Could not refresh the ambulance directory.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const saveRequest = async () => {
    setRequestError("");
    setSaving(true);
    try {
      const request = await saveAmbulanceRequest({ ambulanceTypeId: chosen?.id, emergencyNumber: emergencyCall.phone });
      setActiveRequest({ ...request, ambulance_type_label: chosen?.label, emergency_number: emergencyCall.phone });
    } catch (error) {
      setRequestError(error.message || "Could not save the SOS request.");
    } finally {
      setSaving(false);
    }
  };

  const removeRequestLog = async () => {
    if (!activeRequest?.id) return;
    setRequestError("");
    setCancelling(true);
    try {
      await cancelAmbulanceRequest(activeRequest.id);
      setActiveRequest(null);
    } catch (error) {
      setRequestError(error.message || "Could not update the saved request.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes sosRing{0%,100%{box-shadow:0 0 0 0 rgba(220,32,64,0.45)}50%{box-shadow:0 0 0 24px rgba(220,32,64,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .amb-c{background:#fff;border-radius:18px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
      `}</style>
      <div style={{ background:"#f5f2eb",minHeight:"100vh",paddingBottom:110,fontFamily:"'Nunito',system-ui,sans-serif" }}>
        <div style={{ background:"linear-gradient(135deg,#c0101a,#e03040)",padding:"20px 20px 24px",borderRadius:"0 0 24px 24px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-40,right:-40,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,.07)" }} />
          <div style={{ position:"relative",zIndex:2,display:"flex",alignItems:"center",gap:16,marginBottom:16 }}>
            <button type="button" onClick={() => navigate(-1)} aria-label="Go back" style={{ width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <ArrowLeft size={22} color="white" strokeWidth={2.5} />
            </button>
            <div style={{ color:"rgba(255,255,255,.9)",fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1 }}>SOS Services</div>
          </div>
          <div style={{ position:"relative",zIndex:2 }}>
            <h1 style={{ color:"#fff",fontSize:26,fontWeight:900,margin:0 }}>Emergency Services</h1>
            <div style={{ color:"rgba(255,255,255,.85)",fontSize:13,marginTop:4,fontWeight:600 }}>Call the official emergency number directly</div>
          </div>
        </div>

        <div style={{ padding:"20px 18px",animation:"fadeUp .3s ease" }}>
          <div className="amb-c" style={{ textAlign:"center",padding:"22px 18px" }}>
            <a href={`tel:${emergencyCall.phone}`} aria-label={`Call ${emergencyCall.phone}`} style={{ width:148,height:148,borderRadius:"50%",background:"linear-gradient(135deg,#dc2040,#e8304a)",border:"6px solid rgba(220,32,64,.16)",animation:"sosRing 2s ease infinite",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,margin:"0 auto",color:"#fff",textDecoration:"none" }}>
              <span style={{ fontSize:46 }}>{emergencyCall.icon || "🆘"}</span>
              <span style={{ fontWeight:900,fontSize:15 }}>CALL {emergencyCall.phone}</span>
              <span style={{ color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700 }}>{emergencyCall.label}</span>
            </a>
            <div style={{ marginTop:16,fontSize:12,color:"#8a4a42",fontWeight:700,lineHeight:1.5 }}>This app does not dispatch ambulances or track drivers. For urgent help, call now.</div>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🚑 Ambulance options</div>
            {loading && !ambulanceTypes.length && <div className="amb-c" style={{ color:"#8a9a7a",fontSize:12 }}>Loading options…</div>}
            {!loading && !ambulanceTypes.length && <div className="amb-c" style={{ color:"#a52d26",fontSize:12 }}>Ambulance options are unavailable. You can still call 108 or 112.</div>}
            {ambulanceTypes.map((type) => (
              <button key={type.id} type="button" onClick={() => setSelectedType(type.id)} className="amb-c" style={{ width:"100%",border:`2px solid ${selectedType===type.id?"#dc2040":"#f0ede5"}`,cursor:"pointer",display:"flex",gap:12,alignItems:"center",textAlign:"left",fontFamily:"inherit" }}>
                <span style={{ fontSize:26,flexShrink:0 }}>{type.icon}</span>
                <span style={{ flex:1 }}>
                  <span style={{ display:"block",fontWeight:800,fontSize:13,color:"#1e2a12" }}>{type.label}</span>
                  <span style={{ display:"block",fontSize:11,color:"#8a9a7a",marginTop:2 }}>{type.description}</span>
                  <span style={{ display:"block",fontSize:10,color:"#8a6a31",marginTop:5 }}>{type.is_sample ? "Demo estimate" : "Provider estimate"}{type.eta_minutes ? ` · ${type.eta_minutes} min` : ""}{type.price_min != null ? ` · ₹${type.price_min}${type.price_max != null ? `–${type.price_max}` : "+"}` : ""}</span>
                </span>
                {selectedType===type.id && <span style={{ color:"#dc2040",fontSize:18,fontWeight:900 }}>✓</span>}
              </button>
            ))}
            {!!ambulanceTypes.length && <div style={{ fontSize:10,color:"#8a9a7a",lineHeight:1.5,padding:"0 4px" }}>Service type, arrival estimates, and prices are illustrative until a dispatch provider is connected.</div>}
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>🏥 Hospitals in Dehradun</div>
            {!hospitals.length && loading && <div className="amb-c" style={{ color:"#8a9a7a",fontSize:12 }}>Loading Dehradun hospital directory…</div>}
            {!hospitals.length && !loading && <div className="amb-c" style={{ color:catalogError?"#a52d26":"#8a9a7a",fontSize:12 }}>{catalogError || "No Dehradun hospitals are listed yet."}</div>}
            {hospitals.map((hospital,index) => (
              <div key={hospital.id} className="amb-c" style={{ display:"flex",gap:12,alignItems:"center" }}>
                <div style={{ width:44,height:44,borderRadius:12,background:`${COLORS[index%COLORS.length]}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>🏥</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:"#1e2a12" }}>{hospital.name}</div>
                  <div style={{ fontSize:11,color:"#8a9a7a",marginTop:2,lineHeight:1.45 }}>{hospital.address || `${hospital.city}, Uttarakhand`}</div>
                  {hospital.phone && <a href={`tel:${hospital.phone.replace(/[^+\d]/g,"")}`} style={{ display:"inline-block",fontSize:11,color:"#3e6830",fontWeight:800,marginTop:5,textDecoration:"none" }}>Call {hospital.phone}</a>}
                </div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.name}, ${hospital.address || hospital.city}`)}`} target="_blank" rel="noreferrer" style={{ flexShrink:0,background:"#eef5e8",color:"#3e4e26",fontSize:10,fontWeight:800,borderRadius:7,padding:"8px 10px",textDecoration:"none" }}>Directions</a>
              </div>
            ))}
            {!!hospitals.length && <div style={{ fontSize:10,color:"#8a9a7a",lineHeight:1.5,padding:"0 4px" }}>Distance, traffic time, bed availability, and emergency capacity are not live-tracked. Call the hospital before travelling.</div>}
          </div>

          <div className="amb-c">
            <div style={{ fontSize:13,fontWeight:800,color:"#1e2a12",marginBottom:10 }}>📞 Emergency hotlines</div>
            <div style={{ display:"flex",gap:10 }}>
              {emergencyContacts.map((contact) => (
                <a key={contact.id} href={`tel:${contact.phone}`} style={{ flex:1,padding:"11px 4px",borderRadius:12,background:"#f5f0e8",color:"#3e4e26",textAlign:"center",textDecoration:"none" }}>
                  <div style={{ fontWeight:900,fontSize:18 }}>{contact.phone}</div>
                  <div style={{ fontSize:10,fontWeight:700,marginTop:2 }}>{contact.label}</div>
                </a>
              ))}
            </div>
            {!emergencyContacts.length && <a href="tel:112" style={{ display:"block",padding:12,borderRadius:12,background:"#f5f0e8",color:"#3e4e26",textAlign:"center",textDecoration:"none",fontWeight:800 }}>Call 112 · Emergency</a>}
          </div>

          {catalogError && <div role="status" style={{ marginTop:12,fontSize:11,color:"#8a6a31" }}>Showing saved directory data where available. {catalogError}</div>}
          {requestError && <div role="alert" style={{ marginTop:12,padding:12,borderRadius:12,background:"#fff0ef",color:"#a52d26",fontSize:12 }}>{requestError}</div>}

          {activeRequest ? (
            <div className="amb-c" style={{ marginTop:14,border:"1px solid #f1d5a8" }}>
              <div style={{ fontWeight:900,fontSize:14,color:"#725116" }}>SOS request saved</div>
              <div style={{ fontSize:12,color:"#806c45",marginTop:5,lineHeight:1.5 }}>Log ID {activeRequest.id}. It has not dispatched an ambulance. Call emergency services directly for help.</div>
              <a href={`tel:${activeRequest.emergency_number || emergencyCall.phone}`} style={{ display:"block",marginTop:12,padding:12,borderRadius:12,background:"#dc2040",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:900 }}>Call {activeRequest.emergency_number || emergencyCall.phone} now</a>
              <button type="button" onClick={removeRequestLog} disabled={cancelling} style={{ width:"100%",marginTop:10,padding:11,borderRadius:12,border:"1px solid #e7e3da",background:"#fff",color:"#7d8772",fontFamily:"inherit",fontWeight:800,cursor:cancelling?"wait":"pointer" }}>{cancelling ? "Updating…" : "Remove saved log"}</button>
            </div>
          ) : (
            <button type="button" onClick={saveRequest} disabled={saving || !chosen} style={{ width:"100%",marginTop:14,padding:15,borderRadius:14,border:0,background:"#dc2040",color:"#fff",fontFamily:"inherit",fontWeight:900,fontSize:14,cursor:saving?"wait":"pointer",opacity:saving?0.7:1 }}>
              {saving ? "Saving request…" : "Save SOS request to Supabase"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
