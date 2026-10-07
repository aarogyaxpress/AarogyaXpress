import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, ShoppingCart, ShieldCheck, Truck } from "lucide-react";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";

const CATALOGUE = [
  { name: "Paracetamol", price: 25, emoji: "💊", type: "Pain relief", detail: "Sample catalogue item" },
  { name: "Ibuprofen", price: 35, emoji: "🩹", type: "Pain relief", detail: "Sample catalogue item" },
];

function useCartPersist() {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);

  const addToCart = (medicine) => setCart(current => {
    const existing = current.find(item => item.name === medicine.name);
    return existing
      ? current.map(item => item.name === medicine.name ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { ...medicine, qty: 1 }];
  });
  const removeFromCart = (name) => setCart(current => current.filter(item => item.name !== name));
  const updateQty = (name, delta) => setCart(current => current
    .map(item => item.name === name ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
    .filter(item => item.qty > 0));

  return { cart, addToCart, removeFromCart, updateQty, clearCart: () => setCart([]) };
}

export default function ServicesPage() {
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState("");
  const { cart, addToCart, removeFromCart, updateQty, clearCart } = useCartPersist();
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const medicines = useMemo(() => CATALOGUE.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const handleAdd = (item) => {
    addToCart(item);
    setToast(`${item.name} added to your cart`);
    window.setTimeout(() => setToast(""), 1800);
  };

  return (
    <main style={{ padding: "18px 16px 32px", color: "#1e2a12" }}>
      <section style={{ position: "relative", overflow: "hidden", borderRadius: 24, padding: "22px 20px", color: "white", background: "linear-gradient(135deg,#354a22,#647b42)", boxShadow: "0 12px 28px rgba(42,61,26,.16)" }}>
        <div aria-hidden="true" style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", right: -48, top: -70, background: "rgba(255,255,255,.08)" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, opacity: .75 }}>AAROGYAXPRESS · CARE HUB</div>
            <h1 style={{ margin: "8px 0 6px", font: "900 23px/1.15 'Nunito',sans-serif", color: "white" }}>Services for your everyday care</h1>
            <p style={{ margin: 0, maxWidth: 255, fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,.8)" }}>Browse the sample catalogue and keep your care essentials together.</p>
          </div>
          <button type="button" onClick={() => setShowCart(true)} aria-label={`Open cart, ${cartCount} items`} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, border: "1px solid rgba(255,255,255,.2)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,.14)", color: "white", fontWeight: 900, cursor: "pointer" }}>
            <ShoppingCart size={17} /> {cartCount}
          </button>
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 17, position: "relative" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 99, background: "rgba(255,255,255,.12)", fontSize: 10, fontWeight: 800 }}><Truck size={13} /> Care essentials</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 99, background: "rgba(255,255,255,.12)", fontSize: 10, fontWeight: 800 }}><ShieldCheck size={13} /> Health-first</span>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ font: "900 18px 'Nunito',sans-serif" }}>Medicine catalogue</div>
            <div style={{ marginTop: 3, color: "#829078", fontSize: 11 }}>A small demo selection</div>
          </div>
          <span style={{ color: "#7a896c", fontSize: 10, fontWeight: 800 }}>{medicines.length} items</span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 13, padding: "0 13px", height: 46, borderRadius: 15, background: "white", border: "1px solid #e7eadd", boxShadow: "0 3px 12px rgba(30,42,18,.035)" }}>
          <Search size={17} color="#829078" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search medicines" aria-label="Search medicines" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", color: "#1e2a12", font: "600 13px 'Nunito Sans',sans-serif" }} />
        </label>

        <div style={{ display: "grid", gap: 11, marginTop: 13 }}>
          {medicines.map(item => (
            <article key={item.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 18, background: "white", border: "1px solid #e8ebdf", boxShadow: "0 4px 14px rgba(30,42,18,.04)" }}>
              <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 15, background: "#eef3e5", fontSize: 23 }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "900 14px 'Nunito',sans-serif" }}>{item.name}</div>
                <div style={{ marginTop: 2, color: "#849078", fontSize: 10 }}>{item.type} · {item.detail}</div>
                <div style={{ marginTop: 5, color: "#3e572a", font: "900 14px 'Nunito',sans-serif" }}>₹{item.price}</div>
              </div>
              <button type="button" onClick={() => handleAdd(item)} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: 0, borderRadius: 12, padding: "9px 12px", background: "#40582b", color: "white", font: "800 12px 'Nunito',sans-serif", cursor: "pointer" }}>
                <ShoppingBag size={14} /> Add
              </button>
            </article>
          ))}
          {medicines.length === 0 && <div style={{ padding: 20, borderRadius: 16, background: "white", color: "#718066", textAlign: "center", fontSize: 12 }}>No matching items. Try another search.</div>}
        </div>
      </section>

      <aside style={{ marginTop: 14, padding: "12px 13px", borderRadius: 15, background: "#fff8e8", border: "1px solid #f1dfb5", color: "#765c2b", fontSize: 10, lineHeight: 1.55 }}>
        <strong>Demo catalogue:</strong> These sample items, prices, delivery estimates, and checkout are not connected to a pharmacy or payment provider. Follow the medicine label or a clinician’s instructions.
      </aside>

      {showCart && <CartPage cart={cart} removeFromCart={removeFromCart} updateQty={updateQty} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />}
      {showCheckout && <CheckoutPage cart={cart} onClose={() => setShowCheckout(false)} onSuccess={() => { clearCart(); setShowCheckout(false); }} />}
      {toast && <div role="status" style={{ position: "fixed", zIndex: 4000, bottom: 88, left: "50%", transform: "translateX(-50%)", padding: "10px 15px", borderRadius: 13, background: "#1e2a12", color: "white", fontSize: 12, fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,.18)", whiteSpace: "nowrap" }}>{toast}</div>}
    </main>
  );
}
