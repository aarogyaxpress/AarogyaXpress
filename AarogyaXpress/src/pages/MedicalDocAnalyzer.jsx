import { useState, useRef, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../lib/supabase";
import { auth } from "../firebase";

/* This is the medical document analyzer page */
export const CONDITION_DOCTOR_MAP = {
  // Added this for the feature section of the app
  // Cardiology
  "hypertension": { specialty: "Cardiologist", emoji: "🫀", reason: "Blood pressure management" },
  "high blood pressure": { specialty: "Cardiologist", emoji: "🫀", reason: "Blood pressure management" },
  "heart disease": { specialty: "Cardiologist", emoji: "🫀", reason: "Cardiac evaluation needed" },
  "chest pain": { specialty: "Cardiologist", emoji: "🫀", reason: "Cardiac assessment required" },
  "arrhythmia": { specialty: "Cardiologist", emoji: "🫀", reason: "Heart rhythm evaluation" },
  "high cholesterol": { specialty: "Cardiologist", emoji: "🫀", reason: "Lipid management" },
  "hypercholesterolemia": { specialty: "Cardiologist", emoji: "🫀", reason: "Lipid profile management" },
  // Endocrinology
  "diabetes": { specialty: "Endocrinologist", emoji: "🍬", reason: "Blood sugar management" },
  "pre-diabetes": { specialty: "Endocrinologist", emoji: "🍬", reason: "Early glucose intervention" },
  "hypothyroidism": { specialty: "Endocrinologist", emoji: "🦋", reason: "Thyroid hormone management" },
  "hyperthyroidism": { specialty: "Endocrinologist", emoji: "🦋", reason: "Thyroid regulation needed" },
  "thyroid": { specialty: "Endocrinologist", emoji: "🦋", reason: "Thyroid function assessment" },
  "obesity": { specialty: "Endocrinologist", emoji: "⚖️", reason: "Metabolic evaluation" },
  "insulin resistance": { specialty: "Endocrinologist", emoji: "🍬", reason: "Insulin regulation" },
  // Nephrology
  "kidney disease": { specialty: "Nephrologist", emoji: "🫘", reason: "Kidney function monitoring" },
  "chronic kidney": { specialty: "Nephrologist", emoji: "🫘", reason: "Renal care needed" },
  "creatinine": { specialty: "Nephrologist", emoji: "🫘", reason: "Elevated creatinine monitoring" },
  "renal failure": { specialty: "Nephrologist", emoji: "🫘", reason: "Kidney failure management" },
  "proteinuria": { specialty: "Nephrologist", emoji: "🫘", reason: "Protein in urine evaluation" },
  // Pulmonology
  "asthma": { specialty: "Pulmonologist", emoji: "🫁", reason: "Respiratory management" },
  "copd": { specialty: "Pulmonologist", emoji: "🫁", reason: "Lung function support" },
  "pneumonia": { specialty: "Pulmonologist", emoji: "🫁", reason: "Lung infection treatment" },
  "tuberculosis": { specialty: "Pulmonologist", emoji: "🫁", reason: "TB specialist care" },
  "low oxygen": { specialty: "Pulmonologist", emoji: "🫁", reason: "Oxygen saturation concern" },
  // Neurology
  "stroke": { specialty: "Neurologist", emoji: "🧠", reason: "Neurological emergency care" },
  "epilepsy": { specialty: "Neurologist", emoji: "🧠", reason: "Seizure management" },
  "migraine": { specialty: "Neurologist", emoji: "🧠", reason: "Chronic headache management" },
  "parkinson": { specialty: "Neurologist", emoji: "🧠", reason: "Movement disorder care" },
  "neuropathy": { specialty: "Neurologist", emoji: "🧠", reason: "Nerve damage evaluation" },
  // Orthopaedics
  "fracture": { specialty: "Orthopaedic Surgeon", emoji: "🦴", reason: "Bone injury management" },
  "osteoporosis": { specialty: "Orthopaedic Surgeon", emoji: "🦴", reason: "Bone density treatment" },
  "arthritis": { specialty: "Orthopaedic Surgeon", emoji: "🦴", reason: "Joint disease management" },
  "bone": { specialty: "Orthopaedic Surgeon", emoji: "🦴", reason: "Skeletal evaluation" },
  "joint pain": { specialty: "Orthopaedic Surgeon", emoji: "🦴", reason: "Joint health assessment" },
  // Gastroenterology
  "liver disease": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Liver function management" },
  "hepatitis": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Liver infection care" },
  "fatty liver": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Hepatic steatosis treatment" },
  "gastritis": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Stomach lining care" },
  "ibs": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Bowel syndrome management" },
  "colitis": { specialty: "Gastroenterologist", emoji: "🟤", reason: "Colon inflammation care" },
  // Haematology
  "anaemia": { specialty: "Haematologist", emoji: "🩸", reason: "Blood disorder management" },
  "anemia": { specialty: "Haematologist", emoji: "🩸", reason: "Iron/blood level treatment" },
  "low haemoglobin": { specialty: "Haematologist", emoji: "🩸", reason: "Haemoglobin restoration" },
  "thalassemia": { specialty: "Haematologist", emoji: "🩸", reason: "Genetic blood disorder care" },
  "thrombocytopenia": { specialty: "Haematologist", emoji: "🩸", reason: "Low platelet management" },
  // Dermatology
  "skin": { specialty: "Dermatologist", emoji: "🧴", reason: "Skin condition treatment" },
  "psoriasis": { specialty: "Dermatologist", emoji: "🧴", reason: "Chronic skin care" },
  "eczema": { specialty: "Dermatologist", emoji: "🧴", reason: "Skin inflammation management" },
  "dermatitis": { specialty: "Dermatologist", emoji: "🧴", reason: "Skin allergy treatment" },
  // General
  "infection": { specialty: "General Physician", emoji: "👨⚕️", reason: "General infection management" },
  "fever": { specialty: "General Physician", emoji: "👨⚕️", reason: "Systemic assessment" },
  "vitamin deficiency": { specialty: "General Physician", emoji: "👨⚕️", reason: "Nutritional supplementation" },
  "vitamin d": { specialty: "General Physician", emoji: "👨⚕️", reason: "Vitamin D supplementation" },
};

export function mapConditionsToDoctors(conditions = []) {
  const matched = {};
  conditions.forEach(cond => {
    const lower = cond.toLowerCase();
    for (const [keyword, doc] of Object.entries(CONDITION_DOCTOR_MAP)) {
      if (lower.includes(keyword)) {
        if (!matched[doc.specialty]) {
          matched[doc.specialty] = { ...doc, conditions: [] };
        }
        matched[doc.specialty].conditions.push(cond);
        break;
      }
    }
  });
  const unmatched = conditions.filter(c => {
    const l = c.toLowerCase();
    return !Object.keys(CONDITION_DOCTOR_MAP).some(k => l.includes(k));
  });
  if (unmatched.length > 0) {
    if (!matched["General Physician"]) {
      matched["General Physician"] = { specialty: "General Physician", emoji: "👨⚕️", reason: "General evaluation", conditions: [] };
    }
    matched["General Physician"].conditions.push(...unmatched);
  }
  return Object.values(matched);
}

function sColor(s) {
  if (!s) return "#5a6e3a";
  const l = s.toLowerCase();
  if (l === "critical" || l === "high" || l === "severe") return "#c0501a";
  if (l === "borderline" || l === "moderate" || l === "low") return "#f59e0b";
  return "#5a6e3a";
}

function SeverityBadge({ status }) {
  const c = sColor(status);
  return (
    <span style={{
      background: c + "22", color: c, fontSize: 10, fontWeight: 800,
      borderRadius: 8, padding: "3px 10px", whiteSpace: "nowrap",
    }}>{status || "Normal"}</span>
  );
}

function StatusPill({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, fontSize: 9, fontWeight: 800,
      borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function SectionHeader({ emoji, title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#1e2a12" }}>{title}</span>
      {count != null && (
        <span style={{
          background: "#e8f5e0", color: "#3e4e26", fontSize: 10, fontWeight: 800,
          borderRadius: 20, padding: "2px 8px", marginLeft: "auto",
        }}>{count} found</span>
      )}
    </div>
  );
}

function VitalCard({ label, value, unit, status }) {
  const c = sColor(status);
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "12px 14px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1.5px solid ${c}33`,
      flex: "1 1 120px", minWidth: 110,
    }}>
      <div style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#1e2a12", marginTop: 4, fontFamily: "'Nunito',system-ui" }}>
        {value}
        <span style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 600, marginLeft: 3 }}>{unit}</span>
      </div>
      <div style={{ marginTop: 6 }}><SeverityBadge status={status} /></div>
    </div>
  );
}

