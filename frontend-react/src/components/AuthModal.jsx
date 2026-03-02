import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const EMAILJS_CONFIG = {
  SERVICE_ID: "service_da3m7qh",
  TEMPLATE_REGISTER: "template_0o5fuyq",
  TEMPLATE_LOGIN: "template_0q1nudg",
};

function isRealEmail(email) {
  const realDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "live.com", "msn.com", "protonmail.com"];
  const domain = email.split("@")[1];
  return realDomains.includes(domain);
}

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
    return {
      date: `${data.day}/${data.month}/${data.year}`,
      time: `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}:${String(data.second).padStart(2, "0")}`,
    };
  } catch {
    const now = new Date();
    return {
      date: now.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }),
      time: now.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour12: false }),
    };
  }
}

export default function AuthModal({ onClose }) {
  const { login, register, loginWithGoogle } = useAuth();
  const [view, setView] = useState("login");
  const [error, setError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const user = await login(loginEmail, loginPassword);
      if (isRealEmail(loginEmail) && window.emailjs) {
        const now = new Date();
        window.emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_LOGIN, {
          user_name: user.name,
          user_email: user.email,
          login_date: now.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }),
          login_time: now.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" }),
        }).catch(() => {});
      }
      alert(`✅ Bienvenido, ${user.name}!`);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    const { date, time } = await getTime();
    try {
      await register(regName, regEmail, regPhone, regPassword, date, time);
      if (isRealEmail(regEmail) && window.emailjs) {
        window.emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_REGISTER, {
          user_name: regName,
          user_email: regEmail,
          user_phone: regPhone,
          registration_date: date,
          registration_time: time,
        }).catch(() => {});
      }
      alert("✅ Cuenta creada exitosamente. Ahora puedes iniciar sesión.");
      setView("login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>

        {view === "login" ? (
          <div className="auth-container">
            <h2>🔐 Iniciar Sesión</h2>
            {error && <p style={{ color: "red" }}>❌ {error}</p>}
            <form onSubmit={handleLogin} autoComplete="on">
              <input type="email" placeholder="Correo electrónico" value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)} autoComplete="email" required />
              <input type="password" placeholder="Contraseña" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" required />
              <button type="submit">Entrar</button>
            </form>
            <div className="auth-divider"><span>O</span></div>
            <button onClick={loginWithGoogle} className="google-login-btn">
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continuar con Google
            </button>
            <p className="auth-switch">¿No tienes cuenta? <span onClick={() => setView("register")}>Regístrate aquí</span></p>
          </div>
        ) : (
          <div className="auth-container">
            <h2>📝 Crear Cuenta</h2>
            {error && <p style={{ color: "red" }}>❌ {error}</p>}
            <form onSubmit={handleRegister} autoComplete="on">
              <input type="text" placeholder="Nombre completo" value={regName}
                onChange={(e) => setRegName(e.target.value)} autoComplete="name" required />
              <input type="email" placeholder="Correo electrónico" value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" required />
              <input type="tel" placeholder="Número de teléfono" value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)} autoComplete="tel" required />
              <input type="password" placeholder="Contraseña" value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" required />
              <input type="password" placeholder="Confirmar contraseña" value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)} autoComplete="new-password" required />
              <button type="submit">Registrarse</button>
            </form>
            <p className="auth-switch">¿Ya tienes cuenta? <span onClick={() => setView("login")}>Inicia sesión aquí</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
