require("dotenv").config();
const mongoose = require("mongoose");

const imageMap = {
  "Medallón del Brujo.png":        "medallon-del-brujo.png",
  "Medall#U00f3n del Brujo.png":   "medallon-del-brujo.png",
  "hoja oculta.png":               "hoja-oculta.png",
  "llave espada.png":              "llave-espada.png",
  "sable rojo.png":                "sable-rojo.png",
  "Espada sagrada de Hyrule.png":  "espada-sagrada-hyrule.png",
  "Zanpakuto en forma shikai.png": "zanpakuto-shikai.png",
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Conectado a MongoDB");
    const col = mongoose.connection.db.collection("productos");
    const productos = await col.find({}).toArray();
    console.log(`📦 Total productos: ${productos.length}`);

    let actualizados = 0;
    for (const p of productos) {
      const nuevo = imageMap[p.image];
      if (nuevo) {
        await col.updateOne({ _id: p._id }, { $set: { image: nuevo } });
        console.log(`  ✏️  ${p.title}: "${p.image}" → "${nuevo}"`);
        actualizados++;
      }
    }

    console.log(`\n✅ Migración completa. ${actualizados} productos actualizados.`);
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
