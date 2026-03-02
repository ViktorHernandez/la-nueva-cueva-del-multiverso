import React from "react";
import { useAuth } from "../context/AuthContext";

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Justo ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} d`;
}

export default function NotificationsModal({ onClose }) {
  const { notifications, setNotifications, getAuthHeaders, API_BASE } = useAuth();

  async function markAsRead(index) {
    const notif = notifications[index];
    try {
      await fetch(`${API_BASE}/notifications/${notif._id}`, {
        method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ read: true }),
      });
    } catch {}
    const updated = [...notifications];
    updated[index].read = true;
    setNotifications(updated);
  }

  async function markAllRead() {
    try {
      await fetch(`${API_BASE}/notifications/markAllRead`, { method: "PUT", headers: getAuthHeaders() });
    } catch {}
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  }

  async function deleteNotification(index) {
    if (!window.confirm("¿Eliminar esta notificación?")) return;
    const notif = notifications[index];
    try {
      await fetch(`${API_BASE}/notifications/${notif._id}`, { method: "DELETE", headers: getAuthHeaders() });
    } catch {}
    const updated = [...notifications];
    updated.splice(index, 1);
    setNotifications(updated);
  }

  async function clearAll() {
    if (!window.confirm("¿Eliminar todas las notificaciones?")) return;
    try {
      await fetch(`${API_BASE}/notifications`, { method: "DELETE", headers: getAuthHeaders() });
    } catch {}
    setNotifications([]);
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal notification-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="notification-container">
          <h2>🔔 Centro de Notificaciones</h2>
          <div className="notification-actions">
            <button className="mark-read-btn" onClick={markAllRead}>✓ Marcar todas como leídas</button>
            <button className="clear-notifications-btn" onClick={clearAll}>🗑️ Limpiar todas</button>
          </div>
          <div className="notifications-container">
            {notifications.length === 0 ? (
              <p className="empty-notifications">No hay notificaciones</p>
            ) : (
              notifications.map((notif, index) => (
                <div key={notif._id || index} className={`notification-item ${notif.read ? "read" : "unread"}`}>
                  <div className="notification-header">
                    <span className="notification-icon">🛒</span>
                    <div className="notification-info">
                      <h4>Nueva Compra Realizada</h4>
                      <p className="notification-time">{formatTime(notif.timestamp)}</p>
                    </div>
                    {!notif.read && <span className="unread-badge">•</span>}
                  </div>
                  <div className="notification-body">
                    <p><strong>Cliente:</strong> {notif.customerName}</p>
                    <p><strong>Email:</strong> {notif.customerEmail}</p>
                    <p><strong>Número de Orden:</strong> {notif.orderNumber}</p>
                    <p><strong>Fecha:</strong> {notif.date}</p>
                    <p><strong>Total:</strong> ${notif.total?.toLocaleString()} MXN</p>
                    {notif.items?.length > 0 && (
                      <details>
                        <summary>Ver productos ({notif.items.length})</summary>
                        <ul className="notification-items-list">
                          {notif.items.map((item, i) => (
                            <li key={i}>{item.title} x{item.quantity} - {item.price}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="notification-actions">
                    {!notif.read && (
                      <button className="mark-read-single" onClick={() => markAsRead(index)}>✓ Marcar como leída</button>
                    )}
                    <button className="delete-notification" onClick={() => deleteNotification(index)}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
