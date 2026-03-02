import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import CheckoutModal from "./CheckoutModal";

export default function CartModal({ onClose }) {
  const { cart, updateCartQuantity, removeFromCart } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);

  const subtotal = cart.reduce((sum, item) => {
    const price = parseInt(item.price.replace(/[^0-9]/g, ""));
    return sum + price * item.quantity;
  }, 0);
  const shipping = 150;
  const total = subtotal + shipping;

  if (showCheckout) {
    return <CheckoutModal onClose={onClose} onBack={() => setShowCheckout(false)} total={total} />;
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal cart-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="cart-container">
          <h2>🛒 Mi Carrito de Compras</h2>
          <div className="cart-items-container">
            {cart.length === 0 ? (
              <p className="empty-cart">Tu carrito está vacío</p>
            ) : (
              cart.map((item, index) => {
                const priceNum = parseInt(item.price.replace(/[^0-9]/g, ""));
                const itemTotal = priceNum * item.quantity;
                return (
                  <div key={index} className="cart-item">
                    <img src={item.image} alt={item.title} className="cart-item-image" />
                    <div className="cart-item-details">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                      <p className="cart-item-price">{item.price} x {item.quantity} = ${itemTotal.toLocaleString()} MXN</p>
                    </div>
                    <div className="cart-item-actions">
                      <button className="quantity-btn" onClick={() => updateCartQuantity(index, -1)}>-</button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button className="quantity-btn" onClick={() => updateCartQuantity(index, 1)}>+</button>
                      <button className="remove-item-btn" onClick={() => { if (window.confirm("¿Eliminar este producto del carrito?")) removeFromCart(index); }}>🗑️</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {cart.length > 0 && (
            <div className="cart-summary">
              <div className="cart-total">
                <h3>Resumen de Compra</h3>
                <div className="total-row"><span>Subtotal:</span><strong>${subtotal.toLocaleString()} MXN</strong></div>
                <div className="total-row"><span>Envío:</span><strong>$150 MXN</strong></div>
                <div className="total-row grand-total"><span>Total:</span><strong>${total.toLocaleString()} MXN</strong></div>
              </div>
              <button className="checkout-btn" onClick={() => setShowCheckout(true)}>💳 Proceder al Pago</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
