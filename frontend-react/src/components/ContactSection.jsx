import React, { useState, useEffect } from "react";

async function getTime() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://timeapi.bio/timeapi/time/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region: "Europe/Madrid", fields: "year,month,day,hour,minute" }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    return {
      fecha: `${data.year}-${data.month}-${data.day}`,
      hora: `${data.hour}:${data.minute}`,
    };
  } catch {
    const now = new Date();
    const opts = { timeZone: "Europe/Madrid" };
    return {
      fecha: now.toLocaleDateString("es-ES", { ...opts, year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-"),
      hora: now.toLocaleTimeString("es-ES", { ...opts, hour12: false, hour: "2-digit", minute: "2-digit" }),
    };
  }
}

export default function ContactSection() {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const { fecha, hora } = await getTime();
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, mensaje, fecha, hora }),
      });
      if (res.ok) {
        const created = await res.json();
        setContacts((prev) => [...prev, created]);
        setNombre("");
        setCorreo("");
        setMensaje("");
      }
    } catch {}
  }

  async function handleDelete() {
    if (selected === null) { alert("⚠️ Selecciona un contacto para eliminar."); return; }
    const contact = contacts[selected];
    if (contact?._id) {
      try {
        await fetch(`/api/contacts/${contact._id}`, { method: "DELETE" });
      } catch {}
    }
    setContacts((prev) => prev.filter((_, i) => i !== selected));
    setSelected(null);
    alert("✅ Contacto eliminado correctamente.");
  }

  return (
    <section className="missions contact-section">
      <h2>📨 Contacto</h2>
      <form className="contact-form" onSubmit={handleSubmit}>
        <input type="text" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input type="email" placeholder="Correo electrónico" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <textarea placeholder="Escribe tu mensaje..." value={mensaje} onChange={(e) => setMensaje(e.target.value)} required />
        <button type="submit">Enviar mensaje</button>
      </form>

      <h2>📋 Últimos contactos</h2>
      <div className="contact-table-container">
        <table className="contact-table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Mensaje</th><th>Hora</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {contacts.map((c, i) => (
              <tr key={c._id || i} className={selected === i ? "selected" : ""} onClick={() => setSelected(i)}>
                <td>{c.nombre}</td><td>{c.correo}</td><td>{c.mensaje}</td><td>{c.hora}</td><td>{c.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="delete-container">
          <button onClick={handleDelete}>Eliminar contacto</button>
        </div>
      </div>
    </section>
  );
}