function DiseaseTag({ name, severity }) {
  const c = sColor(severity);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "white", borderRadius: 12, padding: "10px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${c}`,
      marginBottom: 8
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a12" }}>⚕ {name}</span>
      <SeverityBadge status={severity || "Detected"} />
    </div>
  );
}

function MedicineTag({ name, dosage, frequency, onAdd }) {
  const [added, setAdded] = useState(false);
  const handleAdd = async () => {
    setAdded(true);
    await onAdd({ name, dosage, frequency });
  };
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "12px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      borderLeft: "4px solid #5a6e3a", marginBottom: 10,
      display: "flex", justifyContent: "space-between", alignItems: "center"
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1e2a12" }}>💊 {name}</div>
        {(dosage || frequency) && (
          <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
            {dosage && <span style={{ background: "#eef5e8", color: "#3e4e26", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "3px 8px" }}>{dosage}</span>}
            {frequency && <span style={{ background: "#f0ede5", color: "#5a6e3a", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "3px 8px" }}>{frequency}</span>}
          </div>
        )}
      </div>
      {onAdd && (
        <button
          onClick={handleAdd}
          disabled={added}
          style={{
            background: added ? "#f0ede5" : "linear-gradient(135deg,#5a6e3a,#3e4e26)",
            color: added ? "#8a9a7a" : "white",
            border: "none", borderRadius: 12, padding: "8px 14px",
            fontSize: 11, fontWeight: 800, cursor: added ? "default" : "pointer",
            boxShadow: added ? "none" : "0 4px 12px rgba(90,110,58,0.3)"
          }}>
          {added ? "✓ Added" : "➕ Add to My Medicines"}
        </button>
      )}
    </div>
  );
}

