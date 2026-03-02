import React, { useState, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";

const API_BASE = process.env.REACT_APP_API_URL || "/api";

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState("none");

  const { screenReaderActive, setScreenReaderActive, speechRate, setSpeechRate } =
    useAccessibility();

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    fetch(`${API_BASE}/accessibility`)
      .then((r) => r.json())
      .then((data) => {
        setScreenReaderActive(data.screenReader || false);
        setSpeechRate(data.speechRate || 1);
        setColorFilter(data.colorFilter || "none");
        applyFilter(data.colorFilter || "none");
      })
      .catch(() => {});
  }, []);

  function applyFilter(filter) {
    document.body.classList.remove(
      "filter-protanopia",
      "filter-deuteranopia",
      "filter-tritanopia",
      "filter-achromatopsia",
      "filter-high-contrast"
    );
    if (filter !== "none") document.body.classList.add(`filter-${filter}`);
  }

  async function save(updates) {
    try {
      await fetch(`${API_BASE}/accessibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {}
  }

  function toggleScreenReader() {
    const next = !screenReaderActive;
    setScreenReaderActive(next);
    save({ screenReader: next, speechRate, colorFilter });

    window.speechSynthesis.cancel();
    const msg = next ? "Lector de pantalla activado" : "Lector de pantalla desactivado";
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = "es-ES";
    u.rate = speechRate;
    window.speechSynthesis.speak(u);
  }

  function handleRateChange(e) {
    const rate = parseFloat(e.target.value);
    setSpeechRate(rate);
    save({ screenReader: screenReaderActive, speechRate: rate, colorFilter });
  }

  function handleColorFilter(e) {
    const filter = e.target.value;
    setColorFilter(filter);
    applyFilter(filter);
    save({ screenReader: screenReaderActive, speechRate, colorFilter: filter });
  }

  return (
    <div className="accessibility-panel">
      <button
        className="accessibility-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir panel de accesibilidad"
      >
        ♿ Accesibilidad
      </button>

      {open && (
        <div className="accessibility-menu">
          <div className="accessibility-section">
            <h4>🔊 Lector de Pantalla</h4>
            <button
              className="accessibility-option"
              onClick={toggleScreenReader}
              aria-label={screenReaderActive ? "Desactivar lector de pantalla" : "Activar lector de pantalla"}
            >
              {screenReaderActive ? "⏸️ Desactivar" : "▶️ Activar"}
            </button>
            {screenReaderActive && (
              <div className="screen-reader-controls">
                <label>Velocidad:</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechRate}
                  onChange={handleRateChange}
                  aria-label={`Velocidad de lectura: ${speechRate}x`}
                />
                <span>{speechRate}x</span>
              </div>
            )}
          </div>

          <div className="accessibility-section">
            <h4>🎨 Filtros de Daltonismo</h4>
            <select
              className="accessibility-select"
              value={colorFilter}
              onChange={handleColorFilter}
              aria-label="Seleccionar filtro de daltonismo"
            >
              <option value="none">Sin filtro</option>
              <option value="protanopia">Protanopia (sin rojo)</option>
              <option value="deuteranopia">Deuteranopia (sin verde)</option>
              <option value="tritanopia">Tritanopia (sin azul)</option>
              <option value="achromatopsia">Acromatopsia (sin color)</option>
              <option value="high-contrast">Alto Contraste</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}