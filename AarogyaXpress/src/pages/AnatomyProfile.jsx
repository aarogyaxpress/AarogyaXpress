import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "aarogya_reports";
const RANGES = {
    hemoglobin: { low: 12, high: 17.5, unit: "g/dL", label: "Haemoglobin", emoji: "🩸" },
    cholesterol: { low: 0, high: 200, unit: "mg/dL", label: "Cholesterol", emoji: "🫀" },
    glucose: { low: 70, high: 99, unit: "mg/dL", label: "Glucose", emoji: "🍬" },
    thrombocyte: { low: 150, high: 400, unit: "×10⁹/L", label: "Thrombocyte", emoji: "🔵" },
    potassium: { low: 3.5, high: 5.0, unit: "mmol/L", label: "Potassium", emoji: "⚡" },
    sodium: { low: 135, high: 145, unit: "mmol/L", label: "Sodium", emoji: "💧" },
};
function getStatus(k, v) { const r = RANGES[k]; if (!r) return "normal"; if (v > r.high) return "high"; if (v < r.low) return "low"; return "normal"; }
function mColor(s) { return s === "high" ? "#e05252" : s === "low" ? "#f59e0b" : "#2cb89a"; }

const ORGAN_REGIONS = [
    {
        id: "heart", label: "Heart", emoji: "❤️", color: "#e05252", cx: 43, cy: 22, r: 9,
        detail: r => ({
            title: "Heart", icon: "❤️",
            stats: [{ label: "Heart Rate", val: r?.heartRate, unit: "bpm", key: null }, { label: "Blood Pressure", val: r?.bloodPressure, unit: "mmHg", key: null }],
            desc: "Your heart pumps blood through your body. Normal resting HR is 60–100 bpm.",
            tip: r?.heartRate && parseFloat(r.heartRate) > 90 ? "⚠️ Elevated heart rate detected. Consider rest & hydration." : "✓ Heart rate looks good. Keep up your activity!",
        }),
    },
    {
        id: "lungs", label: "Lungs", emoji: "🫁", color: "#8b6fcb", cx: 56, cy: 24, r: 8,
        detail: r => ({
            title: "Lungs", icon: "🫁",
            stats: [{ label: "Haemoglobin", val: r?.hemoglobin, unit: "g/dL", key: "hemoglobin" }],
            desc: "Lungs deliver oxygen to blood. Haemoglobin is the key oxygen carrier.",
            tip: r?.hemoglobin && parseFloat(r.hemoglobin) < 12 ? "⚠️ Low haemoglobin may indicate anaemia. Consult a doctor." : "✓ Oxygen-carrying capacity looks healthy.",
        }),
    },
    {
        id: "liver", label: "Liver", emoji: "🟤", color: "#f5a623", cx: 57, cy: 38, r: 8,
        detail: r => ({
            title: "Liver & Kidneys", icon: "🟤",
            stats: [{ label: "Cholesterol", val: r?.cholesterol, unit: "mg/dL", key: "cholesterol" }, { label: "Potassium", val: r?.potassium, unit: "mmol/L", key: "potassium" }, { label: "Sodium", val: r?.sodium, unit: "mmol/L", key: "sodium" }],
            desc: "Liver processes cholesterol and toxins. Kidneys filter blood and regulate electrolytes.",
            tip: r?.cholesterol && parseFloat(r.cholesterol) > 200 ? "⚠️ High cholesterol. Reduce saturated fats and increase exercise." : "✓ Liver & kidney markers within range.",
        }),
    },
    {
        id: "glucose", label: "Blood Sugar", emoji: "🍬", color: "#2cb89a", cx: 43, cy: 38, r: 8,
        detail: r => ({
            title: "Blood Sugar", icon: "🍬",
            stats: [{ label: "Glucose", val: r?.glucose, unit: "mg/dL", key: "glucose" }, { label: "Thrombocyte", val: r?.thrombocyte, unit: "×10⁹/L", key: "thrombocyte" }],
            desc: "Blood glucose powers your cells. Normal fasting glucose is 70–99 mg/dL.",
            tip: r?.glucose && parseFloat(r.glucose) > 99 ? "⚠️ Pre-diabetic range. Reduce sugar intake and monitor regularly." : "✓ Blood sugar levels are normal.",
        }),
    },
];