function DoctorRecoCard({ spec }) {
  return (
    <div style={{
      background: "white", borderRadius: 18, overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: "linear-gradient(135deg,#e8f5e0,#c8e6c9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
        }}>{spec.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e2a12" }}>{spec.specialty}</div>
          <div style={{ fontSize: 11, color: "#5a6e3a", fontWeight: 600, marginTop: 1 }}>{spec.reason}</div>
        </div>
        <StatusPill label="Recommended" color="#5a6e3a" />
      </div>
      <div style={{ borderTop: "1px solid #f0ede5", padding: "10px 16px", background: "#fafaf8" }}>
        <div style={{ fontSize: 10, color: "#8a9a7a", fontWeight: 700, marginBottom: 6 }}>Based on detected conditions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {spec.conditions.map((c, i) => (
            <span key={i} style={{
              background: "#e8f5e0", color: "#3e4e26", fontSize: 10,
              fontWeight: 700, borderRadius: 8, padding: "3px 10px",
            }}>→ {c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FindingItem({ text }) {
  return (
    <div style={{
      background: "#f0f7e8", borderLeft: "3px solid #5a6e3a",
      borderRadius: "0 10px 10px 0", padding: "8px 12px", marginBottom: 8,
    }}>
      <div style={{ fontSize: 12, color: "#3e4e26", lineHeight: 1.5 }}>✓ {text}</div>
    </div>
  );
}

function ScanningView({ progress, fileName }) {
  const steps = [
    { label: "Reading document", done: progress >= 20 },
    { label: "Extracting text & images", done: progress >= 45 },
    { label: "Aarogyam AI analysing findings", done: progress >= 70 },
    { label: "Mapping doctor recommendations", done: progress >= 90 },
    { label: "Finalising report", done: progress >= 100 },
  ];
  return (
    <div style={{ padding: "24px 16px", animation: "fadeIn 0.3s ease" }}>
      <div style={{
        background: "linear-gradient(135deg,#5a6e3a,#3e4e26)",
        borderRadius: 20, padding: "20px 18px", marginBottom: 16, position: "relative", overflow: "hidden",
        boxShadow: "0 10px 30px rgba(90,110,58,0.3)"
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>AI Scanning</div>
        <div style={{ color: "white", fontSize: 16, fontWeight: 900, marginTop: 4, marginBottom: 4 }}>{fileName}</div>
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Aarogyam AI is analysing your document…</div>
        <div style={{ marginTop: 14, background: "rgba(255,255,255,0.12)", borderRadius: 8, height: 6 }}>
          <div style={{
            height: "100%", borderRadius: 8, background: "#c8e6c9",
            width: `${progress}%`, transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ marginTop: 6, textAlign: "right", color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700 }}>{progress}%</div>
      </div>

      <div style={{ background: "white", borderRadius: 18, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: i < steps.length - 1 ? "1px solid #f0ede5" : "none" }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: s.done ? "#5a6e3a" : "rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, transition: "background 0.4s", color: "white"
            }}>{s.done ? "✓" : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e0ddd5", display: "block" }} />}</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.done ? "#3e4e26" : "#8a9a7a", transition: "color 0.4s" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsView({ result, fileName, onReset, onAddMedicine }) {
  const [tab, setTab] = useState("summary");
  const doctors = mapConditionsToDoctors(result.diseases?.map(d => d.name) || []);
  const TABS = [
    { id: "summary", label: "Summary" },
    { id: "labs", label: "Lab Values" },
    { id: "medicines", label: "Medicines" },
    { id: "doctors", label: "Doctors" },
  ];

  const overallColor = sColor(result.overallStatus);

  return (
    <div style={{ animation: "slideIn 0.25s ease both" }}>
      {/* Result header card */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ background: "linear-gradient(135deg,#5a6e3a,#3e4e26)", borderRadius: 20, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{result.documentType || "Medical Report"}</div>
              <div style={{ color: "white", fontSize: 15, fontWeight: 900, marginTop: 3, lineHeight: 1.3 }}>{fileName}</div>
              {result.patientName && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 3 }}>Patient: {result.patientName}</div>}
              {result.reportDate && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>Date: {result.reportDate}</div>}
            </div>
            <div style={{
              background: overallColor + "33", border: `1.5px solid ${overallColor}66`,
              borderRadius: 12, padding: "8px 12px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ color: overallColor, fontSize: 13, fontWeight: 900 }}>{result.overallStatus || "Analysed"}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: 700, marginTop: 2 }}>OVERALL</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[
              { label: `${result.diseases?.length || 0} conditions`, color: "#fcba03" },
              { label: `${result.vitals?.length || 0} lab values`, color: "#a4d65c" },
              { label: `${result.medicines?.length || 0} medicines`, color: "#f5d27a" },
              { label: `${doctors.length} doctors`, color: "#c8e6c9" },
            ].map((b, i) => (
              <span key={i} style={{ background: b.color + "22", color: b.color, fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "3px 10px" }}>{b.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "14px 16px 0", borderBottom: "1.5px solid #e8e4dc" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "8px 0 12px", fontSize: 11, fontWeight: tab === t.id ? 800 : 600,
            color: tab === t.id ? "#3e4e26" : "#8a9a7a",
            borderBottom: tab === t.id ? "2.5px solid #3e4e26" : "2.5px solid transparent",
            transition: "all 0.2s", marginBottom: -1.5,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Summary tab ── */}
      {tab === "summary" && (
        <div style={{ padding: "14px 16px 0", animation: "slideIn 0.25s ease both" }}>
          {result.summary && (
            <div style={{ background: "white", borderRadius: 18, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1e2a12", marginBottom: 8 }}>📋 AI Summary</div>
              <div style={{ fontSize: 12, color: "#5a6e3a", lineHeight: 1.7 }}>{result.summary}</div>
            </div>
          )}

          {result.diseases?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SectionHeader emoji="⚕" title="Detected Conditions" count={result.diseases.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.diseases.map((d, i) => <DiseaseTag key={i} name={d.name} severity={d.severity} />)}
              </div>
            </div>
          )}

          {result.keyFindings?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SectionHeader emoji="🔍" title="Key Findings" count={result.keyFindings.length} />
              {result.keyFindings.map((f, i) => <FindingItem key={i} text={f} />)}
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <SectionHeader emoji="💡" title="Recommendations" />
              {result.recommendations.map((r, i) => (
                <div key={i} style={{
                  background: "#f0f7e8", border: "1px solid #c8e6c9",
                  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
                  fontSize: 12, color: "#3e4e26", lineHeight: 1.5,
                }}>✅ {r}</div>
              ))}
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* ── Lab values tab ── */}
      {tab === "labs" && (
        <div style={{ padding: "14px 16px 0", animation: "slideIn 0.25s ease both" }}>
          {result.vitals?.length > 0 ? (
            <>
              <SectionHeader emoji="🧪" title="Lab Values" count={result.vitals.length} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                {result.vitals.map((v, i) => (
                  <VitalCard key={i} label={v.label} value={v.value} unit={v.unit} status={v.status} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9a7a", fontSize: 13 }}>
              No lab values were extracted from this document.
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* ── Medicines tab ── */}
      {tab === "medicines" && (
        <div style={{ padding: "14px 16px 0", animation: "slideIn 0.25s ease both" }}>
          {result.medicines?.length > 0 ? (
            <>
              <SectionHeader emoji="💊" title="Prescribed Medicines" count={result.medicines.length} />
              {result.medicines.map((m, i) => (
                <MedicineTag key={i} name={m.name} dosage={m.dosage} frequency={m.frequency} onAdd={onAddMedicine} />
              ))}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9a7a", fontSize: 13 }}>
              No medicines were found in this document.
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* ── Doctors tab ── */}
      {tab === "doctors" && (
        <div style={{ padding: "14px 16px 0", animation: "slideIn 0.25s ease both" }}>
          {doctors.length > 0 ? (
            <>
              <SectionHeader emoji="👨⚕️" title="Recommended Specialists" count={doctors.length} />
              {doctors.map((d, i) => <DoctorRecoCard key={i} spec={d} />)}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9a7a", fontSize: 13 }}>
              No specific specialists could be mapped from the detected conditions.
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
      )}

      {/* Scan another */}
      <div style={{ padding: "0 16px 16px" }}>
        <button onClick={onReset} style={{
          width: "100%", background: "#f0ede5", color: "#5a6e3a",
          border: "none", borderRadius: 14, padding: "13px",
          fontSize: 13, fontWeight: 800, cursor: "pointer",
        }}>📎 Scan Another Document</button>
      </div>
    </div>
  );
}

// Pull Gemini key from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function scanWithGemini(base64Data, mediaType) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `You are a medical document analysis expert. Carefully analyse this medical document and extract all clinical information.

Return ONLY a valid JSON object (no markdown, no backticks, no explanation) with this exact structure:
{
  "documentType": "",
  "patientName": "",
  "reportDate": "",
  "summary": "",
  "overallStatus": "Normal | Borderline | Attention Required | Critical",
  "vitals": [
    { "label": "", "value": "", "unit": "", "status": "" }
  ],
  "diseases": [
    { "name": "", "severity": "" }
  ],
  "medicines": [
    {
      "name": "",
      "dosage": "",
      "frequency": ""
    }
  ],
  "keyFindings": [],
  "recommendations": []
}

Extract every measurable lab value (haemoglobin, cholesterol, glucose, creatinine, etc.).
List every condition, diagnosis or abnormality mentioned.
List every medicine or drug prescribed.
If a field has no data, use null or empty array [].
STRICT RULES:
* Return ONLY JSON, nothing else.`;

  const requestParts = [
    prompt,
    { inlineData: { data: base64Data, mimeType: mediaType } }
  ];

  try {
    const result = await model.generateContent(requestParts);
    const text = result.response.text();

    console.log("RAW GEMINI OUTPUT:", text); // Debugging hook

    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error("Gemini API Error Detail:", error);
    throw new Error(`Gemini Sync Failed: ${error.message}`);
  }
}

// ─── Smart frequency → time mapper ──────────────────────────────────────────
function frequencyToTime(freq) {
  if (!freq) return "14:00";
  const f = freq.toLowerCase();
  if (f.includes("once") || f.includes("1x") || f.includes("od") || f.includes("qd")) return "14:00";
  if (f.includes("twice") || f.includes("2x") || f.includes("bd") || f.includes("bid")) return "09:00";
  if (f.includes("three") || f.includes("3x") || f.includes("tid")) return "08:00";
  if (f.includes("morning") || f.includes("breakfast")) return "08:00";
  if (f.includes("night") || f.includes("bedtime")) return "21:00";
  if (f.includes("afternoon") || f.includes("lunch")) return "13:30";
  return "14:00";
}

export default function MedicalDocAnalyzer() {
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef();

  const handleAddMedicine = async (med) => {
    try {
      // --- 1. Cross-page Sync to Reminders localStorage ---
      const saved = localStorage.getItem('aarogya_reminders');
      let currentReminders = saved ? JSON.parse(saved) : [];
      const time24 = frequencyToTime(med.frequency);

      const newReminder = {
        id: `analyzer-${Date.now()}`,
        medName: med.name,
        dose: med.dosage || "",
        icon: "💊",
        color: "#5a6e3a",
        time: time24,
        days: [0, 1, 2, 3, 4, 5, 6],
        note: med.frequency || "Added from Analyzer",
        active: true,
        targetTag: "Personal"
      };
      currentReminders.push(newReminder);
      localStorage.setItem('aarogya_reminders', JSON.stringify(currentReminders));

      // --- 2. Supabase: insert medicine, then reminder linked to it ---
      const user = auth.currentUser;
      if (!user) {
        alert("💊 Medicine added locally! Log in to sync to cloud.");
        return;
      }

      const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).single();
      if (!dbUser) return;

      // Insert medicine row
      const { data: medRow, error: medErr } = await supabase.from('medicines').insert({
        user_id: dbUser.id,
        name: med.name,
        dosage: med.dosage || null,
        instructions: med.frequency || null,
      }).select('id').single();

      if (medErr) { console.warn('Medicine insert failed:', medErr); return; }

      // Insert reminder linked to medicine
      const timeWithSeconds = time24.length === 5 ? time24 + ":00" : time24;
      const { error: remErr } = await supabase.from('reminders').insert({
        user_id: dbUser.id,
        medicine_id: medRow.id,
        time: timeWithSeconds,
        frequency: "daily",
        status: "active",
        target_tag: "Personal"
      });

      if (remErr) { console.warn('Reminder insert warning:', remErr); }
    } catch (e) {
      console.error("Failed to add medicine:", e);
    }
  };

  const processFile = useCallback(async (file) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMsg("Please upload a PDF, JPG, PNG or WebP file.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setState("scanning");
    setProgress(10);

    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = () => rej(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      setProgress(30);

      const ticker = setInterval(() => {
        setProgress(p => p < 85 ? p + 5 : p);
      }, 600);

      // Gemini API Used Here
      const parsedData = await scanWithGemini(base64, file.type);

      clearInterval(ticker);
      setProgress(100);

      // Updated by Kartikey : Synced App with Supabase
      (async () => {
        try {
          if (!auth.currentUser) return;
          const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', auth.currentUser.uid).single();
          if (!dbUser) return;

          const { data: reportInsert, error: repError } = await supabase.from('reports').insert({
            user_id: dbUser.id,
            file_name: file.name,
            patient_name: parsedData.patientName,
            report_date: parsedData.reportDate,
            summary: parsedData.summary,
            overall_status: parsedData.overallStatus,
            raw_json: parsedData
          }).select('id').single();

          if (repError || !reportInsert) return;
          const reportId = reportInsert.id;

          if (parsedData.vitals?.length > 0) supabase.from('vitals').insert(parsedData.vitals.map(v => ({ report_id: reportId, label: v.label, value: v.value, unit: v.unit, status: v.status }))).then();
          if (parsedData.diseases?.length > 0) supabase.from('diseases').insert(parsedData.diseases.map(d => ({ report_id: reportId, name: d.name, severity: d.severity }))).then();
          if (parsedData.medicines?.length > 0) supabase.from('report_medicines').insert(parsedData.medicines.map(m => ({ report_id: reportId, name: m.name, dosage: m.dosage, frequency: m.frequency }))).then();
          if (parsedData.keyFindings?.length > 0) supabase.from('findings').insert(parsedData.keyFindings.map(f => ({ report_id: reportId, text: f }))).then();
          if (parsedData.recommendations?.length > 0) supabase.from('recommendations').insert(parsedData.recommendations.map(r => ({ report_id: reportId, text: r }))).then();

        } catch (e) {
          console.error("Supabase sync background task error:", e);
        }
      })();

      setTimeout(() => {
        setResult(parsedData);
        setState("results");
      }, 400);

    } catch (err) {
      setErrorMsg(err.message || "Failed to analyse the document. Please try again.");
      setState("error");
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = "";
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const reset = () => {
    setState("idle");
    setResult(null);
    setProgress(0);
    setFileName("");
    setErrorMsg("");
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes slideIn   { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        .hs::-webkit-scrollbar{display:none}.hs{scrollbar-width:none}
      `}</style>
      <div style={{ padding: "0px", fontFamily: "'Nunito',system-ui,sans-serif", background: "#f5f2eb", minHeight: "100vh" }}>

        <div style={{ padding: "20px 20px 12px" }}>
          <h1 style={{ color: "#1a2420", fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>🩺 Doc Analyser</h1>
          <div style={{ color: "#8a9a7a", fontSize: 13, marginTop: 4, fontWeight: 700 }}>Upload & Extract Insights</div>
        </div>

        <div className="hs" style={{ flex: 1, paddingBottom: 110 }}>
          {state === "idle" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ padding: "16px 16px 0" }}>
                <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} style={{ border: "2px dashed #b5c9a0", borderRadius: 22, padding: "28px 20px", textAlign: "center", background: "white", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={handleFileChange} />
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1e2a12", marginBottom: 4 }}>Drop medical document here</div>
                  <div style={{ fontSize: 12, color: "#8a9a7a", marginBottom: 16, lineHeight: 1.6 }}>Blood reports, prescriptions, lab results,<br />X-ray reports, discharge summaries</div>
                  <button style={{ background: "linear-gradient(135deg,#5a6e3a,#3e4e26)", color: "white", border: "none", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(90,110,58,0.35)" }}>📎 Choose File</button>
                </div>
              </div>

              <div style={{ padding: "14px 16px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1e2a12", marginBottom: 10 }}>📋 Supported Document Types</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { emoji: "🩸", type: "Blood Test Report", desc: "CBC, lipids, glucose, electrolytes" },
                    { emoji: "💊", type: "Prescription", desc: "Medicines, dosage, frequency" },
                    { emoji: "📷", type: "Radiology / X-Ray", desc: "Findings, impressions" },
                    { emoji: "🏥", type: "Discharge Summary", desc: "Diagnosis, procedures, follow-up" },
                    { emoji: "🔬", type: "Pathology Report", desc: "Biopsy, culture, sensitivity" },
                  ].map((d, i) => (
                    <div key={i} style={{ background: "white", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <span style={{ fontSize: 22 }}>{d.emoji}</span>
                      <div><div style={{ fontSize: 12, fontWeight: 800, color: "#1e2a12" }}>{d.type}</div><div style={{ fontSize: 10, color: "#8a9a7a", marginTop: 1 }}>{d.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "14px 16px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1e2a12", marginBottom: 10 }}>⚡ How it works</div>
                <div style={{ background: "linear-gradient(135deg,#5a6e3a,#3e4e26)", borderRadius: 18, padding: "16px 18px", boxShadow: "0 8px 24px rgba(90,110,58,0.25)" }}>
                  {[
                    { n: "1", label: "Upload", desc: "Choose any medical document" },
                    { n: "2", label: "AI Scan", desc: "Aarogyam AI reads and extracts findings" },
                    { n: "3", label: "Get Results", desc: "View conditions, labs, medicines" },
                    { n: "4", label: "See Doctors", desc: "Get matched specialist recommendations" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 3 ? 12 : 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#8aab5c", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{s.n}</div>
                      <div><div style={{ color: "white", fontSize: 12, fontWeight: 800 }}>{s.label}</div><div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>{s.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: 16 }} />
            </div>
          )}

          {state === "scanning" && <ScanningView progress={progress} fileName={fileName} />}

          {state === "error" && (
            <div style={{ padding: "32px 16px", textAlign: "center", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#e05252", marginBottom: 8 }}>Analysis Failed</div>
              <div style={{ fontSize: 12, color: "#8a9a7a", lineHeight: 1.6, marginBottom: 24 }}>{errorMsg}</div>
              <button onClick={reset} style={{ background: "linear-gradient(135deg,#5a6e3a,#3e4e26)", color: "white", border: "none", borderRadius: 14, padding: "12px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Try Again</button>
            </div>
          )}

          {state === "results" && result && (
            <ResultsView result={result} fileName={fileName} onReset={reset} onAddMedicine={handleAddMedicine} />
          )}

        </div>
      </div>
    </>
  );
}
