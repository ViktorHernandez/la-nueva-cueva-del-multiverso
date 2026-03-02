require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const passport = require("passport");

require("./config/passport");

const {
  Categoria,
  Usuario,
  Producto,
  Carrito,
  DetalleCarrito,
  Orden,
  DetalleOrden,
  Notificacion,
  HistorialVista,
  Contacto,
  Accessibility
} = require("./models");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_super_segura_cambiar_en_produccion";

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());


app.use(session({
  secret: process.env.SESSION_SECRET || "session_secret_cambiar_en_produccion",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido o expirado" });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: "Acceso denegado. Solo administradores" });
  }
  next();
};

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "🚀 Servidor de La Cueva del Multiverso funcionando correctamente con JWT y OAuth",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Conectada" : "Desconectada"
  });
});

app.get("/auth/google", 
  passport.authenticate("google", { 
    scope: ["email", "profile"] 
  })
);

app.get("/auth/google/callback", 
  passport.authenticate("google", { 
    failureRedirect: "/login-failed",
    session: false
  }),
  (req, res) => {
    const { user, token } = req.user;
    
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendURL}/?googleAuth=success&token=${token}&email=${user.email}&name=${user.name}&type=${user.type}`);
  }
);

app.get("/login-failed", (req, res) => {
  const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
  res.redirect(`${frontendURL}/?googleAuth=failed`);
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Conectado exitosamente a MongoDB Atlas");
    initializeCategories();
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB Atlas:", err.message);
    process.exit(1);
  });

async function initializeCategories() {
  const categories = [
    { nombre: "peliculas",    emoji: "🎬" },
    { nombre: "series",       emoji: "📺" },
    { nombre: "anime",        emoji: "🍥" },
    { nombre: "videojuegos",  emoji: "🎮" }
  ];

  for (const cat of categories) {
    const exists = await Categoria.findOne({ nombre: cat.nombre });
    if (!exists) {
      await Categoria.create(cat);
      console.log(`  ➕ Categoría creada: ${cat.emoji} ${cat.nombre}`);
    }
  }
}

app.get("/api/categories", async (req, res) => {
  try {
    const cats = await Categoria.find({});
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, phone, password, registrationDate, registrationTime } = req.body;

    const exists = await Usuario.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "El correo electrónico ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await Usuario.create({
      name, 
      email, 
      phone, 
      password: hashedPassword, 
      type: "user", 
      registrationDate, 
      registrationTime
    });

    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email, 
        type: newUser.type 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userData } = newUser.toObject();
    res.status(201).json({ 
      message: "Cuenta creada exitosamente", 
      user: userData,
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await Usuario.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    let isValidPassword = false;
    
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else if (user.password) {
      isValidPassword = (password === user.password);
      
      if (isValidPassword) {
        console.log(`⚠️  Migrando contraseña de ${email} a hash...`);
        user.password = await bcrypt.hash(password, 10);
        await user.save();
        console.log(`✅ Contraseña de ${email} migrada automáticamente`);
      }
    } else {
      return res.status(401).json({ error: "Esta cuenta usa autenticación con Google" });
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }

    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        type: user.type 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userData } = user.toObject();
    res.json({ 
      user: userData,
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/verify-token", authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    
    const user = await Usuario.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    
    const { password: _, ...userData } = user.toObject();
    res.json({ message: "Perfil actualizado exitosamente", user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await Usuario.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:oldEmail", authenticateToken, isAdmin, async (req, res) => {
  try {
    const oldEmail = req.params.oldEmail.toLowerCase();
    const { name, email: newEmail, phone, password, type } = req.body;

    const user = await Usuario.findOne({ email: oldEmail });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (newEmail && newEmail.toLowerCase() !== oldEmail) {
      const emailExists = await Usuario.findOne({ email: newEmail.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ error: "El correo electronico ya esta en uso" });
      }
    }

    if (name !== undefined)     user.name = name;
    if (newEmail !== undefined) user.email = newEmail.toLowerCase();
    if (phone !== undefined)    user.phone = phone;
    if (password)               user.password = await require("bcryptjs").hash(password, 10);
    if (type !== undefined)     user.type = type;

    await user.save();
    const { password: _, ...userData } = user.toObject();
    res.json({ message: "Usuario actualizado exitosamente", user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:email", authenticateToken, isAdmin, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const result = await Usuario.findOneAndDelete({ email });
    if (!result) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Producto.find({}).populate("categoriaId", "nombre emoji");
    const result = products.map(p => ({
      _id:             p._id,
      title:           p.title,
      description:     p.description,
      fullDescription: p.fullDescription,
      category:        p.categoriaId ? p.categoriaId.nombre : "",
      price:           p.price,
      seller:          p.seller,
      image:           p.image
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, fullDescription, category, price, seller, image } = req.body;

    const cat = await Categoria.findOne({ nombre: category });
    if (!cat) {
      return res.status(400).json({ error: `Categoria "${category}" no encontrada` });
    }

    const product = await Producto.create({
      title, description, fullDescription, categoriaId: cat._id, price, seller, image
    });

    res.status(201).json({
      _id: product._id, title: product.title,
      description: product.description, fullDescription: product.fullDescription,
      category, price: product.price, seller: product.seller, image: product.image
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category, ...rest } = req.body;
    const updateData = { ...rest };

    if (category) {
      const cat = await Categoria.findOne({ nombre: category });
      if (!cat) {
        return res.status(400).json({ error: `Categoria "${category}" no encontrada` });
      }
      updateData.categoriaId = cat._id;
    }

    const product = await Producto.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate("categoriaId", "nombre");

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      _id: product._id, title: product.title,
      description: product.description, fullDescription: product.fullDescription,
      category: product.categoriaId ? product.categoriaId.nombre : "",
      price: product.price, seller: product.seller, image: product.image
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await Producto.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado exitosamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cart", authenticateToken, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id);
    if (!user) return res.json([]);

    let carrito = await Carrito.findOne({ usuarioId: user._id, activo: true });
    if (!carrito) return res.json([]);

    const detalles = await DetalleCarrito.find({ carritoId: carrito._id })
      .populate("productoId");

    const items = detalles.map(d => ({
      _id:         d._id,
      productoId:  d.productoId ? d.productoId._id : null,
      title:       d.productoId ? d.productoId.title : "",
      description: d.productoId ? d.productoId.description : "",
      price:       d.precio,
      image:       d.productoId ? d.productoId.image : "",
      seller:      d.productoId ? d.productoId.seller : "",
      quantity:    d.cantidad
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cart", authenticateToken, async (req, res) => {
  try {
    const items = req.body;
    const user = await Usuario.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    let carrito = await Carrito.findOne({ usuarioId: user._id, activo: true });
    if (!carrito) {
      carrito = await Carrito.create({ usuarioId: user._id, activo: true });
    }

    await DetalleCarrito.deleteMany({ carritoId: carrito._id });

    for (const item of items) {
      const producto = await Producto.findOne({ title: item.title });
      if (producto) {
        await DetalleCarrito.create({
          carritoId:  carrito._id,
          productoId: producto._id,
          cantidad:   item.quantity,
          precio:     item.price
        });
      }
    }

    const detalles = await DetalleCarrito.find({ carritoId: carrito._id }).populate("productoId");
    const result = detalles.map(d => ({
      _id: d._id, productoId: d.productoId ? d.productoId._id : null,
      title: d.productoId ? d.productoId.title : "",
      description: d.productoId ? d.productoId.description : "",
      price: d.precio, image: d.productoId ? d.productoId.image : "",
      seller: d.productoId ? d.productoId.seller : "", quantity: d.cantidad
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart", authenticateToken, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id);
    if (!user) return res.json([]);

    const carrito = await Carrito.findOne({ usuarioId: user._id, activo: true });
    if (carrito) {
      await DetalleCarrito.deleteMany({ carritoId: carrito._id });
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { orderNumber, date, total, email, customer, items } = req.body;

    const orden = await Orden.create({
      usuarioId: req.user.id,
      orderNumber, date, total,
      email: email.toLowerCase(),
      customer
    });

    for (const item of items) {
      await DetalleOrden.create({
        ordenId:    orden._id,
        productoId: null,
        cantidad:   item.quantity,
        precio:     item.price,
        title:      item.title,
        seller:     item.seller
      });
    }

    res.status(201).json({ message: "Orden creada exitosamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/last", authenticateToken, async (req, res) => {
  try {
    const orden = await Orden.findOne({ usuarioId: req.user.id }).sort({ _id: -1 });
    if (!orden) {
      return res.status(404).json({ error: "No se encontro orden" });
    }

    const detalles = await DetalleOrden.find({ ordenId: orden._id });

    res.json({
      orderNumber: orden.orderNumber,
      date:        orden.date,
      total:       orden.total,
      email:       orden.email,
      customer:    orden.customer,
      items: detalles.map(d => ({
        title: d.title, price: d.precio, quantity: d.cantidad, seller: d.seller
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const notifications = await Notificacion.find({}).sort({ timestamp: -1 });
    const result = [];
    for (const notif of notifications) {
      let items = [];
      if (notif.ordenId) {
        const detalles = await DetalleOrden.find({ ordenId: notif.ordenId });
        items = detalles.map(d => ({ title: d.title, quantity: d.cantidad, price: d.precio }));
      }
      result.push({ ...notif.toObject(), items });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const { orderNumber, customerName, customerEmail, total, date } = req.body;

    const admin = await Usuario.findOne({ type: "admin" });
    if (!admin) {
      return res.status(500).json({ error: "No se encontro usuario administrador" });
    }

    const orden = await Orden.findOne({ orderNumber });

    const notification = await Notificacion.create({
      usuarioId:     admin._id,
      type:          "purchase",
      ordenId:       orden ? orden._id : null,
      orderNumber, customerName, customerEmail, total, date,
      read:          false,
      timestamp:     Date.now()
    });

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/markAllRead", authenticateToken, async (req, res) => {
  try {
    await Notificacion.updateMany({}, { read: true });
    res.json({ message: "Todas marcadas como leidas" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notifications/:id", authenticateToken, async (req, res) => {
  try {
    const notification = await Notificacion.findByIdAndUpdate(
      req.params.id, { read: true }, { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
  try {
    const result = await Notificacion.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Notificacion no encontrada" });
    }
    res.json({ message: "Notificacion eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notifications", authenticateToken, async (req, res) => {
  try {
    await Notificacion.deleteMany({});
    res.json({ message: "Todas las notificaciones eliminadas" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/lastviewed", async (req, res) => {
  try {
    const vistas = await HistorialVista.find({}).sort({ viewedAt: -1 });
    const grouped = {};
    vistas.forEach(v => {
      const cat = v.category || "otros";
      if (!grouped[cat]) grouped[cat] = [];
      const yaExiste = grouped[cat].find(item => item.title === v.title);
      if (!yaExiste && grouped[cat].length < 5) {
        grouped[cat].push({
          title: v.title, description: v.description,
          price: v.price, seller: v.seller,
          image: v.image, category: v.category
        });
      }
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/lastviewed", async (req, res) => {
  try {
    const history = req.body;

    for (const category of Object.keys(history)) {
      for (const item of history[category]) {
        const yaExiste = await HistorialVista.findOne({ title: item.title, category });
        if (!yaExiste) {
          const producto = await Producto.findOne({ title: item.title });
          await HistorialVista.create({
            usuarioId: null, productoId: producto ? producto._id : null,
            category, title: item.title, description: item.description,
            price: item.price, seller: item.seller, image: item.image, viewedAt: new Date()
          });
        } else {
          await HistorialVista.findOneAndUpdate(
            { title: item.title, category }, { viewedAt: new Date() }
          );
        }
      }
    }

    const allVistas = await HistorialVista.find({}).sort({ viewedAt: -1 });
    const grouped = {};
    allVistas.forEach(v => {
      const cat = v.category || "otros";
      if (!grouped[cat]) grouped[cat] = [];
      const yaExiste = grouped[cat].find(i => i.title === v.title);
      if (!yaExiste && grouped[cat].length < 5) {
        grouped[cat].push({
          title: v.title, description: v.description,
          price: v.price, seller: v.seller, image: v.image, category: v.category
        });
      }
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/lastviewed", async (req, res) => {
  try {
    await HistorialVista.deleteMany({});
    res.json({ message: "Historial limpiado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await Contacto.find({});
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const contact = await Contacto.create(req.body);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contacts/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await Contacto.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: "Contacto no encontrado" });
    }
    res.json({ message: "Contacto eliminado exitosamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/accessibility", async (req, res) => {
  try {
    const doc = await Accessibility.findOne({});
    res.json(doc || { screenReader: false, speechRate: 1, colorFilter: "none" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/accessibility", async (req, res) => {
  try {
    const { screenReader, speechRate, colorFilter } = req.body;
    const doc = await Accessibility.findOne({});
    if (doc) {
      if (screenReader !== undefined) doc.screenReader = screenReader;
      if (speechRate   !== undefined) doc.speechRate   = speechRate;
      if (colorFilter  !== undefined) doc.colorFilter  = colorFilter;
      await doc.save();
      res.json(doc);
    } else {
      const newDoc = await Accessibility.create({ screenReader, speechRate, colorFilter });
      res.json(newDoc);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend-react/build')));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
      res.sendFile(path.join(__dirname, '../frontend-react/build', 'index.html'));
    } else {
      res.status(404).json({
        error: "Ruta no encontrada",
        message: `La ruta ${req.method} ${req.path} no existe`
      });
    }
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ 
      error: "Ruta no encontrada", 
      message: `La ruta ${req.method} ${req.path} no existe` 
    });
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 JWT habilitado - Rutas protegidas activas`);
    console.log(`🔑 Google OAuth habilitado`);
  });
}

module.exports = app;