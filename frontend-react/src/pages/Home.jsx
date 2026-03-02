import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import ContactSection from "../components/ContactSection";
import AdminPanel from "../components/AdminPanel";

const PRODUCTS_PER_PAGE = 12;
const CATEGORY_EMOJI = { series: "📺", peliculas: "🎬", anime: "🍥", videojuegos: "🎮" };
const TITLES_MAP = {
  all: "🌌 Todas las Reliquias",
  series: "📺 Reliquias de Series",
  peliculas: "🎬 Reliquias de Películas",
  anime: "🍥 Reliquias de Anime",
  videojuegos: "🎮 Reliquias de Videojuegos",
};

function fixImagePath(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  const clean = image.startsWith("/") ? image.slice(1) : image;
  const parts = clean.split("/");
  const encoded = parts.map((p) => encodeURIComponent(p)).join("/");
  return "/" + encoded;
}

export default function Home() {
  const { currentUser, addToCart } = useAuth();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastViewed, setLastViewed] = useState({});
  const [showAdmin, setShowAdmin] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.map((p) => ({ ...p, image: fixImagePath(p.image) }))))
      .catch(() => {});

    fetch("/api/lastviewed")
      .then((r) => r.json())
      .then((data) => {
        const fixed = {};
        Object.keys(data).forEach((cat) => {
          fixed[cat] = data[cat].map((item) => ({ ...item, image: fixImagePath(item.image) }));
        });
        setLastViewed(fixed);
      })
      .catch(() => {});

    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      const play = () => audioRef.current?.play().catch(() => {});
      document.addEventListener("click", play, { once: true });
      document.addEventListener("keydown", play, { once: true });
    }
  }, []);

  async function handleProductClick(product) {
    setSelectedProduct(product);
    const category = product.category || "otros";
    try {
      const res = await fetch("/api/lastviewed");
      const history = res.ok ? await res.json() : {};
      if (!history[category]) history[category] = [];
      history[category] = history[category].filter((i) => i.title !== product.title);
      history[category].unshift(product);
      if (history[category].length > 5) history[category].pop();
      await fetch("/api/lastviewed", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(history),
      });
      setLastViewed(history);
    } catch {}
  }

  async function handleClearHistory() {
    try {
      await fetch("/api/lastviewed", { method: "DELETE" });
    } catch {}
    setLastViewed({});
  }

  const filtered = products.filter((p) => filter === "all" || p.category === filter);
  const visible = filtered.slice(0, PRODUCTS_PER_PAGE * page);
  const hasMore = filtered.length > visible.length;

  const featuredProducts =
    products.length > 0 ? [...products].sort(() => 0.5 - Math.random()).slice(0, 4) : [];

  const categoryCounts = products.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    { all: products.length }
  );

  return (
    <>
      <Header />

      {currentUser?.type === "admin" && (
        <div style={{ textAlign: "center", padding: "10px" }}>
          <button className="admin-btn" onClick={() => setShowAdmin(true)}>
            👑 Panel Admin
          </button>
        </div>
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {featuredProducts.length > 0 && (
        <section className="missions" style={{ padding: 0, maxWidth: "100%" }}>
          <div className="apple-showcase">
            {featuredProducts[0] && (
              <div className="apple-hero dark-hero apple-reveal visible">
                <div className="apple-hero-text">
                  <h2>{featuredProducts[0].title}</h2>
                  <p>{featuredProducts[0].description?.substring(0, 60)}…</p>
                  <div className="apple-links">
                    <button className="btn-blue" onClick={() => handleProductClick(featuredProducts[0])}>
                      Ver detalles
                    </button>
                    <button
                      className="btn-hollow"
                      onClick={() => {
                        addToCart(featuredProducts[0]);
                        alert(`✅ ${featuredProducts[0].title} agregado al carrito`);
                      }}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
                <img src={featuredProducts[0].image} alt={featuredProducts[0].title} />
              </div>
            )}
            {featuredProducts[1] && (
              <div className="apple-hero light-hero apple-reveal visible">
                <div className="apple-hero-text">
                  <h2>
                    <span style={{ color: "#0071e3" }}>Nuevo.</span> {featuredProducts[1].title}
                  </h2>
                  <p>{featuredProducts[1].description?.substring(0, 60)}…</p>
                  <div className="apple-links">
                    <button className="btn-blue" onClick={() => handleProductClick(featuredProducts[1])}>
                      Ver detalles
                    </button>
                    <button
                      className="btn-hollow"
                      onClick={() => {
                        addToCart(featuredProducts[1]);
                        alert(`✅ ${featuredProducts[1].title} agregado al carrito`);
                      }}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
                <img src={featuredProducts[1].image} alt={featuredProducts[1].title} />
              </div>
            )}
            {featuredProducts[2] && featuredProducts[3] && (
              <div className="apple-split">
                <div
                  className="apple-split-card light-hero apple-reveal visible"
                  style={{ background: "#fbfbfd" }}
                >
                  <div className="apple-hero-text">
                    <h2 style={{ fontSize: 38 }}>{featuredProducts[2].title}</h2>
                    <p style={{ fontSize: 18 }}>{featuredProducts[2].description?.substring(0, 50)}…</p>
                    <div className="apple-links">
                      <button className="btn-blue" onClick={() => handleProductClick(featuredProducts[2])}>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                  <img src={featuredProducts[2].image} alt={featuredProducts[2].title} />
                </div>
                <div
                  className="apple-split-card dark-hero apple-reveal visible"
                  style={{ background: "#000" }}
                >
                  <div className="apple-hero-text">
                    <h2 style={{ fontSize: 38 }}>{featuredProducts[3].title}</h2>
                    <p style={{ fontSize: 18 }}>{featuredProducts[3].description?.substring(0, 50)}…</p>
                    <div className="apple-links">
                      <button className="btn-blue" onClick={() => handleProductClick(featuredProducts[3])}>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                  <img src={featuredProducts[3].image} alt={featuredProducts[3].title} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="filters">
        {["all", "series", "peliculas", "anime", "videojuegos"].map((f) => (
          <button
            key={f}
            data-filter={f}
            className={filter === f ? "active" : ""}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {f === "all"
              ? `🌌 Todo (${categoryCounts.all || 0})`
              : `${CATEGORY_EMOJI[f]} ${f.charAt(0).toUpperCase() + f.slice(1)} (${categoryCounts[f] || 0})`}
          </button>
        ))}
      </div>

      <section className="missions">
        <h2>{TITLES_MAP[filter]}</h2>
        <div className="missions-board">
          {visible.map((p) => (
            <ProductCard key={p._id} product={p} onClick={handleProductClick} />
          ))}
        </div>
        {hasMore && (
          <button
            className="load-more-btn"
            style={{ display: "block", margin: "20px auto" }}
            onClick={() => setPage((v) => v + 1)}
          >
            Ver más productos
          </button>
        )}
      </section>

      {Object.keys(lastViewed).some((cat) => lastViewed[cat]?.length > 0) && (
        <section className="missions">
          <h2>🧠 Últimos vistos</h2>
          <div id="lastViewedBoard" className="missions-board">
            {Object.keys(lastViewed).map((cat) => {
              if (!lastViewed[cat]?.length) return null;
              return (
                <div key={cat} style={{ width: "100%", marginBottom: 40 }}>
                  <h4 style={{ textAlign: "left", paddingLeft: 0, marginBottom: 16, fontWeight: 600 }}>
                    {CATEGORY_EMOJI[cat] || "📂"} {cat.toUpperCase()}
                  </h4>
                  <div className="apple-carousel-container">
                    {lastViewed[cat].map((item, i) => (
                      <div
                        key={i}
                        className="mission-card apple-reveal visible"
                        onClick={() => handleProductClick(item)}
                      >
                        <img src={item.image} alt={item.title} />
                        <h3>{item.title}</h3>
                        <p>Visto recientemente</p>
                        <span>{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button className="clear-history" onClick={handleClearHistory}>
        🗑️ Limpiar historial
      </button>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <section className="social-links">
        <h2>🌐 Síguenos en el Multiverso</h2>
        <div className="social-icons">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer">📘 Facebook</a>
          <a href="https://wa.me/5215629727628" target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer">🐦 Twitter / X</a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">📸 Instagram</a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer">🎵 TikTok</a>
          <a href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank" rel="noreferrer">▶️ YouTube</a>
        </div>
      </section>

      <ContactSection />

      <footer className="footer">
        <p>© 2026 La Cueva del Multiverso</p>
      </footer>

      {showScrollTop && (
        <button
          id="scrollTopBtn"
          aria-label="Volver arriba"
          className="show"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ⬆️
        </button>
      )}

      <audio ref={audioRef} loop>
        <source src="/MenuMii.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}