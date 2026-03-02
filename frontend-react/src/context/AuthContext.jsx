import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API_BASE = "/api";

function getBackendURL() {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }
  return window.location.origin;
}

const BACKEND_URL = getBackendURL();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  function getAuthToken() {
    return localStorage.getItem("authToken");
  }

  function setAuthToken(token) {
    localStorage.setItem("authToken", token);
  }

  function removeAuthToken() {
    localStorage.removeItem("authToken");
  }

  function getAuthHeaders() {
    const token = getAuthToken();
    if (token) {
      return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    }
    return { "Content-Type": "application/json" };
  }

  function fixImagePath(image) {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    const clean = image.startsWith("/") ? image.slice(1) : image;
    const parts = clean.split("/");
    const encoded = parts.map((p) => encodeURIComponent(p)).join("/");
    return "/" + encoded;
  }

  const loadCart = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cart`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCart(data.map((item) => ({ ...item, image: fixImagePath(item.image) })));
      }
    } catch {
      setCart([]);
    }
  }, []);

  const saveCart = useCallback(async (newCart) => {
    try {
      await fetch(`${API_BASE}/cart`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(newCart),
      });
    } catch {}
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  const checkSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/verify-token`, { headers: getAuthHeaders() });
      if (!res.ok) {
        removeAuthToken();
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const profileRes = await fetch(`${API_BASE}/users/profile`, { headers: getAuthHeaders() });
      if (profileRes.ok) {
        const user = await profileRes.json();
        setCurrentUser(user);
        await loadCart();
        if (user.type === "admin") {
          await loadNotifications();
        }
      } else {
        removeAuthToken();
        setCurrentUser(null);
      }
    } catch {
      removeAuthToken();
      setCurrentUser(null);
    }
    setLoading(false);
  }, [loadCart, loadNotifications]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get("googleAuth");
    const token = params.get("token");
    const name = params.get("name");

    if (googleAuth === "success" && token) {
      setAuthToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      alert(`✅ Bienvenido ${decodeURIComponent(name)}! Has iniciado sesión con Google.`);
    } else if (googleAuth === "failed") {
      alert("❌ Error al iniciar sesión con Google. Intenta nuevamente.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkSession();
  }, [checkSession]);

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Correo o contraseña incorrectos");
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    setCurrentUser(data.user);
    await loadCart();
    if (data.user.type === "admin") await loadNotifications();
    return data.user;
  }

  async function register(name, email, phone, password, registrationDate, registrationTime) {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, registrationDate, registrationTime }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    return data;
  }

  function logout() {
    removeAuthToken();
    setCurrentUser(null);
    setCart([]);
    setNotifications([]);
  }

  function loginWithGoogle() {
    window.location.href = `${BACKEND_URL}/auth/google`;
  }

  async function addToCart(product) {
    if (!currentUser) return false;
    const newCart = [...cart];
    const existing = newCart.find((i) => i.title === product.title);
    if (existing) {
      existing.quantity += 1;
    } else {
      newCart.push({ ...product, image: fixImagePath(product.image), quantity: 1 });
    }
    setCart(newCart);
    await saveCart(newCart);
    return true;
  }

  async function updateCartQuantity(index, change) {
    const newCart = [...cart];
    newCart[index].quantity += change;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
    await saveCart(newCart);
  }

  async function removeFromCart(index) {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    await saveCart(newCart);
  }

  async function clearCart() {
    setCart([]);
    await saveCart([]);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        cart,
        setCart,
        notifications,
        setNotifications,
        loading,
        login,
        logout,
        register,
        loginWithGoogle,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        saveCart,
        loadNotifications,
        getAuthHeaders,
        checkSession,
        API_BASE,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}