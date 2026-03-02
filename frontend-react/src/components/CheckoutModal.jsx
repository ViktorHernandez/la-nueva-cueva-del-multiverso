import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConfirmationModal from "./ConfirmationModal";

async function getTime() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://timeapi.bio/timeapi/time/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region: "Europe/Madrid", fields: "year,month,day,hour,minute,second" }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    return `${data.day}/${data.month}/${data.year} ${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`;
  } catch {
    const now = new Date();
    return now.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }
}

export default function CheckoutModal({ onClose, onBack, total }) {
  const { cart, currentUser, clearCart, getAuthHeaders, API_BASE } = useAuth();
  const [lastOrder, setLastOrder] = useState(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardEmail, setCardEmail] = useState(currentUser?.email || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");

  function formatCardNumber(val) {
    const clean = val.replace(/\s/g, "");
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
  }

  function formatExpiry(val) {
    const clean = val.replace(/\D/g, "");
    if (clean.length >= 2) return clean.slice(0, 2) + "/" + clean.slice(2, 4);
    return clean;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13 || cleanCard.length > 19 || !/^\d+$/.test(cleanCard)) {
      alert("❌ Número de tarjeta inválido"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardEmail)) {
      alert("❌ Correo electrónico inválido"); return;
    }
    if (!/^\d{3}$/.test(cardCVV)) {
      alert("❌ CVV inválido (debe ser 3 dígitos)"); return;
    }
    const [mo, yr] = cardExpiry.split("/");
    const month = parseInt(mo), year = parseInt("20" + yr);
    const now = new Date();
    if (!month || !year || month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      alert("❌ Fecha de expiración inválida o vencida"); return;
    }

    const orderDate = await getTime();
    const orderNumber = "ORD-" + Date.now();
    const order = {
      orderNumber,
      date: orderDate,
      total,
      email: cardEmail,
      items: [...cart],
      customer: { name: cardName, email: cardEmail, address, city, zip },
    };

    try {
      await fetch(`${API_BASE}/orders`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(order) });
      await fetch(`${API_BASE}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, customerName: cardName, customerEmail: cardEmail, total, date: orderDate }),
      });
    } catch {}

    await clearCart();
    setLastOrder(order);
  }

  if (lastOrder) {
    return <ConfirmationModal order={lastOrder} onClose={onClose} />;
  }

  const subtotal = cart.reduce((s, i) => s + parseInt(i.price.replace(/[^0-9]/g, "")) * i.quantity, 0);

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="auth-container">
          <h2>💳 Finalizar Compra</h2>
          <div className="checkout-summary">
            <h3>Resumen del Pedido</h3>
            {cart.map((item, i) => {
              const p = parseInt(item.price.replace(/[^0-9]/g, ""));
              return (
                <div key={i} className="checkout-item">
                  <span>{item.title} x{item.quantity}</span>
                  <span>${(p * item.quantity).toLocaleString()} MXN</span>
                </div>
              );
            })}
            <div className="checkout-total">
              <strong>Total a Pagar:</strong>
              <span>${total.toLocaleString()} MXN</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <h3>Información de Pago</h3>
            <label>Nombre del titular</label>
            <input type="text" placeholder="Nombre completo" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
            <label>Número de tarjeta</label>
            <input type="text" placeholder="1234 5678 9012 3456" maxLength="19" value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} required />
            <div className="card-row">
              <div className="card-col">
                <label>Fecha de expiración</label>
                <input type="text" placeholder="MM/AA" maxLength="5" value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} required />
              </div>
              <div className="card-col">
                <label>CVV</label>
                <input type="text" placeholder="123" maxLength="3" value={cardCVV}
                  onChange={(e) => setCardCVV(e.target.value)} required />
              </div>
            </div>
            <label>Correo de confirmación</label>
            <input type="email" placeholder="correo@ejemplo.com" value={cardEmail}
              onChange={(e) => setCardEmail(e.target.value)} required />
            <h3>Dirección de Envío</h3>
            <label>Dirección completa</label>
            <input type="text" placeholder="Calle, Número, Colonia" value={address}
              onChange={(e) => setAddress(e.target.value)} required />
            <div className="card-row">
              <div className="card-col">
                <label>Ciudad</label>
                <input type="text" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="card-col">
                <label>Código Postal</label>
                <input type="text" placeholder="12345" maxLength="5" value={zip} onChange={(e) => setZip(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="pay-btn">🔒 Pagar Ahora</button>
          </form>
        </div>
      </div>
    </div>
  );
}
