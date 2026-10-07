//Date : 
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth } from "../firebase"
import { supabase } from "../lib/supabase"

export default function ProfileSetup() {
  const navigate = useNavigate()
  const user = auth.currentUser

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    location: "",
    age: "",
    gender: "",
    bloodGroup: "",
    allergies: "",
    chronicDiseases: "",
    emergencyName: "",
    emergencyPhone: "",
    height: "",
    weight: "",
  })

  const set = k => v => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (step === 1) {
      if (!form.name.trim()) e.name = "Required"
      if (!form.phone.trim()) e.phone = "Required"
      else if (form.phone.length !== 10) e.phone = "Invalid"
    }
    if (step === 2) {
      if (!form.age) e.age = "Required"
      if (!form.gender) e.gender = "Required"
      if (!form.bloodGroup) e.bloodGroup = "Required"
    }
    if (step === 3) {
      if (!form.emergencyName.trim()) e.emergencyName = "Required"
      if (!form.emergencyPhone.trim()) e.emergencyPhone = "Required"
      else if (form.emergencyPhone.length !== 10) e.emergencyPhone = "Invalid"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => { if (validate()) setStep(s => s + 1) }
  const handleBack = () => { setStep(s => s - 1); setErrors({}) }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        firebase_uid: user.uid,
        name: form.name,
        email: form.email,
        phone: `+91${form.phone}`,
        location: form.location,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender,
        blood_group: form.bloodGroup,
        allergies: form.allergies,
        chronic_diseases: form.chronicDiseases,
        emergency_contact_name: form.emergencyName,
        emergency_contact_phone: `+91${form.emergencyPhone}`,
        height: form.height ? parseFloat(form.height) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        profile_completed: true,
      }
      const { error } = await supabase.from("users").upsert(payload, { onConflict: "firebase_uid" })
      if (error) throw error
      navigate("/")
    } catch (err) {
      setErrors({ submit: err.message || "Failed. Try again." })
    } finally {
      setLoading(false)
    }
  }

  const BLOODS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const TOTAL = 3

  return (
    <div className="login-wrapper">
      <style>{`
        .login-wrapper { font-family:'Nunito Sans',sans-serif;background:var(--cream,#f7f4ef);display:flex;justify-content:center;min-height:100vh;width:100%; }
        .login-wrapper * { box-sizing: border-box; margin: 0; padding: 0; }
        .phone { width:100%;max-width:480px;min-height:100vh;background:var(--cream,#f7f4ef);display:flex;flex-direction:column;position:relative; overflow:hidden;}
        
        /* HEADER */
        .step-hdr { display:flex;justify-content:space-between;align-items:flex-end;padding:32px 22px 16px; background:linear-gradient(180deg,var(--olive-dark,#1e3612) 0%,var(--olive-med,#3e5e26) 100%); color:#fff; border-bottom-left-radius:24px; border-bottom-right-radius:24px; box-shadow:0 8px 24px rgba(30,54,18,0.15); z-index:10; }
        .hdr-title { font-family:'Nunito',sans-serif;font-size:24px;font-weight:900; line-height:1.2; margin-bottom:4px; margin-top:12px;}
        .hdr-sub { font-size:12px;color:rgba(255,255,255,0.7); font-family:'Nunito Sans',sans-serif;}
        .step-badge { background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); padding:4px 10px; border-radius:12px; font-size:11px; font-weight:800; color:#fff; font-family:'Nunito',sans-serif;}
        
        .prog-bar { position:absolute; bottom:0; left:0; height:3px; background:#a8c47a; transition:width 0.3s ease; border-bottom-left-radius:24px;}
        
        .scroll { flex:1; overflow-y:auto; padding-bottom:120px; scrollbar-width:none; padding-top:20px; }
        .scroll::-webkit-scrollbar { display:none; }

        /* FIELDS */
        .email-section { padding:0 22px; }
        .field-label { font-size:13px;font-weight:700;color:var(--olive-dark,#1e3612);font-family:'Nunito',sans-serif;display:flex;justify-content:space-between;margin-bottom:6px; margin-top:16px; align-items:flex-end;}
        .field-err { color:#d32f2f; font-size:10px; font-weight:800; font-family:'Nunito',sans-serif; text-transform:uppercase;}
        .field-wrap { display:flex;align-items:center;border:1.5px solid #e0ddd5;border-radius:16px;padding:14px 16px;background:#fff; transition:all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .field-wrap:focus-within { border-color:var(--olive-med,#3e5e26); box-shadow:0 0 0 3px rgba(90,110,58,0.1); transform:translateY(-1px); }
        .field-wrap.error { border-color:#d32f2f; background:#fffafa;}
        .field-wrap input, .field-wrap textarea, .field-wrap select { flex:1;outline:none;border:none;background:transparent;font-size:15px;font-weight:600; font-family:'Nunito Sans',sans-serif;color:var(--text-primary,#1b1c18); width:100%;}
        .field-wrap input::placeholder, .field-wrap textarea::placeholder { color:#c0bdb5; font-weight:500;}
        .field-wrap input:disabled { color:#8a9a7a; }
        .prefix { display:flex;align-items:center;gap:6px;padding-right:12px;border-right:1px solid #e0ddd5;margin-right:12px; flex-shrink:0; }
        .prefix-txt { font-size:14px;font-weight:800;color:var(--text-primary,#1b1c18);font-family:'Nunito',sans-serif; }
        
        /* TWO COLUMNS */
        .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px;}
        .grid-2 .field-label { margin-top:0;}

        /* PILLS */
        .pill-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top:8px;}
        .pill { padding:14px; border-radius:16px; border:1.5px solid #e0ddd5; background:#fff; font-size:14px; font-weight:800; color:var(--text-primary,#1b1c18); text-align:center; cursor:pointer; font-family:'Nunito',sans-serif; transition:all 0.2s;}
        .pill.active { border-color:var(--olive-dark,#1e3612); background:var(--olive-dark,#1e3612); color:#fff; box-shadow:0 4px 14px rgba(30,54,18,0.25); transform:translateY(-2px);}
        
        .blood-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top:8px;}
        .blood-pill { padding:16px 0; border-radius:16px; border:1.5px solid #e0ddd5; background:#fff; font-size:16px; font-weight:900; color:var(--text-primary,#1b1c18); text-align:center; cursor:pointer; font-family:'Nunito',sans-serif; transition:all 0.2s;}
        .blood-pill.active { background:var(--olive-dark,#1e3612); border-color:var(--olive-dark,#1e3612); color:#fff; box-shadow:0 4px 14px rgba(30,54,18,0.25); transform:scale(1.05);}

        /* BOTTOM NAV */
        .bottom-nav { position:absolute; bottom:0; left:0; width:100%; padding:20px 22px 28px; background:linear-gradient(0deg, var(--cream,#f7f4ef) 70%, transparent 100%); display:flex; gap:12px;}
        .back-btn { width:56px; height:56px; background:#fff; border:1.5px solid #e0ddd5; border-radius:18px; display:flex;align-items:center;justify-content:center; cursor:pointer; flex-shrink:0; transition:all 0.2s;}
        .back-btn:active { transform:scale(0.95); background:#f0ede5;}
        .cta-btn { flex:1; height:56px; background:linear-gradient(135deg,var(--olive-med,#3e5e26),var(--olive-dark,#1e3612));color:#fff;border:none;border-radius:18px;font-size:16px;font-weight:800;font-family:'Nunito',sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(62,78,38,0.32);letter-spacing:0.2px; display:flex;justify-content:center;align-items:center;gap:8px; transition:all 0.2s;}
        .cta-btn:active { transform:scale(0.98); }
        .cta-btn:disabled { opacity:0.7; transform:none; box-shadow:none;}
        
        .summary-card { background:linear-gradient(135deg,#fff,#f9fbf7); border:1.5px solid #eef3e4; border-radius:24px; padding:20px; display:flex; align-items:center; gap:16px; margin-top:20px; box-shadow:0 4px 20px rgba(0,0,0,0.03);}
        .avatar-box { width:64px;height:64px; border-radius:20px; background:linear-gradient(135deg,var(--olive-med,#3e5e26),var(--olive-dark,#1e3612)); display:flex;align-items:center;justify-content:center; font-size:24px; color:#fff; font-family:'Nunito',sans-serif; font-weight:900; overflow:hidden; border:2px solid #eef3e4; flex-shrink:0;}
        .user-n { font-family:'Nunito',sans-serif; font-size:18px; font-weight:900; color:#1e3612;}
        .user-e { font-family:'Nunito Sans',sans-serif; font-size:13px; color:#8a9a7a; font-weight:600; margin-top:2px;}
        .tags-row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;}
        .u-tag { background:#eef3e4; color:#3e5e26; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:800; font-family:'Nunito',sans-serif;}

        /* ANIMATION */
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="phone">
        {/* HEADER */}
        <div className="step-hdr relative">
          <div>
            <div className="step-badge">Step {step} of {TOTAL}</div>
            <div className="hdr-title">
              {step === 1 && "Personal Details"}
              {step === 2 && "Health Stats"}
              {step === 3 && "Emergency Info"}
            </div>
            <div className="hdr-sub">
              {step === 1 && "Start your personalized wellness journey."}
              {step === 2 && "Help us tailor your health insights."}
              {step === 3 && "For better health tracking & backup."}
            </div>
          </div>
          <div className="prog-bar" style={{ width: `${(step / TOTAL) * 100}%` }}></div>
        </div>

        {/* SCROLL AREA */}
        <div className="scroll fade-in" key={step}>
          {step === 1 && (
            <div className="email-section">
              <div className="field-label"><span>Full Name</span> {errors.name && <span className="field-err">{errors.name}</span>}</div>
              <div className={`field-wrap ${errors.name ? 'error' : ''}`}>
                <input type="text" placeholder="Enter your full name" value={form.name} onChange={e => set("name")(e.target.value)} autoFocus />
              </div>

              <div className="field-label"><span>Email Address</span></div>
              <div className="field-wrap" style={{ background: '#f5f5f5' }}>
                <input type="email" value={form.email} disabled />
              </div>

              <div className="grid-2" style={{ marginTop: '16px' }}>
                <div>
                  <div className="field-label"><span>Phone Number</span> {errors.phone && <span className="field-err" style={{ marginLeft: 'auto' }}>{errors.phone}</span>}</div>
                  <div className={`field-wrap ${errors.phone ? 'error' : ''}`} style={{ paddingLeft: '12px' }}>
                    <div className="prefix"><span className="prefix-txt">+91</span></div>
                    <input type="tel" placeholder="98765 43210" value={form.phone} onChange={e => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                  </div>
                </div>
                <div>
                  <div className="field-label"><span>City / Location</span></div>
                  <div className="field-wrap">
                    <input type="text" placeholder="Search city" value={form.location} onChange={e => set("location")(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="summary-card" style={{ marginTop: '32px', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                <div className="avatar-box" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 20 }}>🔒</div>
                <div>
                  <div className="user-n" style={{ fontSize: 15 }}>Privacy First</div>
                  <div className="user-e" style={{ fontSize: 12, lineHeight: 1.4, color: '#8a9a7a' }}>Your data is fully encrypted. We never share your health info without consent.</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="email-section">
              <div className="grid-2">
                <div>
                  <div className="field-label"><span>Age</span> {errors.age && <span className="field-err">{errors.age}</span>}</div>
                  <div className={`field-wrap ${errors.age ? 'error' : ''}`} style={{ paddingRight: 12 }}>
                    <input type="number" placeholder="28" value={form.age} onChange={e => set("age")(e.target.value.slice(0, 3))} autoFocus />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b0b8a0', fontFamily: "'Nunito',sans-serif" }}>YRS</span>
                  </div>
                </div>
                <div>
                  <div className="field-label"><span>Gender</span> {errors.gender && <span className="field-err">{errors.gender}</span>}</div>
                  <div className={`field-wrap ${errors.gender ? 'error' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
                    <select value={form.gender} onChange={e => set("gender")(e.target.value)} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', outline: 'none', fontWeight: 700, fontFamily: "'Nunito Sans',sans-serif", color: '#1b1c18' }}>
                      <option value="" disabled>Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field-label" style={{ marginTop: 24 }}><span>Blood Group</span> {errors.bloodGroup && <span className="field-err">{errors.bloodGroup}</span>}</div>
              <div className="blood-grid">
                {BLOODS.map(b => (
                  <div key={b} className={`blood-pill ${form.bloodGroup === b ? 'active' : ''}`} onClick={() => set("bloodGroup")(b)}>{b}</div>
                ))}
              </div>

              <div className="field-label" style={{ marginTop: 28 }}><span>Known Allergies <span style={{ color: '#b0b8a0', fontWeight: 600 }}>(Optional)</span></span></div>
              <div className="field-wrap" style={{ padding: 0 }}>
                <textarea rows={2} placeholder="e.g. Peanuts, Penicillin..." value={form.allergies} onChange={e => set("allergies")(e.target.value)} style={{ padding: '14px 16px', resize: 'none' }} />
              </div>

              <div className="field-label"><span>Chronic Diseases <span style={{ color: '#b0b8a0', fontWeight: 600 }}>(Optional)</span></span></div>
              <div className="field-wrap" style={{ padding: 0 }}>
                <textarea rows={2} placeholder="e.g. Hypertension, Diabetes..." value={form.chronicDiseases} onChange={e => set("chronicDiseases")(e.target.value)} style={{ padding: '14px 16px', resize: 'none' }} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="email-section">
              <div className="field-label"><span>Emergency Contact Name</span> {errors.emergencyName && <span className="field-err">{errors.emergencyName}</span>}</div>
              <div className={`field-wrap ${errors.emergencyName ? 'error' : ''}`}>
                <input type="text" placeholder="Mom, Dad, Partner..." value={form.emergencyName} onChange={e => set("emergencyName")(e.target.value)} autoFocus />
              </div>

              <div className="field-label"><span>Their Phone Number</span> {errors.emergencyPhone && <span className="field-err">{errors.emergencyPhone}</span>}</div>
              <div className={`field-wrap ${errors.emergencyPhone ? 'error' : ''}`} style={{ paddingLeft: '12px' }}>
                <div className="prefix"><span className="prefix-txt">+91</span></div>
                <input type="tel" placeholder="98765 43210" value={form.emergencyPhone} onChange={e => set("emergencyPhone")(e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>

              <div className="grid-2" style={{ marginTop: '24px' }}>
                <div>
                  <div className="field-label"><span>Height</span></div>
                  <div className="field-wrap" style={{ paddingRight: 12 }}>
                    <input type="number" placeholder="170" value={form.height} onChange={e => set("height")(e.target.value)} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b0b8a0', fontFamily: "'Nunito',sans-serif" }}>CM</span>
                  </div>
                </div>
                <div>
                  <div className="field-label"><span>Weight</span></div>
                  <div className="field-wrap" style={{ paddingRight: 12 }}>
                    <input type="number" placeholder="65" value={form.weight} onChange={e => set("weight")(e.target.value)} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b0b8a0', fontFamily: "'Nunito',sans-serif" }}>KG</span>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, marginTop: '20px', textAlign: 'center', fontFamily: "'Nunito',sans-serif" }}>
                  {errors.submit}
                </div>
              )}

              {/* SUMMARY CARD */}
              <div className="summary-card">
                <div className="avatar-box">
                  {user?.photoURL ? <img src={user.photoURL} alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (form.name?.[0] || 'U')?.toUpperCase()}
                </div>
                <div>
                  <div className="user-n">{form.name || "Review Profile"}</div>
                  <div className="user-e">Your personalized setup is complete</div>
                  <div className="tags-row">
                    {form.age && <div className="u-tag">{form.age} Yrs</div>}
                    {form.bloodGroup && <div className="u-tag">🩸 {form.bloodGroup}</div>}
                    {form.gender && <div className="u-tag">{form.gender}</div>}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="bottom-nav">
          <button className="back-btn" onClick={step > 1 ? handleBack : () => navigate("/login")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a6e3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button className="cta-btn" onClick={step === TOTAL ? handleSubmit : handleNext} disabled={loading}>
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : null}
            {!loading && step < TOTAL && "Continue"}
            {!loading && step === TOTAL && "Finish Setup"}
            {!loading && step < TOTAL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
            {!loading && step === TOTAL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          </button>
        </div>
      </div>
    </div>
  )
}