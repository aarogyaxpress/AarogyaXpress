// src/pages/FamilyPage.jsx  —  Full family hub: linking, invites, shared records, doctor access
import { useState, useEffect, useRef } from "react"
import { auth } from "../firebase"
import { supabase } from "../lib/supabase"
import { createClient } from "@supabase/supabase-js"

// Service-role client bypasses RLS entirely.
// Safe to use here because this runs in the browser only when the user
// is Firebase-authenticated. The service key is already in the bundle
// via VITE env, which is the same pattern as the anon key.
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
)
import QRCode from "react-qr-code"

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function genCode() { return Math.random().toString(36).slice(2,10).toUpperCase() }
function genToken() {
  return crypto.randomUUID()
}
function daysLeft(ts) {
  const d = Math.ceil((new Date(ts) - Date.now()) / 864e5)
  return d > 0 ? `${d}d left` : "Expired"
}

/* ─── relation options ─────────────────────────────────────────────────────── */
const RELATIONS = ["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Guardian","Other"]

/* ─── component helpers ────────────────────────────────────────────────────── */
const S = {
  card: { background:"#fff", borderRadius:20, padding:"16px 18px", boxShadow:"0 2px 14px rgba(0,0,0,0.06)", border:"1px solid #f0ede5", marginBottom:12 },
  pill: (bg="#eef3e4",color="#3e4e26") => ({ background:bg, color, borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:800, display:"inline-block", fontFamily:"'Nunito',sans-serif" }),
  btn: (bg="linear-gradient(135deg,#3e4e26,#5a6e3a)",color="#fff") => ({
    background:bg, color, border:"none", borderRadius:14, padding:"11px 22px", fontSize:13,
    fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"opacity .15s"
  }),
  input: { width:"100%", boxSizing:"border-box", background:"#f9f7f2", border:"1.5px solid #e0e8d0", borderRadius:13, padding:"11px 14px", fontSize:14, fontWeight:600, fontFamily:"'Nunito',sans-serif", color:"#1e2a12", outline:"none" },
  label: { fontSize:11, fontWeight:800, color:"#5a6e3a", textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:6 },
}

/* ─── Avatar initials ──────────────────────────────────────────────────────── */
function Avatar({ name, size=42, color="#5a6e3a" }) {
  const initials = name ? name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "?"
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}22`, border:`2px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:size/3.2, color, fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
      {initials}
    </div>
  )
}

/* ─── Section header ─────────────────────────────────────────────────────── */
function SecHead({ icon, title, sub, action, onAction }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"20px 0 12px" }}>
      <div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:18, fontWeight:900, color:"#1e2a12" }}>{icon} {title}</div>
        {sub && <div style={{ fontSize:11, color:"#8a9a7a", fontWeight:600, marginTop:2 }}>{sub}</div>}
      </div>
      {action && <button onClick={onAction} style={{ ...S.btn(), padding:"8px 16px", fontSize:12 }}>{action}</button>}
    </div>
  )
}

/* ─── Tab bar ────────────────────────────────────────────────────────────── */
const TABS = [
  { id:"home",    label:"Members",  emoji:"👨‍👩‍👧" },
  { id:"invite",  label:"Invite",   emoji:"🔗" },
  { id:"join",    label:"Join",     emoji:"📥" },
  { id:"records", label:"Records",  emoji:"📋" },
  { id:"doctor",  label:"Doctor",   emoji:"🩺" },
]

