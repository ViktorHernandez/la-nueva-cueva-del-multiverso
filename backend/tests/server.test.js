const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = "test_secret_key";
  process.env.SESSION_SECRET = "test_session_secret";
  process.env.GOOGLE_CLIENT_ID = "test_google_client_id";
  process.env.GOOGLE_CLIENT_SECRET = "test_google_client_secret";

  app = require("../server");
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Health Check", () => {
  test("GET /api/health debe retornar status OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body).toHaveProperty("timestamp");
  });
});

describe("Autenticación - Registro", () => {
  test("POST /api/users/register debe crear un usuario nuevo", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        name: "Usuario Test",
        email: "test@test.com",
        phone: "1234567890",
        password: "password123",
        registrationDate: "01/03/2026",
        registrationTime: "10:00:00",
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("test@test.com");
    expect(res.body.user).not.toHaveProperty("password");
  });

  test("POST /api/users/register debe rechazar email duplicado", async () => {
    await request(app).post("/api/users/register").send({
      name: "Usuario Test",
      email: "test@test.com",
      phone: "1234567890",
      password: "password123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    const res = await request(app).post("/api/users/register").send({
      name: "Usuario Test 2",
      email: "test@test.com",
      phone: "9876543210",
      password: "password456",
      registrationDate: "01/03/2026",
      registrationTime: "10:01:00",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/users/register debe requerir todos los campos", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Solo nombre",
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("Autenticación - Login", () => {
  beforeEach(async () => {
    await request(app).post("/api/users/register").send({
      name: "Usuario Test",
      email: "test@test.com",
      phone: "1234567890",
      password: "password123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
  });

  test("POST /api/users/login debe retornar token con credenciales válidas", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@test.com", password: "password123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("test@test.com");
  });

  test("POST /api/users/login debe rechazar contraseña incorrecta", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@test.com", password: "wrongpassword" });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/users/login debe rechazar usuario inexistente", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "noexiste@test.com", password: "password123" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Verificación de Token", () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Usuario Test",
      email: "test@test.com",
      phone: "1234567890",
      password: "password123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    token = res.body.token;
  });

  test("GET /api/verify-token debe validar token correcto", async () => {
    const res = await request(app)
      .get("/api/verify-token")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  test("GET /api/verify-token debe rechazar token inválido", async () => {
    const res = await request(app)
      .get("/api/verify-token")
      .set("Authorization", "Bearer tokeninvalido");
    expect(res.statusCode).toBe(403);
  });

  test("GET /api/verify-token debe rechazar petición sin token", async () => {
    const res = await request(app).get("/api/verify-token");
    expect(res.statusCode).toBe(401);
  });
});

describe("Productos - Rutas Públicas", () => {
  test("GET /api/products debe retornar lista de productos", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Productos - Rutas de Administrador", () => {
  let adminToken;
  beforeEach(async () => {
    const regRes = await request(app).post("/api/users/register").send({
      name: "Admin Test",
      email: "admin@test.com",
      phone: "1234567890",
      password: "admin123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    adminToken = regRes.body.token;

    const { Usuario } = require("../models");
    await Usuario.findOneAndUpdate({ email: "admin@test.com" }, { type: "admin" });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email: "admin@test.com", password: "admin123" });
    adminToken = loginRes.body.token;

    const { Categoria } = require("../models");
    await Categoria.create({ nombre: "peliculas", emoji: "🎬" });
  });

  test("POST /api/products debe crear producto con token de admin", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Varita de Harry Potter",
        description: "Réplica oficial",
        fullDescription: "Varita de acebo con núcleo de pluma de fénix.",
        category: "peliculas",
        price: "$800 MXN",
        seller: "Ollivanders",
        image: "harry.png",
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Varita de Harry Potter");
  });

  test("POST /api/products debe rechazar sin token de admin", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ title: "Producto sin auth", category: "peliculas", price: "$100 MXN" });
    expect(res.statusCode).toBe(401);
  });

  test("DELETE /api/products/:id debe eliminar producto existente", async () => {
    const createRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Producto a Eliminar",
        description: "Desc",
        fullDescription: "Descripcion completa",
        category: "peliculas",
        price: "$500 MXN",
        seller: "Test Seller",
        image: "test.png",
      });
    const productId = createRes.body._id;

    const deleteRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toHaveProperty("message");
  });
});

describe("Categorías", () => {
  test("GET /api/categories debe retornar categorías", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Perfil de Usuario", () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Usuario Test",
      email: "test@test.com",
      phone: "1234567890",
      password: "password123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    token = res.body.token;
  });

  test("GET /api/users/profile debe retornar perfil con token válido", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe("test@test.com");
    expect(res.body).not.toHaveProperty("password");
  });

  test("PUT /api/users/profile debe actualizar nombre y teléfono", async () => {
    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nombre Actualizado", phone: "9999999999" });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.name).toBe("Nombre Actualizado");
  });
});

