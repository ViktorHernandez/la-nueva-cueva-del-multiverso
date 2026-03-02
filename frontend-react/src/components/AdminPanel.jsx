import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const CATEGORY_EMOJI = { peliculas: "🎬", series: "📺", anime: "🍥", videojuegos: "🎮" };

function ProductForm({ product, onSave, onClose }) {
  const { getAuthHeaders, API_BASE } = useAuth();
  const [title, setTitle] = useState(product?.title || "");
  const [description, setDescription] = useState(product?.description || "");
  const [fullDescription, setFullDescription] = useState(product?.fullDescription || "");
  const [category, setCategory] = useState(product?.category || "peliculas");
  const [price, setPrice] = useState(product ? product.price.replace(/[^0-9]/g, "") : "");
  const [seller, setSeller] = useState(product?.seller || "");
  const [image, setImage] = useState(product?.image || "");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = { title, description, fullDescription, category, price: `$${price} MXN`, seller, image };
    try {
      if (product) {
        await fetch(`${API_BASE}/products/${product._id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(data) });
        alert("✅ Producto actualizado exitosamente");
      } else {
        await fetch(`${API_BASE}/products`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(data) });
        alert("✅ Producto añadido exitosamente");
      }
      onSave();
    } catch { alert("❌ Error al conectar con el servidor"); }
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="auth-container">
          <h2>{product ? "✏️ Editar Producto" : "➕ Añadir Producto"}</h2>
          <form onSubmit={handleSubmit}>
            <label>Título del producto</label>
            <input type="text" placeholder="Ej: Varita de Harry Potter" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label>Descripción corta</label>
            <input type="text" placeholder="Ej: Réplica oficial" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <label>Descripción completa</label>
            <textarea placeholder="Descripción detallada" value={fullDescription} onChange={(e) => setFullDescription(e.target.value)} required />
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="peliculas">🎬 Películas</option>
              <option value="series">📺 Series</option>
              <option value="anime">🍥 Anime</option>
              <option value="videojuegos">🎮 Videojuegos</option>
            </select>
            <label>Precio (MXN)</label>
            <input type="number" placeholder="800" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <label>Vendedor</label>
            <input type="text" placeholder="Ej: Ollivanders" value={seller} onChange={(e) => setSeller(e.target.value)} required />
            <label>Nombre de imagen</label>
            <input type="text" placeholder="Ej: harry.png" value={image} onChange={(e) => setImage(e.target.value)} required />
            <button type="submit">{product ? "Actualizar Producto" : "Guardar Producto"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditUserForm({ user, onSave, onClose }) {
  const { getAuthHeaders, API_BASE, currentUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [password, setPassword] = useState("");
  const [type, setType] = useState(user.type || "user");

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { name, email, phone, type };
    if (password) payload.password = password;
    try {
      const res = await fetch(`${API_BASE}/users/${user.email}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); alert(`❌ ${err.error}`); return; }
      alert("✅ Usuario actualizado exitosamente");
      onSave();
    } catch { alert("❌ Error al conectar con el servidor"); }
  }

  return (
    <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <span className="auth-close" onClick={onClose}>&times;</span>
        <div className="auth-container">
          <h2>✏️ Editar Usuario</h2>
          <form onSubmit={handleSubmit}>
            <label>Nombre completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            <label>Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Número de teléfono</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <label>Nueva contraseña (opcional)</label>
            <input type="password" placeholder="Dejar vacío para no cambiar" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label>Tipo de usuario</label>
            <select value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="user">Usuario Normal</option>
              <option value="admin">Administrador</option>
            </select>
            <button type="submit">Guardar Cambios</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const { getAuthHeaders, API_BASE, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);

  useEffect(() => {
    loadUsers();
    loadProducts();
    loadStats();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
      if (res.ok) setUsers(await res.json());
    } catch {}
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) setProducts(await res.json());
    } catch {}
  }

  async function loadStats() {
    try {
      const [contactsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/contacts`),
        fetch(`${API_BASE}/lastviewed`),
      ]);
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (historyRes.ok) {
        const history = await historyRes.json();
        setHistoryCount(Object.values(history).flat().length);
      }
    } catch {}
  }

  async function deleteUser(email) {
    if (currentUser?.email === email) { alert("❌ No puedes eliminar tu propia cuenta"); return; }
    if (!window.confirm(`¿Estás seguro de eliminar al usuario con email: ${email}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${email}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) { alert("❌ No se pudo eliminar el usuario"); return; }
      alert("✅ Usuario eliminado exitosamente");
      loadUsers();
    } catch { alert("❌ Error al conectar con el servidor"); }
  }

  async function deleteProduct(id) {
    if (!window.confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await fetch(`${API_BASE}/products/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      alert("✅ Producto eliminado exitosamente");
      loadProducts();
    } catch { alert("❌ Error al conectar con el servidor"); }
  }

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredProducts = products.filter((p) =>
    `${p.title} ${p.category} ${p.seller}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  const admins = users.filter((u) => u.type === "admin");
  const categoryStats = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="auth-overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="auth-modal admin-modal">
          <span className="auth-close" onClick={onClose}>&times;</span>
          <div className="admin-container">
            <h2>👑 Panel de Administración</h2>
            <div className="admin-tabs">
              {["users", "products", "stats"].map((tab) => (
                <button key={tab} className={`admin-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                  {tab === "users" ? "👥 Usuarios" : tab === "products" ? "📦 Productos" : "📊 Estadísticas"}
                </button>
              ))}
            </div>

            {activeTab === "users" && (
              <div className="admin-tab-content active">
                <div className="admin-stats">
                  <div className="stat-card"><h3>{users.length}</h3><p>Total de Usuarios</p></div>
                  <div className="stat-card"><h3>{admins.length}</h3><p>Administradores</p></div>
                </div>
                <div className="users-table-container">
                  <h3>📋 Lista de Usuarios</h3>
                  <input type="text" placeholder="🔍 Buscar usuario..." className="search-input"
                    value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Contraseña</th>
                        <th>Tipo</th><th>Fecha Registro</th><th>Hora Registro</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.email}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.phone || "N/A"}</td>
                          <td>{user.password}</td>
                          <td><span className={user.type === "admin" ? "admin-badge" : "user-badge"}>
                            {user.type === "admin" ? "👑 Admin" : "👤 Usuario"}
                          </span></td>
                          <td>{user.registrationDate || "N/A"}</td>
                          <td>{user.registrationTime || "N/A"}</td>
                          <td className="action-buttons">
                            <button className="edit-btn" onClick={() => setEditingUser(user)}>✏️</button>
                            <button className="delete-btn" onClick={() => deleteUser(user.email)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="admin-tab-content active">
                <div className="product-actions">
                  <button className="admin-action-btn" onClick={() => { setEditingProduct(null); setShowProductForm(true); }}>
                    ➕ Añadir Producto
                  </button>
                </div>
                <div className="products-table-container">
                  <h3>📦 Lista de Productos</h3>
                  <input type="text" placeholder="🔍 Buscar producto..." className="search-input"
                    value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  <table className="admin-table">
                    <thead>
                      <tr><th>Imagen</th><th>Título</th><th>Categoría</th><th>Precio</th><th>Vendedor</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p._id}>
                          <td><img src={p.image} alt={p.title} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 5 }} /></td>
                          <td>{p.title}</td>
                          <td>{CATEGORY_EMOJI[p.category] || ""} {p.category}</td>
                          <td>{p.price}</td>
                          <td>{p.seller}</td>
                          <td className="action-buttons">
                            <button className="edit-btn" onClick={() => { setEditingProduct(p); setShowProductForm(true); }}>✏️</button>
                            <button className="delete-btn" onClick={() => deleteProduct(p._id)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "stats" && (
              <div className="admin-tab-content active">
                <div className="stats-grid">
                  <div className="stat-card-large">
                    <h3>📊 Estadísticas Generales</h3>
                    <div className="stat-item"><span>Total de Productos:</span><strong>{products.length}</strong></div>
                    <div className="stat-item">
                      <span>Productos por Categoría:</span>
                      <ul>
                        {Object.entries(categoryStats).map(([cat, count]) => (
                          <li key={cat}>{CATEGORY_EMOJI[cat]} {cat}: {count}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="stat-item"><span>Contactos Recibidos:</span><strong>{contacts.length}</strong></div>
                    <div className="stat-item"><span>Últimos Vistos (Histórico):</span><strong>{historyCount}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onSave={() => { setShowProductForm(false); loadProducts(); }}
          onClose={() => setShowProductForm(false)}
        />
      )}

      {editingUser && (
        <EditUserForm
          user={editingUser}
          onSave={() => { setEditingUser(null); loadUsers(); }}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  );
}