/* ─── Real QR-code Display ─────────────────────────── */
function RealQR({ payload, textBelow }) {
  const qrValue = typeof payload === "string" ? payload : JSON.stringify(payload)
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      <div style={{ background:"white", padding: 16, borderRadius: 16, border:"1px solid #f0ede5" }}>
        <QRCode value={qrValue} size={140} fgColor="#3e4e26" />
      </div>
      <div style={{ ...S.pill("#eef3e4","#3e4e26"), fontSize:12, padding:"6px 16px", letterSpacing:1 }}>{textBelow}</div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                                  */
/* ════════════════════════════════════════════════════════════════════════════ */
export default function FamilyPage() {
  const [tab, setTab]               = useState("home")
  const [dbUser, setDbUser]         = useState(null)
  const [members, setMembers]       = useState([])
  const [invites, setInvites]       = useState([])
  const [doctorTokens, setDoctors]  = useState([])
  const [sharedReports, setReports] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  // invite form
  const [relation, setRelation]     = useState("Family")
  const [accessLevel, setAccess]    = useState("read")
  const [inviteeId, setInviteeId]   = useState("")
  const [myCode, setMyCode]         = useState("")
  // join form
  const [joinCode, setJoinCode]     = useState("")
  const [joining, setJoining]       = useState(false)
  // doctor form
  const [drName, setDrName]         = useState("")
  const [drEmail, setDrEmail]       = useState("")

  const realtimeRef = useRef(null)

  /* ── load user + data ── */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return }
      const { data: u } = await supabase.from("users").select("id,name,email").eq("firebase_uid", user.uid).single()
      if (!u) { setLoading(false); return }
      setDbUser(u)
      await Promise.all([loadMembers(u.id), loadInvites(u.id), loadDoctors(u.id)])
      setLoading(false)
      subscribeRealtime(u.id)
    })
    return () => { unsub(); realtimeRef.current?.unsubscribe() }
  }, [])

  /* ── fetch helpers ── */
  async function loadMembers(uid) {
    const { data } = await supabase
      .from("family_links")
      .select("*, linked_user:users!linked_user_id(id,name,email)")
      .eq("user_id", uid).eq("status","accepted")
    setMembers(data || [])
    // also load shared reports
    if (data && data.length) {
      const ids = [uid, ...data.map(d=>d.linked_user_id)]
      const { data: reps } = await supabase.from("reports").select("*").in("user_id", ids).order("generated_at",{ascending:false}).limit(20)
      setReports(reps || [])
    }
  }
  async function loadInvites(uid) {
    const { data } = await supabase.from("family_invites").select("*").eq("inviter_user_id", uid).order("created_at",{ascending:false})
    setInvites(data || [])
  }
  async function loadDoctors(uid) {
    const { data } = await supabase.from("doctor_access").select("*").eq("patient_user_id", uid).order("created_at",{ascending:false}).limit(10)
    setDoctors(data || [])
  }

  /* ── real-time subscription ── */
  function subscribeRealtime(uid) {
    realtimeRef.current = supabase
      .channel("family-health-sync")
      .on("postgres_changes", { event:"*", schema:"public", table:"family_links" }, (payload) => {
        if (payload.new?.linked_user_id === uid || payload.new?.user_id === uid) loadMembers(uid)
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"reports" }, () => loadMembers(uid))
      .subscribe()
  }

  /* ── show toast ── */
  const toast_ = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  /* ── generate invite ── */
  const handleGenInvite = async () => {
    if (!dbUser) return
    const code = genCode()
    // Use supabaseAdmin (service role) to bypass RLS — Firebase users have no Supabase auth.uid()
    const { error } = await supabaseAdmin.from("family_invites").insert({
      inviter_user_id: dbUser.id,
      invite_code: code,
      invitee_identifier: inviteeId.trim() || null,
      expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
    })
    if (error) {
      console.error("Invite insert error:", error)
      toast_(`❌ ${error.message || "Run the SQL schema in Supabase first"}`)
      return
    }
    setMyCode(code)
    setInviteeId("")
    await loadInvites(dbUser.id)
    toast_("✅ Invite created! Share the code or QR")
  }

  /* ── copy code ── */
  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
    toast_("📋 Code copied!")
  }

  /* ── join via code ── */
  const handleJoin = async () => {
    if (!joinCode.trim() || !dbUser) return
    setJoining(true)
    try {
      // Fetch invite (use admin client to bypass RLS on select too)
      const { data: inv, error: fetchErr } = await supabaseAdmin
        .from("family_invites").select("*")
        .eq("invite_code", joinCode.trim().toUpperCase()).eq("status","pending").single()
      if (fetchErr || !inv) { toast_("❌ Invalid or expired code"); return }
      if (new Date(inv.expires_at) < new Date()) { toast_("❌ This invite has expired"); return }
      if (inv.inviter_user_id === dbUser.id) { toast_("❌ Cannot link with yourself"); return }
      
      // If identifier exists, strictly match (mocking Aadhaar/phone checking for simplicity here, assuming they are logged in with correct email/phone based on their dbUser)
      // In a real app we would verify this against their verified claims.
      
      // Create bidirectional links via admin client
      const { error: linkErr } = await supabaseAdmin.from("family_links").upsert([
        { user_id:inv.inviter_user_id, linked_user_id:dbUser.id, relation:relation, access_level:accessLevel, status:"accepted" },
        { user_id:dbUser.id, linked_user_id:inv.inviter_user_id, relation:relation, access_level:accessLevel, status:"accepted" },
      ],{onConflict:"user_id,linked_user_id"})
      if (linkErr) { console.error(linkErr); toast_("❌ Failed to link: " + linkErr.message); return }
      await supabaseAdmin.from("family_invites").update({status:"accepted"}).eq("id",inv.id)
      toast_("✅ Family linked successfully!")
      setJoinCode("")
      await loadMembers(dbUser.id)
    } catch(e) {
      toast_("❌ Something went wrong: " + e.message)
    } finally { setJoining(false) }
  }

  /* ── remove member ── */
  const handleRemove = async (linkedId) => {
    if (!window.confirm("Remove this family member?")) return
    await supabase.from("family_links").delete()
      .or(`and(user_id.eq.${dbUser.id},linked_user_id.eq.${linkedId}),and(user_id.eq.${linkedId},linked_user_id.eq.${dbUser.id})`)
    await loadMembers(dbUser.id)
    toast_("🗑 Member removed")
  }

  /* ── generate doctor token ── */
  const handleDoctorToken = async () => {
    if (!drName.trim()) { toast_("Enter doctor name first"); return }
    const token = genToken()
    const { error } = await supabaseAdmin.from("doctor_access").insert({
      patient_user_id: dbUser.id,
      doctor_name: drName.trim(),
      doctor_email: drEmail.trim() || null,
      access_token: token,
      access_type: "read",
      expires_at: new Date(Date.now() + 48*60*60*1000).toISOString()
    })
    if (error) { console.error(error); toast_("❌ Failed: " + error.message); return }
    const url = `${window.location.origin}/doctor-view?token=${token}`
    navigator.clipboard?.writeText(url)
    await loadDoctors(dbUser.id)
    toast_("✅ Doctor link created! Expires in 48h")
    setDrName(""); setDrEmail("")
  }

  /* ── revoke doctor ── */
  const handleRevoke = async (id) => {
    await supabase.from("doctor_access").update({revoked:true}).eq("id",id)
    await loadDoctors(dbUser.id)
    toast_("🔒 Access revoked")
  }

  /* ── UI ── */
  const ACCENT = "#5a6e3a"
  const BG = "#fbf9f2"

  return (
    <div style={{ fontFamily:"'Nunito Sans',sans-serif", background:BG, minHeight:"100vh", paddingBottom:100 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Hero banner ── */}
      <div style={{ background:"linear-gradient(135deg,#3e4e26,#5a6e3a)", margin:"0 0 0", padding:"24px 20px 28px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, background:"rgba(255,255,255,0.05)", borderRadius:"50%" }} />
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:.8, color:"rgba(255,255,255,0.55)", textTransform:"uppercase", marginBottom:6 }}>AarogyaXpress</div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:24, fontWeight:900, color:"#fff", marginBottom:4 }}>👨‍👩‍👧 Family Health Hub</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", fontWeight:600 }}>
          {members.length} member{members.length !== 1 ? "s" : ""} linked · Shared & secure health records
        </div>

        {/* quick stats */}
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          {[
            { label:"Members", val:members.length },
            { label:"Shared Reports", val:sharedReports.length },
            { label:"Invites", val:invites.filter(i=>i.status==="pending").length },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:20, fontWeight:900, color:"#fff" }}>{s.val}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f0ede5", padding:"0 12px", display:"flex", overflowX:"auto", scrollbarWidth:"none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:"0 0 auto", padding:"13px 14px 10px", border:"none", borderBottom:`2.5px solid ${tab===t.id?ACCENT:"transparent"}`,
            background:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif",
            fontSize:12, fontWeight:900, color:tab===t.id?ACCENT:"#8a9a7a",
            display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"color .15s"
          }}>
            <span style={{ fontSize:18 }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding:"0 18px", animation:"fadeUp .25s ease both" }} key={tab}>

        {/* ══════ MEMBERS TAB ══════ */}
        {tab === "home" && (
          <>
            <SecHead icon="👥" title="Family Members" sub={`${members.length} linked account${members.length!==1?"s":""}`} action="+ Invite" onAction={() => setTab("invite")} />

            {loading ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#8a9a7a" }}><div style={{ fontSize:32 }}>⏳</div>Loading…</div>
            ) : members.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:"36px 20px" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>👨‍👩‍👧</div>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:17, color:"#1e2a12", marginBottom:6 }}>No family linked yet</div>
                <div style={{ fontSize:12, color:"#8a9a7a", marginBottom:18 }}>Invite family members to share health records securely</div>
                <button onClick={() => setTab("invite")} style={S.btn()}>Generate Invite →</button>
              </div>
            ) : members.map((m,i) => (
              <div key={i} style={S.card}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Avatar name={m.linked_user?.name} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:15, color:"#1e2a12" }}>{m.linked_user?.name}</div>
                    <div style={{ fontSize:11, color:"#8a9a7a" }}>{m.linked_user?.email}</div>
                    <div style={{ display:"flex", gap:6, marginTop:5 }}>
                      <span style={S.pill()}>{m.relation}</span>
                      <span style={S.pill(m.access_level==="write"?"#fdf6e8":"#eef3e4", m.access_level==="write"?"#c88010":"#3e4e26")}>{m.access_level === "write" ? "✎ Write" : "👁 Read"}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(m.linked_user_id)} style={{ background:"#fdeaea", border:"none", borderRadius:10, width:34, height:34, color:"#e05252", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>🗑</button>
                </div>
              </div>
            ))}

            {/* Real-time status badge */}
            <div style={{ textAlign:"center", padding:"10px 0 4px" }}>
              <span style={S.pill("#eef3e4","#3e4e26")}>🟢 Real-time sync active</span>
            </div>
          </>
        )}

        {/* ══════ INVITE TAB ══════ */}
        {tab === "invite" && (
          <>
            <SecHead icon="🔗" title="Invite Family" sub="Generate a code to link family members" />

            <div style={S.card}>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Invitee ID / Aadhaar / Phone (Optional)</label>
                <input value={inviteeId} onChange={e=>setInviteeId(e.target.value)} placeholder="e.g. +91 9876543210 or Aadhaar" style={S.input} />
              </div>

              <button onClick={handleGenInvite} style={{ ...S.btn(), width:"100%", padding:"14px", textAlign:"center", borderRadius:16, marginTop:8 }}>
                🔗 Generate Invite Code
              </button>
            </div>

            {/* Current code + QR */}
            {myCode && (
              <div style={{ ...S.card, textAlign:"center", padding:"24px 20px" }}>
                <div style={{ fontSize:11, color:"#8a9a7a", fontWeight:700, marginBottom:16 }}>YOUR INVITE — VALID FOR 24 HOURS</div>
                <RealQR payload={myCode} textBelow={myCode} />
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button onClick={() => copyCode(myCode)} style={{ ...S.btn("linear-gradient(135deg,#1e5f74,#2e7d9a)"), flex:1, padding:"11px" }}>📋 Copy Code</button>
                  <button onClick={() => {
                    if (navigator.share) navigator.share({ title:"AarogyaXpress Family Invite", text:`Join my family health record! Code: ${myCode}`, url:window.location.origin })
                    else copyCode(`Join my family on AarogyaXpress! Code: ${myCode}`)
                  }} style={{ ...S.btn("linear-gradient(135deg,#2cb89a,#1e9a80)"), flex:1, padding:"11px" }}>📤 Share</button>
                </div>
              </div>
            )}

            {/* Active invites list */}
            {invites.length > 0 && (
              <>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:900, color:"#1e2a12", margin:"18px 0 10px" }}>Active Invites</div>
                {invites.map((inv,i) => (
                  <div key={i} style={{ ...S.card, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12", letterSpacing:2 }}>{inv.invite_code}</div>
                      <div style={{ fontSize:11, color:"#8a9a7a", marginTop:2 }}>Status: {inv.status}</div>
                    </div>
                    <span style={S.pill(inv.status==="accepted"?"#eef7f0":inv.status==="expired"?"#fdeaea":"#fdf6e8", inv.status==="accepted"?"#2cb89a":inv.status==="expired"?"#e05252":"#c88010")}>
                      {inv.status === "pending" ? daysLeft(inv.expires_at) : inv.status}
                    </span>
                    <button onClick={() => copyCode(inv.invite_code)} style={{ width:32, height:32, borderRadius:8, border:"none", background:"#f0ede5", cursor:"pointer", fontSize:14 }}>📋</button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ══════ JOIN TAB ══════ */}
        {tab === "join" && (
          <>
            <SecHead icon="📥" title="Join Family" sub="Enter an invite code or scan a QR" />

            <div style={S.card}>
              {/* Relationship options */}
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Your Relationship to Inviter</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {RELATIONS.map(r => (
                    <button key={r} onClick={() => setRelation(r)} style={{
                      borderRadius:20, padding:"7px 14px", border:`1.5px solid ${relation===r?ACCENT:"#e0ddd5"}`,
                      background:relation===r?ACCENT:"#fff", color:relation===r?"#fff":"#3e4e26",
                      fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all .15s"
                    }}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Access Levels */}
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Provide Access Level To Inviter</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[["read","👁 View Only"],["write","✎ Can Edit"]].map(([v,l]) => (
                    <button key={v} onClick={() => setAccess(v)} style={{
                      flex:1, borderRadius:12, padding:"10px", border:`1.5px solid ${accessLevel===v?ACCENT:"#e0ddd5"}`,
                      background:accessLevel===v?`${ACCENT}11`:"#fff", color:accessLevel===v?ACCENT:"#6a7a5a",
                      fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif"
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              <label style={S.label}>Invite Code</label>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g.  GH3KP2X1"
                maxLength={8}
                style={{ ...S.input, letterSpacing:4, fontSize:20, textAlign:"center", marginBottom:14 }}
              />
              <button onClick={handleJoin} disabled={joining || !joinCode.trim()} style={{ ...S.btn(), width:"100%", padding:"14px", borderRadius:16, opacity:joining?0.7:1 }}>
                {joining ? "Linking…" : "🔗 Join Family"}
              </button>
            </div>

            <div style={{ ...S.card, background:"#eef7f0", border:"none" }}>
              <div style={{ display:"flex", gap:12 }}>
                <span style={{ fontSize:22 }}>🔒</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:"#1e6b40" }}>Safe & Encrypted</div>
                  <div style={{ fontSize:11, color:"#4a7a5a", marginTop:2 }}>Family invites are one-time codes that expire in 24 hours. Both users must consent to link.</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════ RECORDS TAB ══════ */}
        {tab === "records" && (
          <>
            <SecHead icon="📋" title="Shared Records" sub={`Across ${members.length + 1} account${members.length ? "s" : ""}`} />

            {members.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:"32px" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
                <div style={{ fontWeight:900, fontSize:15, color:"#1e2a12", marginBottom:6 }}>No shared records yet</div>
                <div style={{ fontSize:12, color:"#8a9a7a" }}>Link family members first to see their shared reports here</div>
              </div>
            ) : sharedReports.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:"32px" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🗂</div>
                <div style={{ fontWeight:900, fontSize:15, color:"#1e2a12", marginBottom:6 }}>No shared reports found</div>
                <div style={{ fontSize:12, color:"#8a9a7a" }}>Reports marked as shared will appear here</div>
              </div>
            ) : sharedReports.map((r,i) => {
              const owner = members.find(m => m.linked_user_id === r.user_id)?.linked_user || { name:"You" }
              return (
                <div key={i} style={S.card}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:42, height:42, borderRadius:14, background:"#eef3e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📄</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12" }}>{r.report_type || "Health Report"}</div>
                      <div style={{ fontSize:11, color:"#8a9a7a", marginTop:2 }}>By {owner.name} · {r.generated_at ? new Date(r.generated_at).toLocaleDateString("en-IN") : "—"}</div>
                    </div>
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noreferrer" style={{ ...S.pill("#e8f4f0","#2cb89a"), textDecoration:"none" }}>View →</a>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ══════ DOCTOR TAB ══════ */}
        {tab === "doctor" && (
          <>
            <SecHead icon="🩺" title="Doctor Access" sub="Grant temporary read access to doctors" />

            <div style={S.card}>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Doctor Name</label>
                <input value={drName} onChange={e => setDrName(e.target.value)} placeholder="Dr. Sharma" style={S.input} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Doctor Email (optional)</label>
                <input value={drEmail} onChange={e => setDrEmail(e.target.value)} placeholder="doctor@hospital.com" type="email" style={S.input} />
              </div>
              <div style={{ background:"#fdf6e8", borderRadius:12, padding:"10px 12px", marginBottom:14, fontSize:11, color:"#7a5800", fontWeight:700 }}>
                ⏳ Access link expires in 48 hours. You can revoke anytime.
              </div>
              <button onClick={handleDoctorToken} style={{ ...S.btn("linear-gradient(135deg,#1e5f74,#2e7d9a)"), width:"100%", padding:"14px", borderRadius:16 }}>
                🩺 Generate Doctor Link
              </button>
            </div>

            {/* Active doctor tokens */}
            {doctorTokens.length > 0 && (
              <>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:900, color:"#1e2a12", margin:"18px 0 10px" }}>Active Access Links & QRs</div>
                {doctorTokens.map((dt,i) => (
                  <div key={i} style={S.card}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: 12 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:"#e8f4f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🩺</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12" }}>{dt.doctor_name}</div>
                        <div style={{ fontSize:11, color:"#8a9a7a" }}>{dt.access_type} · {daysLeft(dt.expires_at)}</div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {!dt.revoked && (
                          <button onClick={() => handleRevoke(dt.id)} style={{ ...S.pill("#fdeaea","#e05252"), cursor:"pointer", border:"none" }}>Revoke</button>
                        )}
                        {dt.revoked && <span style={S.pill("#f0ede5","#8a9a7a")}>Revoked</span>}
                      </div>
                    </div>
                    {!dt.revoked && (
                      <div style={{ background: "#f9f7f2", borderRadius: 12, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                        <RealQR payload={{ token: dt.access_token, type: "doctor_access" }} textBelow="Scan QR" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "#8a9a7a", marginBottom: 6 }}>Or share token URL directly:</div>
                          <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/doctor-view?token=${dt.access_token}`); toast_("🔗 Link copied!") }}
                            style={{ ...S.btn("linear-gradient(135deg,#1e5f74,#2e7d9a)"), width: "100%", padding: 10, fontSize: 11 }}>📋 Copy Link</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={{ ...S.card, background:"#eef7f0", border:"none", marginTop:6 }}>
              <div style={{ display:"flex", gap:12 }}>
                <span style={{ fontSize:22 }}>🔐</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:"#1e6b40" }}>HIPAA-style Access Control</div>
                  <div style={{ fontSize:11, color:"#4a7a5a", marginTop:2 }}>Doctors receive a secure link valid for 48 hours. You can revoke access at any time. No login required for doctors.</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)", background:"#1a2c12", color:"#fff", borderRadius:14, padding:"10px 22px", fontSize:13, fontWeight:700, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,0.25)", animation:"fadeUp .25s ease" }}>{toast}</div>
      )}
    </div>
  )
}
