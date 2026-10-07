// src/pages/CartPage.jsx  –  Amazon-style cart with GST, checkout flow
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export function useCart() {
  const [cart, setCart] = useState([])

  const addToCart = (med) => {
    setCart(prev => {
      const existing = prev.find(i => i.name === med.name)
      if (existing) return prev.map(i => i.name === med.name ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...med, qty: 1 }]
    })
  }

  const removeFromCart = (name) => setCart(prev => prev.filter(i => i.name !== name))

  const updateQty = (name, delta) => {
    setCart(prev => prev.map(i => i.name === name ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter(i => i.qty > 0))
  }

  const clearCart = () => setCart([])

  const totalItems = cart.reduce((s, i) => s + i.qty, 0)
  const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0)

  return { cart, addToCart, removeFromCart, updateQty, clearCart, totalItems, subtotal }
}

export default function CartPage({ cart, removeFromCart, updateQty, onClose, onCheckout }) {
  const GST_RATE  = 0.12
  const DELIVERY  = cart.length > 0 && cart.reduce((s,i) => s + i.price*i.qty, 0) < 499 ? 40 : 0
  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const gst       = +(subtotal * GST_RATE).toFixed(2)
  const total     = subtotal + gst + DELIVERY

  return (
    <div style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end" }}>
      <div style={{
        background:"#f5f2eb", borderRadius:"26px 26px 0 0", width:"100%", maxWidth:480,
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 -8px 44px rgba(0,0,0,0.25)", fontFamily:"'Nunito',sans-serif",
        margin:"0 auto"
      }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#3e4e26,#5a6e3a)", borderRadius:"26px 26px 0 0", padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:22 }}>🛒</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"#fff", fontWeight:900, fontSize:17 }}>My Cart</div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, fontWeight:600 }}>{cart.length} item{cart.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.18)", border:"none", borderRadius:10, width:34, height:34, color:"#fff", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", scrollbarWidth:"none" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", padding:"50px 0" }}>
              <div style={{ fontSize:60, marginBottom:16 }}>🛒</div>
              <div style={{ fontWeight:900, fontSize:18, color:"#1e2a12", marginBottom:8 }}>Your cart is empty</div>
              <div style={{ color:"#8a9a7a", fontSize:13 }}>Add medicines from the services section</div>
            </div>
          ) : (
            <>
              {/* Cart items */}
              {cart.map((item, i) => (
                <div key={i} style={{
                  background:"#fff", borderRadius:18, padding:"14px 16px", marginBottom:10,
                  display:"flex", gap:12, alignItems:"center",
                  boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:"1px solid #f0ede5"
                }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:"#eef3e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
                    {item.emoji || "💊"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:900, fontSize:14, color:"#1e2a12", marginBottom:2 }}>{item.name}</div>
                    <div style={{ fontSize:11, color:"#8a9a7a" }}>{item.dosage}</div>
                    <div style={{ fontWeight:900, fontSize:15, color:"#3e4e26", marginTop:4 }}>₹{item.price}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                    {/* Qty stepper */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, background:"#f0ede5", borderRadius:10, padding:"4px 6px" }}>
                      <button onClick={() => updateQty(item.name, -1)} style={{ width:24, height:24, border:"none", borderRadius:6, background:"#fff", fontWeight:900, cursor:"pointer", color:"#3e4e26", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ fontWeight:800, fontSize:14, color:"#1e2a12", minWidth:20, textAlign:"center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.name,  1)} style={{ width:24, height:24, border:"none", borderRadius:6, background:"#5a6e3a", fontWeight:900, cursor:"pointer", color:"#fff", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.name)} style={{ background:"none", border:"none", color:"#e05252", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑 Remove</button>
                  </div>
                </div>
              ))}

              {/* Savings banner */}
              <div style={{ background:"linear-gradient(135deg,#eef7f0,#d8f0e0)", borderRadius:14, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>🎁</span>
                <span style={{ fontWeight:700, fontSize:12, color:"#1e6b40" }}>You save <strong>₹{(subtotal * 0.3).toFixed(0)}</strong> (30% off applied)</span>
              </div>

              {/* Price breakdown */}
              <div style={{ background:"#fff", borderRadius:18, padding:"16px 18px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:"1px solid #f0ede5" }}>
                <div style={{ fontWeight:900, fontSize:15, color:"#1e2a12", marginBottom:12 }}>Price Details</div>
                {[
                  { label: `Subtotal (${cart.reduce((s,i) => s+i.qty, 0)} items)`, val: `₹${subtotal}` },
                  { label: "GST (12%)", val: `₹${gst}` },
                  { label: "Delivery Charges", val: DELIVERY === 0 ? "FREE 🎉" : `₹${DELIVERY}` },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:13, color:"#6a7a5a", fontWeight:600 }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color: r.val.includes("FREE") ? "#2cb89a" : "#1e2a12" }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ borderTop:"1.5px dashed #e0ddd5", marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:15, fontWeight:900, color:"#1e2a12" }}>Total Amount</span>
                  <span style={{ fontSize:15, fontWeight:900, color:"#3e4e26" }}>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Checkout button */}
        {cart.length > 0 && (
          <div style={{ padding:"12px 16px 28px", borderTop:"1px solid #f0ede5" }}>
            <button onClick={onCheckout} style={{
              width:"100%", background:"linear-gradient(135deg,#3e4e26,#5a6e3a)",
              color:"#fff", border:"none", borderRadius:18, padding:"16px",
              fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:"'Nunito',sans-serif",
              boxShadow:"0 6px 22px rgba(62,78,38,0.3)", letterSpacing:0.3
            }}>
              Proceed to Checkout →  ₹{total.toFixed(2)}
            </button>
            <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"#8a9a7a", fontWeight:600 }}>
              🔒 Safe & Secured payment · GST Invoice included
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
