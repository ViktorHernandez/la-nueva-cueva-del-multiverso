require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Usuario } = require("./models");

async function migratePasswords() {
  try {
    console.log("🔄 Iniciando migración de contraseñas...\n");
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB Atlas\n");

    const users = await Usuario.find({});
    console.log(`📊 Encontrados ${users.length} usuarios\n`);

    let migrated = 0;
    let alreadyHashed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          console.log(`⏭️  ${user.email} - Ya está hasheada`);
          alreadyHashed++;
          continue;
        }

        const originalPassword = user.password;
        
        const hashedPassword = await bcrypt.hash(originalPassword, 10);
        
        user.password = hashedPassword;
        await user.save();
        
        console.log(`✅ ${user.email} - Migrada`);
        console.log(`   Original: ${originalPassword}`);
        console.log(`   Hash: ${hashedPassword.substring(0, 30)}...\n`);
        
        migrated++;
      } catch (err) {
        console.error(`❌ Error migrando ${user.email}:`, err.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN DE MIGRACIÓN:");
    console.log("=".repeat(50));
    console.log(`✅ Contraseñas migradas: ${migrated}`);
    console.log(`⏭️  Ya estaban hasheadas: ${alreadyHashed}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total de usuarios: ${users.length}`);
    console.log("=".repeat(50) + "\n");

    if (migrated > 0) {
      console.log("🎉 ¡Migración completada exitosamente!");
      console.log("💡 Ahora puedes hacer login con las mismas contraseñas de antes.\n");
    } else if (alreadyHashed === users.length) {
      console.log("ℹ️  Todas las contraseñas ya estaban hasheadas.");
      console.log("💡 No se requirió migración.\n");
    }

    await mongoose.disconnect();
    console.log("👋 Desconectado de MongoDB");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR FATAL:", error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log("🔐 MIGRACIÓN DE CONTRASEÑAS A BCRYPT");
console.log("=".repeat(50) + "\n");

migratePasswords();