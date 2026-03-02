import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import CartModal from "./CartModal";
import NotificationsModal from "./NotificationsModal";
import ProfileModal from "./ProfileModal";
import AccessibilityPanel from "./AccessibilityPanel";

export default function Header() {
  const { currentUser, logout, notifications } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { cart } = useAuth();

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const initTranslate = () => {
      if (window.google && window.google.translate) {
        try {
          new window.google.translate.TranslateElement(
            { pageLanguage: "es", autoDisplay: false },
            "google_translate_element"
          );
        } catch (e) {}
      }
    };

    if (window.google && window.google.translate) {
      initTranslate();
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.translate) {
          initTranslate();
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1>🕳️ La Cueva del Multiverso</h1>
          <p>Reliquias legendarias de series, películas, anime y videojuegos</p>
          <div id="google_translate_element"></div>
        </div>

        <div className="user-section">
          <div className="accessibility-header-slot">
            <AccessibilityPanel />
          </div>

          {currentUser?.type === "admin" && (
            <div className="notification-section">
              <button className="notification-btn" onClick={() => setShowNotifications(true)}>
                🔔 Notificaciones
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
              </button>
            </div>
          )}

          {!currentUser ? (
            <button className="auth-btn" onClick={() => setShowAuth(true)}>
              Iniciar Sesión
            </button>
          ) : (
            <div className="user-info">
              <span style={{ cursor: "pointer" }} onClick={() => setShowProfile(true)}>
                👤 {currentUser.name}
              </span>
              <button className="logout-btn" onClick={logout}>
                Cerrar Sesión
              </button>
            </div>
          )}

          {currentUser && (
            <div className="cart-section">
              <button className="cart-btn" onClick={() => setShowCart(true)}>
                🛒 Carrito
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </button>
            </div>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCart && <CartModal onClose={() => setShowCart(false)} />}
      {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}