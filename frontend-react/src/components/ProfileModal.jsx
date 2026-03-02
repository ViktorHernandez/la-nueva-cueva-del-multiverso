import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProfileModal({ onClose }) {
  const { currentUser, setCurrentUser, getAuthHeaders, API_BASE, checkSession } = useAuth();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password && password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const payload = { name, phone };
    if (password) payload.password = password;
    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error);
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
      alert("✅ Perfil actualizado exitosamente");
      onClose();
    } catch {
      setError("Error al conectar con el servidor");
    }
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="auth-container">
          <h2>👤 Información del Perfil</h2>
          {error && <p style={{ color: "red" }}>❌ {error}</p>}
          <form onSubmit={handleSubmit} autoComplete="on">
            <label>Nombre completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            <label>Correo electrónico</label>
            <input type="email" value={currentUser?.email || ""} readOnly style={{ opacity: 0.6 }} />
            <label>Número de teléfono</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
            <label>Contraseña</label>
            <input type="password" placeholder="Nueva contraseña (opcional)" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <label>Confirmar contraseña</label>
            <input type="password" placeholder="Confirmar nueva contraseña" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            <button type="submit">Guardar cambios</button>
          </form>
        </div>
      </div>
    </div>
  );
}