describe("Carrito", () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "Usuario Test",
      email: "test@test.com",
      phone: "1234567890",
      password: "password123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    token = res.body.token;
  });

  test("GET /api/cart debe retornar carrito vacío inicialmente", async () => {
    const res = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/cart debe rechazar sin autenticación", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.statusCode).toBe(401);
  });
});

describe("Contactos", () => {
  test("GET /api/contacts debe retornar lista de contactos", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/contacts debe crear un nuevo contacto", async () => {
    const res = await request(app).post("/api/contacts").send({
      nombre: "Juan Test",
      correo: "juan@test.com",
      mensaje: "Mensaje de prueba",
      fecha: "01/03/2026",
      hora: "10:00",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).toBe("Juan Test");
  });
});

describe("Middleware - Rutas Inexistentes", () => {
  test("GET de ruta inexistente debe retornar 404", async () => {
    const res = await request(app).get("/api/ruta-que-no-existe");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Administración de Usuarios", () => {
  let adminToken;
  let userEmail;

  beforeEach(async () => {
    const regRes = await request(app).post("/api/users/register").send({
      name: "Admin Test",
      email: "admin@test.com",
      phone: "1234567890",
      password: "admin123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });

    const { Usuario } = require("../models");
    await Usuario.findOneAndUpdate({ email: "admin@test.com" }, { type: "admin" });

    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email: "admin@test.com", password: "admin123" });
    adminToken = loginRes.body.token;

    await request(app).post("/api/users/register").send({
      name: "User Normal",
      email: "user@test.com",
      phone: "9876543210",
      password: "user123",
      registrationDate: "01/03/2026",
      registrationTime: "10:00:00",
    });
    userEmail = "user@test.com";
  });

  test("GET /api/users debe retornar lista de usuarios para admin", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("DELETE /api/users/:email debe eliminar usuario", async () => {
    const res = await request(app)
      .delete(`/api/users/${userEmail}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});

describe("Historial de Vistas", () => {
  test("GET /api/lastviewed debe retornar historial", async () => {
    const res = await request(app).get("/api/lastviewed");
    expect(res.statusCode).toBe(200);
    expect(typeof res.body).toBe("object");
  });

  test("DELETE /api/lastviewed debe limpiar el historial", async () => {
    const res = await request(app).delete("/api/lastviewed");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});

describe("Accesibilidad", () => {
  test("GET /api/accessibility debe retornar configuración", async () => {
    const res = await request(app).get("/api/accessibility");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("screenReader");
    expect(res.body).toHaveProperty("speechRate");
    expect(res.body).toHaveProperty("colorFilter");
  });

  test("PUT /api/accessibility debe actualizar configuración", async () => {
    const res = await request(app)
      .put("/api/accessibility")
      .send({ screenReader: true, speechRate: 1.5, colorFilter: "protanopia" });
    expect(res.statusCode).toBe(200);
    expect(res.body.colorFilter).toBe("protanopia");
  });
});