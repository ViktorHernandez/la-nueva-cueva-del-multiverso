import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";

export default function ProductModal({ product, onClose }) {
  const { addToCart } = useAuth();
  const { speak } = useAccessibility();

  useEffect(() => {
    if (!product) return;
    const texto = [
      product.title,
      product.seller ? `Vendedor: ${product.seller}` : "",
      product.price || "",
      product.fullDescription || product.description || "",
    ]
      .filter(Boolean)
      .join(". ");
    speak(texto);
  }, [product, speak]);

  if (!product) return null;

  async function handleAddToCart() {
    const added = await addToCart(product);
    if (added) {
      alert(`✅ ${product.title} agregado al carrito`);
      onClose();
    } else {
      alert("⚠️ Debes iniciar sesión para agregar productos al carrito");
    }
  }

  const whatsappMsg = encodeURIComponent(
    `¡Hola! Estoy interesado en este producto: ${product.title} - ${product.description}`
  );

  return (
    <div
      className="modal show"
      onClick={(e) =>
        (e.target === e.currentTarget || e.target.classList.contains("close")) && onClose()
      }
    >
      <div className="modal-content modal-scrollable">
        <span className="close" onClick={onClose}>&times;</span>
        <div className="modal-body">
          <img src={product.image} alt={product.title} />
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <p><strong>Vendedor:</strong> {product.seller}</p>
          <p className="price">{product.price}</p>
        </div>
        <a
          href={`https://wa.me/5215629727628?text=${whatsappMsg}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Contactar por WhatsApp sobre ${product.title}`}
          style={{
            display: "inline-block",
            marginTop: 15,
            padding: "10px 20px",
            background: "#25D366",
            color: "#fff",
            borderRadius: 980,
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          💬 Contactar por WhatsApp
        </a>
        <button
          onClick={handleAddToCart}
          aria-label={`Añadir ${product.title} al carrito`}
          style={{
            display: "inline-block",
            marginTop: 15,
            marginLeft: 10,
            padding: "10px 20px",
            background: "#0071e3",
            color: "#fff",
            border: "none",
            borderRadius: 980,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🛒 Añadir al Carrito
        </button>
      </div>
    </div>
  );
}