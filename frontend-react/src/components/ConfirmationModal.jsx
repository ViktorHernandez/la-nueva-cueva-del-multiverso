import React from "react";

export default function ConfirmationModal({ order, onClose }) {
  function downloadInvoice() {
    let content = `
═══════════════════════════════════════════════════════════
🕳️ LA CUEVA DEL MULTIVERSO
FACTURA DE COMPRA - TICKET DE VENTA
═══════════════════════════════════════════════════════════

Número de Orden: ${order.orderNumber}
Fecha: ${order.date}

─────────────────────────────────────────────────────────────
DATOS DEL CLIENTE
─────────────────────────────────────────────────────────────
Nombre: ${order.customer.name}
Email: ${order.customer.email}
Dirección: ${order.customer.address}
Ciudad: ${order.customer.city}
C.P.: ${order.customer.zip}

─────────────────────────────────────────────────────────────
PRODUCTOS ADQUIRIDOS
─────────────────────────────────────────────────────────────
`;
    order.items.forEach((item, i) => {
      const priceNum = parseInt(item.price.replace(/[^0-9]/g, ""));
      const itemTotal = priceNum * item.quantity;
      content += `
${i + 1}. ${item.title}
Cantidad: ${item.quantity}
Precio unitario: ${item.price}
Subtotal: $${itemTotal.toLocaleString()} MXN
Vendedor: ${item.seller}
`;
    });

    const subtotal = order.total - 150;
    content += `
─────────────────────────────────────────────────────────────
RESUMEN DE PAGO
─────────────────────────────────────────────────────────────
Subtotal:                           $${subtotal.toLocaleString()} MXN
Envío:                              $150 MXN
─────────────────────────────────────────────────────────────
TOTAL PAGADO:                       $${order.total.toLocaleString()} MXN
─────────────────────────────────────────────────────────────

Método de pago: Tarjeta de Crédito/Débito
Estado del pago: APROBADO ✅

═══════════════════════════════════════════════════════════
        ¡Gracias por tu compra!
    Tu pedido será enviado en 3-5 días hábiles
═══════════════════════════════════════════════════════════

📧 Contacto: info@cuevadelmultiverso.com
📱 WhatsApp: +52 1 562 972 7628
🌐 www.cuevadelmultiverso.com
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Factura_${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert("✅ Factura descargada exitosamente");
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="auth-container confirmation-container">
          <div className="success-icon">✅</div>
          <h2>¡Compra Exitosa!</h2>
          <p className="confirmation-message">Tu pedido ha sido procesado correctamente</p>
          <div className="order-details">
            <h3>Detalles del Pedido</h3>
            <p><strong>Número de Orden:</strong> {order.orderNumber}</p>
            <p><strong>Fecha:</strong> {order.date}</p>
            <p><strong>Total Pagado:</strong> ${order.total.toLocaleString()} MXN</p>
            <p><strong>Correo de Confirmación:</strong> {order.email}</p>
          </div>
          <button className="download-invoice-btn" onClick={downloadInvoice}>📄 Descargar Factura</button>
          <button className="close-confirmation-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