function AnatomySVG({ activeOrgan, onOrganClick }) {
    const T = "#3ecfcf", TD = "#2ab5b5", TL = "#5de0e0", S = "white";
    const SW = 2.2, SW2 = 1.5;
    return (
        <svg viewBox="0 0 260 600" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
                <radialGradient id="tHead" cx="38%" cy="32%" r="60%"><stop offset="0%" stopColor={TL} /><stop offset="100%" stopColor={TD} /></radialGradient>
                <radialGradient id="tTorso" cx="30%" cy="20%" r="70%"><stop offset="0%" stopColor={TL} /><stop offset="100%" stopColor={TD} /></radialGradient>
                <radialGradient id="heartG" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#ff6666" /><stop offset="100%" stopColor="#cc1111" /></radialGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
                <filter id="halo"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            <ellipse cx="130" cy="596" rx="55" ry="7" fill="rgba(0,100,100,0.18)" />
            <ellipse cx="130" cy="38" rx="28" ry="32" fill="url(#tHead)" />
            <ellipse cx="102" cy="38" rx="5" ry="7" fill={TD} stroke={S} strokeWidth={SW2} />
            <ellipse cx="158" cy="38" rx="5" ry="7" fill={TD} stroke={S} strokeWidth={SW2} />
            <path d="M110,24 Q130,20 150,24 L152,44 Q140,50 130,52 Q120,50 108,44 Z" fill={T} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M116,66 L116,78 Q130,82 144,78 L144,66 Q137,70 130,70 Q123,70 116,66 Z" fill={TD} stroke={S} strokeWidth={SW2} />
            <path d="M116,78 Q100,82 88,90 Q80,98 80,108 L96,106 Q100,94 116,88 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M80,108 Q72,112 68,124 Q66,134 70,142 L84,136 Q82,126 84,116 L96,106 Z" fill={TL} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M144,78 Q160,82 172,90 Q180,98 180,108 L164,106 Q160,94 144,88 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M180,108 Q188,112 192,124 Q194,134 190,142 L176,136 Q178,126 176,116 L164,106 Z" fill={TL} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M68,142 Q60,150 58,168 Q56,184 60,198 Q64,208 72,210 Q80,212 86,204 Q90,194 88,178 Q86,162 82,150 L70,142 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M192,142 Q200,150 202,168 Q204,184 200,198 Q196,208 188,210 Q180,212 174,204 Q170,194 172,178 Q174,162 178,150 L190,142 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M96,106 Q88,110 84,120 L80,180 Q78,210 80,236 L86,262 Q90,274 100,278 L130,280 L160,278 Q170,274 174,262 L180,236 Q182,210 180,180 L176,120 Q172,110 164,106 Q152,100 130,100 Q108,100 96,106 Z" fill="url(#tTorso)" stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M110,152 Q120,154 130,152 Q130,164 130,164 Q120,166 110,164 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M130,152 Q140,154 150,152 Q150,164 150,164 Q140,166 130,164 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M108,172 Q120,174 130,172 Q130,186 130,186 Q120,188 108,186 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M130,172 Q142,174 152,172 Q152,186 152,186 Q142,188 130,186 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M108,194 Q120,196 130,194 Q130,208 130,208 Q120,210 108,210 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M130,194 Q142,196 152,194 Q152,208 152,208 Q142,210 130,208 Z" fill={TD} stroke={S} strokeWidth={SW2} strokeLinejoin="round" />
            <path d="M100,278 Q94,284 92,296 L92,316 Q96,322 104,322 Q112,322 114,312 L114,296 Q112,284 106,278 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M104,322 Q98,332 96,352 Q95,370 98,386 Q102,394 108,396 Q114,394 116,384 Q118,366 116,346 Q114,328 110,320 Z" fill={TL} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <ellipse cx="104" cy="404" rx="9" ry="7" fill={TL} stroke={S} strokeWidth={SW} />
            <path d="M92,414 Q86,424 84,442 Q83,458 88,470 Q94,478 102,478 Q108,474 110,464 Q112,448 108,430 Q105,418 98,412 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M160,278 Q166,284 168,296 L168,316 Q164,322 156,322 Q148,322 146,312 L146,296 Q148,284 154,278 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M156,322 Q162,332 164,352 Q165,370 162,386 Q158,394 152,396 Q146,394 144,384 Q142,366 144,346 Q146,328 150,320 Z" fill={TL} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            <ellipse cx="156" cy="404" rx="9" ry="7" fill={TL} stroke={S} strokeWidth={SW} />
            <path d="M168,414 Q174,424 176,442 Q177,458 172,470 Q166,478 158,478 Q152,474 150,464 Q148,448 152,430 Q155,418 162,412 Z" fill={T} stroke={S} strokeWidth={SW} strokeLinejoin="round" />
            {ORGAN_REGIONS.map(org => (
                activeOrgan === org.id && (
                    <circle key={org.id} cx={org.cx / 100 * 260} cy={org.cy / 100 * 600} r={org.r * 2.6 * 260 / 100}
                        fill={org.color} opacity="0.25" filter="url(#halo)" />
                )
            ))}
            <circle cx="112" cy="130" r="16" fill="rgba(255,60,60,0.18)" />
            <path d="M112,144 C100,132 98,118 106,110 C110,106 112,108 112,108 C112,108 114,106 118,110 C126,118 124,132 112,144 Z"
                fill="url(#heartG)" opacity="0.9" filter="url(#glow)">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1s" repeatCount="indefinite" />
            </path>
            <circle cx="112" cy="124" r="5" fill="rgba(255,80,80,0.95)">
                <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="147" cy="138" r="4" fill="rgba(139,111,203,0.90)" />
            <circle cx="107" cy="226" r="4" fill="rgba(245,158,35,0.90)">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="153" cy="220" r="4" fill="rgba(44,184,154,0.90)" />
            {ORGAN_REGIONS.map(org => {
                const cx = org.cx / 100 * 260, cy = org.cy / 100 * 600, r = org.r / 100 * 260;
                const active = activeOrgan === org.id;
                return (
                    <g key={org.id} style={{ cursor: "pointer" }} onClick={() => onOrganClick(org.id)}>
                        <circle cx={cx} cy={cy} r={r + 4} fill="transparent" />
                        {active && (
                            <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={org.color} strokeWidth="2.5" strokeDasharray="4,3" opacity="0.9">
                                <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur="4s" repeatCount="indefinite" />
                            </circle>
                        )}
                        <circle cx={cx} cy={cy} r={r} fill={active ? org.color : "rgba(255,255,255,0.25)"} stroke={org.color} strokeWidth={active ? 0 : 2} opacity={active ? 0.85 : 0.7} />
                        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" style={{ userSelect: "none", pointerEvents: "none" }}>{org.emoji}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function ScoreRing({ score }) {
    const r = 36, circ = 2 * Math.PI * r;
    const pct = score != null ? score / 100 : 0;
    const color = pct >= 0.8 ? "#2cb89a" : pct >= 0.6 ? "#f5a623" : "#e05252";
    return (
        <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
                <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
                    strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
                    transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1.4s ease, stroke 0.5s" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{score != null ? `${score}%` : "—"}</span>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 8, fontWeight: 700, marginTop: 1 }}>HEALTH</span>
            </div>
        </div>
    );
}

function OrganDrawer({ organ, report, onClose }) {
    if (!organ) return null;
    const detail = organ.detail(report);
    return (
        <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, background: "white", borderRadius: "22px 22px 0 0",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", zIndex: 30, animation: "drawerUp 0.3s cubic-bezier(.22,.68,0,1.2) both", padding: "0 20px 28px"
        }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e0e0e0" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: organ.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{detail.icon}</div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#1e2a12" }}>{detail.title}</div>
                        <div style={{ fontSize: 11, color: "#8a9a7a", marginTop: 1 }}>Organ Analysis</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f0f0", border: "none", cursor: "pointer", fontSize: 16, color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {detail.stats.map((s, i) => {
                    const val = s.val ? parseFloat(s.val) : null;
                    const status = s.key && val ? getStatus(s.key, val) : null;
                    const color = status ? mColor(status) : "#5a6e3a";
                    return (
                        <div key={i} style={{ background: "#f5f2eb", borderRadius: 14, padding: "10px 14px", flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{s.val || "—"}<span style={{ fontSize: 9, color: "#aaa", fontWeight: 500, marginLeft: 3 }}>{s.unit}</span></div>
                            {status && (<div style={{ fontSize: 9, fontWeight: 800, color, marginTop: 4 }}>{status === "normal" ? "✓ Normal" : status === "high" ? "⬆ High" : "⬇ Low"}</div>)}
                        </div>
                    );
                })}
            </div>
            <div style={{ background: "#f5f2eb", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#5a6e3a", fontWeight: 600, lineHeight: 1.6 }}>{detail.desc}</div>
            </div>
            <div style={{
                background: detail.tip.startsWith("⚠") ? "#fff3d6" : "#e8f5e0", borderRadius: 14, padding: "10px 14px",
                border: `1.5px solid ${detail.tip.startsWith("⚠") ? "#f5a623" : "#2cb89a"}`
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: detail.tip.startsWith("⚠") ? "#a07800" : "#2e8b0e", lineHeight: 1.5 }}>{detail.tip}</div>
            </div>
        </div>
    );
}

const MOODS = [{ emoji: "😄", label: "Great", val: 5 }, { emoji: "🙂", label: "Good", val: 4 }, { emoji: "😐", label: "Okay", val: 3 }, { emoji: "😔", label: "Low", val: 2 }, { emoji: "😩", label: "Awful", val: 1 }];

function MoodTracker({ mood, onMood }) {
    return (
        <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e2a12", marginBottom: 12 }}>😊 How are you feeling today?</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
                {MOODS.map(m => (
                    <button key={m.val} onClick={() => onMood(m.val)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", transform: mood === m.val ? "scale(1.2)" : "scale(1)", transition: "transform 0.2s", padding: "4px 8px", borderRadius: 12, outline: mood === m.val ? "2.5px solid #5a6e3a" : "2.5px solid transparent" }}>
                        <span style={{ fontSize: 28 }}>{m.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: mood === m.val ? "#5a6e3a" : "#8a9a7a" }}>{m.label}</span>
                    </button>
                ))}
            </div>
            {mood && <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#5a6e3a", animation: "fadeIn 0.3s ease" }}>Mood logged today!</div>}
        </div>
    );
}

export default function AnatomyProfile() {
    const user = auth.currentUser;
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [score, setScore] = useState(null);
    const [activeOrgan, setActiveOrgan] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [mood, setMood] = useState(null);
    const [profile, setProfile] = useState(null);
    const [reports, setReports] = useState([]); 
    const [consultations, setConsultations] = useState([]);
    const [activities, setActivities] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [dbUserId, setDbUserId] = useState(null);

    // Load profile data from Supabase
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (!u) return;
            try {
                const { data } = await supabase
                    .from("users")
                    .select("id,name,age,weight,height,blood_group,gender,location,allergies,chronic_diseases,phone")
                    .eq("firebase_uid", u.uid)
                    .single();
                if (data) {
                    setProfile(data);
                    setDbUserId(data.id);
                }
            } catch {}
        });
        return unsub;
    }, []);

    // Also load from localStorage (for blood test reports)
    useEffect(() => {
        function load() {
            try {
                const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
                if (data.length) {
                    const r = data[data.length - 1]; setReport(r); computeScore(r);
                }
            } catch (e) { }
        }
        function computeScore(r) {
            const keys = Object.keys(RANGES).filter(k => r[k]);
            if (!keys.length) { setScore(null); return; }
            const good = keys.filter(k => getStatus(k, parseFloat(r[k])) === "normal").length;
            setScore(Math.round((good / keys.length) * 100));
        }
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    // Load reports, consultations, and activities from Supabase
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (!u) return;
            setReportsLoading(true);
            try {
                const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', u.uid).single();
                if (!dbUser) return;
                
                // Fetch shared family links
                const { data: links } = await supabase.from('family_links')
                    .select('linked_user_id').eq('user_id', dbUser.id).eq('status', 'accepted');
                const famIds = links ? links.map(l => l.linked_user_id) : [];
                const ids = [dbUser.id, ...famIds];
                
                // Fetch Reports
                const { data: reps } = await supabase
                    .from('reports')
                    .select('id,file_name,patient_name,report_date,summary,overall_status,created_at,raw_json,user_id')
                    .in('user_id', ids)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setReports(reps || []);
                
                // If we have a latest report in Supabase, sync it to the anatomical view
                if (reps && reps.length > 0) {
                    const latest = reps[0].raw_json;
                    if (latest) {
                        setReport(latest);
                        computeScore(latest);
                    }
                }

                // Fetch Consultations
                const { data: cons } = await supabase
                    .from('consultations')
                    .select('*')
                    .in('user_id', ids)
                    .order('created_at', { ascending: false });
                setConsultations(cons || []);

                // Fetch Activities
                const { data: acts } = await supabase
                    .from('activities')
                    .select('id, type, title, description, cost, created_at, user_id')
                    .in('user_id', ids)
                    .order('created_at', { ascending: false });
                setActivities(acts || []);

            } catch (e) { console.error('Failed to fetch data:', e); }
            finally { setReportsLoading(false); }
        });
        function computeScore(r) {
            const keys = Object.keys(RANGES).filter(k => r[k]);
            if (!keys.length) { setScore(null); return; }
            const good = keys.filter(k => getStatus(k, parseFloat(r[k])) === "normal").length;
            setScore(Math.round((good / keys.length) * 100));
        }
        return unsub;
    }, []);

    // Delete report from Supabase
    const deleteReport = async (repId) => {
        try {
            await supabase.from('reports').delete().eq('id', repId);
            setReports(prev => prev.filter(r => r.id !== repId));
        } catch (e) { console.error('Delete report failed:', e); }
    };

    const displayReport = report || {};
    const activeOrganObj = ORGAN_REGIONS.find(o => o.id === activeOrgan);
    const TABS = [{ id: "overview", label: "Overview" }, { id: "metrics", label: "Reports" }, { id: "log", label: "Timeline" }];

    return (
        <>
            <style>{`
        @keyframes drawerUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        .hs::-webkit-scrollbar{display:none}.hs{scrollbar-width:none}
      `}</style>
            <div className="min-h-screen bg-[#f5f2eb] flex justify-center items-start">
                <div className="hs w-full max-w-[430px] min-h-screen bg-white shadow-2xl flex flex-col relative overflow-hidden"
                    style={{ fontFamily: "'Nunito',system-ui,sans-serif", overflowY: "auto" }}>
                    {/* Header */}
                    <div style={{ background: "#3e4e26", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "white", marginRight: 4 }}>←</button>
                            <div style={{ background: "#8aab5c", borderRadius: 16, padding: "5px 12px" }}><span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>Aarogya</span></div>
                            <span style={{ color: "white", fontSize: 18, fontWeight: 900 }}>My Profile</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {dbUserId && (
                                <div style={{ background: "white", padding: 4, borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }} onClick={() => alert("Scan this QR at the clinic to share your medical history instantly.")}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://aarogya-xpress.vercel.app/share/${dbUserId}`} alt="Share QR" style={{ width: 44, height: 44 }} />
                                </div>
                            )}
                            <ScoreRing score={score} />
                        </div>
                    </div>

                    {/* Profile card */}
                    <div style={{ background: "linear-gradient(145deg,#5a6e3a,#3e4e26)", padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
                            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#8aab5c,#7a9448)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, border: "3px solid rgba(255,255,255,0.3)", overflow: "hidden", flexShrink: 0 }}>
                                {user?.photoURL ? <img src={user.photoURL} style={{ width: 72, height: 72, objectFit: "cover" }} alt="avatar" /> : <span>👤</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: "white", fontSize: 20, fontWeight: 900 }}>{profile?.name || user?.displayName || "Profile"}</div>
                                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginTop: 1 }}>{user?.email}</div>
                                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                    {[profile?.gender, profile?.blood_group ? `🩸 ${profile.blood_group}` : null, profile?.location, profile?.phone || user?.phoneNumber].filter(Boolean).map((t, i) => (
                                        <span key={i} style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats row — from Supabase profile */}
                    <div style={{ display: "flex", gap: 10, padding: "20px 20px 0" }}>
                        {[
                            { v: profile?.age || displayReport.age, u: "yrs", l: "Age" },
                            { v: profile?.weight || displayReport.weight, u: "kg", l: "Weight" },
                            { v: profile?.height ? `${profile.height}` : displayReport.height, u: "cm", l: "Height" },
                            { v: profile?.blood_group || displayReport.bloodGroup, u: "", l: "Blood" },
                        ].map(({ v, u, l }, i) => (
                            <div key={i} style={{ flex: 1, background: "#f9fbf7", border: "1px solid #eef3e4", borderRadius: 20, padding: "16px 10px", textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "#1e2a12" }}>{v || "—"}</div>
                                {u && <div style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 600 }}>{u}</div>}
                                <div style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 700, marginTop: 2 }}>{l}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", padding: "20px 20px 0", borderBottom: "1.5px solid #e8e4dc" }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0 15px", fontSize: 14, fontWeight: activeTab === t.id ? 900 : 600, color: activeTab === t.id ? "#3e4e26" : "#8a9a7a", borderBottom: activeTab === t.id ? "3px solid #3e4e26" : "3px solid transparent", transition: "all 0.2s", marginBottom: -1.5 }}>{t.label}</button>
                        ))}
                    </div>

                    {/* Overview tab */}
                    {activeTab === "overview" && (
                        <div style={{ animation: "slideIn 0.25s ease both", padding: "20px 20px 0" }}>
                            <div style={{ background: "white", borderRadius: 32, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #f0ede5" }}>
                                <div style={{ background: "linear-gradient(135deg,#1a2340,#2d3f6e)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ color: "white", fontSize: 15, fontWeight: 800 }}>🫀 Interactive Health Map</div>
                                    <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600 }}>{activeOrgan ? ORGAN_REGIONS.find(o => o.id === activeOrgan)?.label : "Tap Dots"}</div>
                                </div>
                                <div style={{ position: "relative", background: "#f0f8ff", height: 450, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(62,207,207,0.16) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                                    <div style={{ width: 200, height: 430, position: "relative", zIndex: 3, flexShrink: 0 }}>
                                        <AnatomySVG activeOrgan={activeOrgan} onOrganClick={id => setActiveOrgan(a => a === id ? null : id)} />
                                    </div>
                                    {!activeOrgan && (
                                        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9 }}>
                                            <div className="animate-pulse-soft" style={{ background: "white", border: "1.5px solid #3ecfcf", borderRadius: 24, padding: "8px 24px", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(62,207,207,0.2)" }}>
                                                <span style={{ fontSize: 12, fontWeight: 800, color: "#1a8080" }}>👆 Tap glowing dots to explore</span>
                                            </div>
                                        </div>
                                    )}
                                    {activeOrgan && <OrganDrawer organ={activeOrganObj} report={displayReport} onClose={() => setActiveOrgan(null)} />}
                                </div>
                            </div>
                            <div style={{ marginTop: 20 }}>
                                <MoodTracker mood={mood} onMood={setMood} />
                            </div>
                            <div style={{ height: 30 }} />
                        </div>
                    )}

                    {/* Reports tab — from Supabase */}
                    {activeTab === "metrics" && (
                        <div style={{ padding: "20px 20px 0", animation: "slideIn 0.25s ease both" }}>
                            {reportsLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9a7a" }}>
                                    <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>Loading reports…</div>
                                </div>
                            ) : reports.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0" }}>
                                    <div style={{ fontSize: 64, marginBottom: 20 }}>📋</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: "#1e2a12", marginBottom: 8 }}>No reports uploaded yet</div>
                                    <div style={{ fontSize: 14, color: "#8a9a7a", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>Go to the Doc Analyser and upload a blood test or prescription to see your report history here.</div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
                                    {reports.map((rep, i) => {
                                        const statusColor = rep.overall_status === "Critical" ? "#e05252" : rep.overall_status === "Attention Required" || rep.overall_status === "Borderline" ? "#f5a623" : "#2cb89a";
                                        const dateStr = rep.report_date || (rep.created_at ? new Date(rep.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
                                        const meds = rep.raw_json?.medicines || [];
                                        return (
                                            <div key={rep.id || i} style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: `1.5px solid ${statusColor}33` }}>
                                                <div style={{ background: `linear-gradient(135deg,${statusColor}22,${statusColor}11)`, padding: "14px 16px", borderBottom: `1px solid ${statusColor}22` }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 11, color: "#8a9a7a", fontWeight: 700, marginBottom: 2 }}>📄 {rep.file_name || "Medical Report"}</div>
                                                            <div style={{ fontSize: 14, fontWeight: 900, color: "#1e2a12", marginBottom: 2 }}>{rep.patient_name || "Report"}</div>
                                                            <div style={{ fontSize: 11, color: "#8a9a7a" }}>📅 {dateStr}</div>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                            <span style={{ background: statusColor + "22", color: statusColor, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "4px 10px" }}>{rep.overall_status || "Analysed"}</span>
                                                            <button onClick={() => deleteReport(rep.id)} style={{ background: "#ffeaea", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#e05252", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🗑</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {rep.summary && (
                                                    <div style={{ padding: "10px 16px", fontSize: 12, color: "#5a6e3a", lineHeight: 1.6, borderBottom: "1px solid #f0ede5" }}>{rep.summary}</div>
                                                )}
                                                {meds.length > 0 && (
                                                    <div style={{ padding: "10px 16px" }}>
                                                        <div style={{ fontSize: 10, fontWeight: 800, color: "#8a9a7a", marginBottom: 6 }}>MEDICINES PRESCRIBED</div>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                            {meds.slice(0, 4).map((m, j) => (
                                                                <span key={j} style={{ background: "#eef5e8", color: "#3e4e26", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "3px 10px" }}>💊 {m.name}</span>
                                                            ))}
                                                            {meds.length > 4 && <span style={{ background: "#f0ede5", color: "#8a9a7a", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "3px 10px" }}>+{meds.length - 4} more</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timeline tab — enhanced with fees, medicine purchases & total expenditure */}
                    {activeTab === "log" && (
                        <div style={{ padding: "20px 20px 0", animation: "slideIn 0.25s ease both" }}>
                            {reportsLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9a7a" }}>
                                    <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>Loading timeline…</div>
                                </div>
                            ) : (() => {
                                // Build unified timeline
                                const allItems = [
                                    ...reports.map(r => ({ ...r, timelineType: 'report', date: new Date(r.created_at) })),
                                    ...consultations.map(c => ({ ...c, timelineType: 'consultation', date: new Date(c.created_at) })),
                                    ...activities.map(a => ({ ...a, timelineType: 'activity', date: new Date(a.created_at) }))
                                ].sort((a, b) => b.date - a.date);

                                // Calculate total expenditure
                                const totalDoctorFees = consultations.reduce((sum, c) => sum + (parseFloat(c.fee) || 0), 0);
                                const totalMedicineCost = activities.filter(a => a.type === 'medicine_purchase').reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
                                const grandTotal = totalDoctorFees + totalMedicineCost;

                                if (allItems.length === 0) return (
                                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                                        <div style={{ fontSize: 64, marginBottom: 20 }}>📅</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: "#1e2a12", marginBottom: 8 }}>No history yet</div>
                                        <div style={{ fontSize: 14, color: "#8a9a7a", maxWidth: 260, margin: "0 auto" }}>Your chronological report uploads, doctor visits, and medicine purchases will appear here.</div>
                                    </div>
                                );

                                return (
                                    <div style={{ position: "relative", paddingBottom: 24 }}>

                                        {/* ── Total Expenditure Card ── */}
                                        <div style={{
                                            background: "linear-gradient(135deg,#3e4e26,#5a6e3a)",
                                            borderRadius: 22, padding: "18px 20px", marginBottom: 24,
                                            boxShadow: "0 8px 30px rgba(62,78,38,0.28)", position: "relative", overflow: "hidden"
                                        }}>
                                            <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
                                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>💰 Total Expenditure</div>
                                            <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, marginBottom: 14 }}>₹{grandTotal.toLocaleString('en-IN')}</div>
                                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 14px", flex: 1, minWidth: 100 }}>
                                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>🏥 Doctor Visits</div>
                                                    <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginTop: 3 }}>₹{totalDoctorFees.toLocaleString('en-IN')}</div>
                                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{consultations.length} consultation{consultations.length !== 1 ? 's' : ''}</div>
                                                </div>
                                                <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 14px", flex: 1, minWidth: 100 }}>
                                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>💊 Medicines</div>
                                                    <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginTop: 3 }}>₹{totalMedicineCost.toLocaleString('en-IN')}</div>
                                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{activities.filter(a => a.type === 'medicine_purchase').length} purchase{activities.filter(a => a.type === 'medicine_purchase').length !== 1 ? 's' : ''}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vertical timeline line */}
                                        <div style={{ position: "absolute", left: 19, top: 200, bottom: 0, width: 2, background: "linear-gradient(to bottom,#5a6e3a,#c8e6c9)", borderRadius: 1 }} />

                                        {/* Timeline entries */}
                                        {allItems.map((item, i) => {
                                            let icon = "📄", title = "Medical Report", sub = item.file_name, color = "#5a6e3a", msg = item.summary, costBadge = null;

                                            if (item.timelineType === 'consultation') {
                                                icon = "📅";
                                                title = "Doctor Visit Booked";
                                                sub = `${item.doctor_name}${item.specialty ? ` · ${item.specialty}` : ''}`;
                                                color = "#8b6fcb";
                                                msg = `${item.appointment_date} at ${item.appointment_time} · ${item.type === 'video' ? '📹 Video' : '🏥 Clinic'}`;
                                                if (item.fee) costBadge = `₹${parseFloat(item.fee).toLocaleString('en-IN')}`;
                                            } else if (item.timelineType === 'activity') {
                                                if (item.type === 'medicine_purchase') {
                                                    icon = "💊";
                                                    title = "Medicine Purchased";
                                                    sub = item.description || item.title;
                                                    color = "#2cb89a";
                                                    msg = "";
                                                    if (item.cost) costBadge = `₹${parseFloat(item.cost).toLocaleString('en-IN')}`;
                                                } else if (item.type === 'ambulance') {
                                                    icon = "🚑";
                                                    title = item.title || "Ambulance Called";
                                                    sub = item.description;
                                                    color = "#e05252";
                                                    msg = "";
                                                } else {
                                                    icon = "💊";
                                                    title = item.title || "Health Activity";
                                                    sub = item.description;
                                                    color = "#2cb89a";
                                                    msg = "";
                                                }
                                            }

                                            const dateStr = item.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                            const timeStr = item.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

                                            return (
                                                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20, position: "relative", zIndex: 1 }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "white", border: `2.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{icon}</div>
                                                    <div style={{ flex: 1, background: "white", borderRadius: 16, padding: "12px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${color}22` }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e2a12", flex: 1 }}>{title}</div>
                                                            {costBadge ? (
                                                                <span style={{ background: color + "22", color: color, fontSize: 11, fontWeight: 900, borderRadius: 8, padding: "3px 10px", flexShrink: 0, marginLeft: 8, whiteSpace: "nowrap" }}>{costBadge}</span>
                                                            ) : (
                                                                <span style={{ background: color + "22", color: color, fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 8px", flexShrink: 0, marginLeft: 8 }}>{item.overall_status || "Active"}</span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "#8a9a7a", marginBottom: 2 }}>{sub}</div>
                                                        <div style={{ fontSize: 10, color: "#bbb" }}>📅 {dateStr} · {timeStr}</div>
                                                        {msg && <div style={{ fontSize: 11, color: "#5a6e3a", lineHeight: 1.5, marginTop: 8, background: "#f9fcf6", padding: "8px 10px", borderRadius: 10 }}>{msg.substring(0, 150)}{msg.length > 150 ? "…" : ""}</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div style={{ height: 100 }} />
                </div>
            </div>
        </>
    );
}
