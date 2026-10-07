// src/pages/CheckoutPage.jsx  –  Flipkart/Amazon-style checkout with address + GST
import { useState } from "react"
import { supabase } from "../lib/supabase"
import { auth } from "../firebase"

export default function CheckoutPage({ cart, onClose, onSuccess }) {
  const GST_RATE  = 0.12
  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const gst       = +(subtotal * GST_RATE).toFixed(2)
  const DELIVERY  = subtotal < 499 ? 40 : 0
  const total     = subtotal + gst + DELIVERY

  const [step, setStep]       = useState("address") // address | payment | success
  const [payMethod, setPay]   = useState("upi")
  const [form, setForm]       = useState({
    name:"", phone:"", pincode:"", street:"", city:"", state:"", landmark:""
  })
  const [errors, setErrors]   = useState({})

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = "Name required"
    if (!form.phone.match(/^\d{10}$/)) e.phone = "Valid 10-digit mobile required"
    if (!form.pincode.match(/^\d{6}$/)) e.pincode = "Valid 6-digit pincode required"
    if (!form.street.trim())  e.street  = "Address required"
    if (!form.city.trim())    e.city    = "City required"
    if (!form.state.trim())   e.state   = "State required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const Field = ({ label, field, placeholder, type="text", hint }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:800, color:"#5a6e3a", textTransform:"uppercase", letterSpacing:0.5, display:"block", marginBottom:5 }}>{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%", boxSizing:"border-box",
          background: errors[field] ? "#fff0f0" : "#fff",
          border: `1.5px solid ${errors[field] ? "#e05252" : "#e0e8d0"}`,
          borderRadius:14, padding:"12px 14px",
          fontSize:14, fontWeight:600, fontFamily:"'Nunito',sans-serif",
          color:"#1e2a12", outline:"none"
        }}
      />
      {errors[field] && <span style={{ fontSize:11, color:"#e05252", fontWeight:600 }}>{errors[field]}</span>}
      {hint && !errors[field] && <span style={{ fontSize:11, color:"#aaa" }}>{hint}</span>}
    </div>
  )

  if (step === "success") return (
    <div style={{ position:"fixed", inset:0, zIndex:5000, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:28, padding:"40px 32px", maxWidth:360, width:"90%", textAlign:"center", boxShadow:"0 16px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:24, fontWeight:900, color:"#1e2a12", marginBottom:8 }}>Order Placed!</div>
        <div style={{ fontSize:13, color:"#6a7a5a", marginBottom:6 }}>Your medicines will be delivered in <strong>2-4 business days</strong>.</div>
        <div style={{ background:"#eef7f0", borderRadius:14, padding:"10px 16px", margin:"16px 0", fontSize:13, color:"#1e6b40", fontWeight:700 }}>
          Order Total: ₹{total.toFixed(2)} (incl. GST)
        </div>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:20 }}>A GST invoice will be sent to your registered email.</div>
        <button onClick={() => { onSuccess?.(); onClose() }} style={{
          width:"100%", background:"linear-gradient(135deg,#3e4e26,#5a6e3a)", color:"#fff",
          border:"none", borderRadius:16, padding:"14px", fontSize:15, fontWeight:900,
          cursor:"pointer", fontFamily:"'Nunito',sans-serif"
        }}>Back to Home</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:"fixed", inset:0, zIndex:5000, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{
        background:"#f5f2eb", borderRadius:"26px 26px 0 0", width:"100%", maxWidth:480,
        maxHeight:"95vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 44px rgba(0,0,0,0.25)", fontFamily:"'Nunito',sans-serif", margin:"0 auto"
      }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#3e4e26,#5a6e3a)", borderRadius:"26px 26px 0 0", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:20 }}>🏪</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"#fff", fontWeight:900, fontSize:17 }}>Checkout</div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>
              {step === "address" ? "Step 1/2 · Delivery Address" : "Step 2/2 · Payment"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.18)", border:"none", borderRadius:10, width:34, height:34, color:"#fff", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex", padding:"10px 20px 0", gap:8 }}>
          {["Address","Payment"].map((s,i) => (
            <div key={s} style={{ flex:1, height:4, borderRadius:2, background: i === (step==="address"?0:1) || (step==="payment"&&i===0) ? "#5a6e3a" : "#e0ddd5" }} />
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", scrollbarWidth:"none" }}>

          {step === "address" && (
            <>
              <div style={{ fontWeight:900, fontSize:16, color:"#1e2a12", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>📍 Delivery Address</div>

              <Field label="Full Name" field="name" placeholder="Enter your full name" />
              <Field label="Mobile Number" field="phone" placeholder="10-digit mobile" type="tel" hint="OTP will be sent for verification" />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Pincode" field="pincode" placeholder="6-digit PIN" type="tel" />
                <Field label="City" field="city" placeholder="City" />
              </div>

              <Field label="Street / Flat / Building" field="street" placeholder="House no, Street name, Area" />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="State" field="state" placeholder="State" />
                <Field label="Landmark (optional)" field="landmark" placeholder="Near…" />
              </div>

              {/* Address type */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:800, color:"#5a6e3a", textTransform:"uppercase", display:"block", marginBottom:8 }}>Address Type</label>
                <div style={{ display:"flex", gap:10 }}>
                  {["Home","Office","Other"].map(t => (
                    <button key={t} style={{ flex:1, borderRadius:12, padding:"8px 0", border:"1.5px solid #c8ddb0", background:"#fff", fontSize:12, fontWeight:800, color:"#3e4e26", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>{t}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "payment" && (
            <>
              <div style={{ fontWeight:900, fontSize:16, color:"#1e2a12", marginBottom:16 }}>💳 Payment Method</div>

              {/* Address summary */}
              <div style={{ background:"#fff", borderRadius:16, padding:"12px 14px", marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#5a6e3a", marginBottom:4 }}>📍 DELIVERY TO</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1e2a12" }}>{form.name} · {form.phone}</div>
                <div style={{ fontSize:12, color:"#6a7a5a" }}>{form.street}, {form.city}, {form.state} – {form.pincode}</div>
              </div>

              {/* Payment options */}
              {[
                { id:"upi",   icon:"📱", label:"UPI / QR Code", sub:"PhonePe, GPay, Paytm" },
                { id:"card",  icon:"💳", label:"Credit / Debit Card", sub:"Visa, Mastercard, RuPay" },
                { id:"netbanking", icon:"🏦", label:"Net Banking", sub:"All major banks" },
                { id:"cod",   icon:"🏠", label:"Cash on Delivery", sub:"Pay when delivered" },
              ].map(pm => (
                <div key={pm.id} onClick={() => setPay(pm.id)} style={{
                  background:"#fff", borderRadius:16, padding:"14px 16px", marginBottom:10,
                  display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                  border:`2px solid ${payMethod===pm.id ? "#5a6e3a" : "#f0ede5"}`,
                  boxShadow: payMethod===pm.id ? "0 4px 16px rgba(90,110,58,0.15)" : "none",
                  transition:"border 0.2s"
                }}>
                  <div style={{ fontSize:22 }}>{pm.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12" }}>{pm.label}</div>
                    <div style={{ fontSize:11, color:"#8a9a7a" }}>{pm.sub}</div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${payMethod===pm.id?"#5a6e3a":"#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {payMethod===pm.id && <div style={{ width:10, height:10, borderRadius:"50%", background:"#5a6e3a" }} />}
                  </div>
                </div>
              ))}

              {/* Order summary */}
              <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", marginTop:6, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12", marginBottom:10 }}>🧾 Order Summary</div>
                {cart.map(i => (
                  <div key={i.name} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"#6a7a5a" }}>{i.name} ({i.dosage}) × {i.qty}</span>
                    <span style={{ fontSize:12, fontWeight:700 }}>₹{i.price * i.qty}</span>
                  </div>
                ))}
                <div style={{ borderTop:"1px dashed #e0ddd5", marginTop:8, paddingTop:8 }}>
                  {[["Subtotal",`₹${subtotal}`],[`GST (12%)`,`₹${gst}`],["Delivery", DELIVERY===0?"FREE 🎉":`₹${DELIVERY}`]].map(([l,v]) => (
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:"#8a9a7a" }}>{l}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:v.includes("FREE")?"#2cb89a":"#1e2a12" }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:"2px solid #e8f5de" }}>
                    <span style={{ fontWeight:900, fontSize:15, color:"#1e2a12" }}>Total</span>
                    <span style={{ fontWeight:900, fontSize:15, color:"#3e4e26" }}>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding:"12px 18px 28px", borderTop:"1px solid #f0ede5" }}>
          {step === "address" ? (
            <button onClick={() => { if (validate()) setStep("payment") }} style={{
              width:"100%", background:"linear-gradient(135deg,#3e4e26,#5a6e3a)", color:"#fff",
              border:"none", borderRadius:18, padding:"16px", fontSize:16, fontWeight:900,
              cursor:"pointer", fontFamily:"'Nunito',sans-serif", letterSpacing:0.3
            }}>
              Continue to Payment →
            </button>
          ) : (
            <button onClick={async () => {
              // Save each cart item as a medicine_purchase activity for the timeline
              try {
                const user = auth.currentUser
                if (user) {
                  const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).single()
                  if (dbUser) {
                    const rows = cart.map(item => ({
                      user_id: dbUser.id,
                      type: 'medicine_purchase',
                      title: 'Medicine Purchased',
                      description: `${item.name} ${item.dosage} × ${item.qty} — ${payMethod.toUpperCase()}`,
                      cost: item.price * item.qty,
                      status: 'completed',
                    }))
                    await supabase.from('activities').insert(rows)
                  }
                }
              } catch (e) {
                console.error('Failed to log purchase activity:', e)
              }
              setStep("success")
            }} style={{
              width: "100%", background: "linear-gradient(135deg,#c88010,#f5a623)", color: "#fff",
              border: "none", borderRadius: 18, padding: "16px", fontSize: 16, fontWeight: 900,
              cursor: "pointer", fontFamily: "'Nunito',sans-serif", letterSpacing: 0.3,
              boxShadow: "0 6px 22px rgba(200,128,16,0.35)"
            }}>
              🎁 Place Order · ₹{total.toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
