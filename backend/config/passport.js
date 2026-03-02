const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_super_segura_cambiar_en_produccion";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
      passReqToCallback: true
    },
    async function(request, accessToken, refreshToken, profile, done) {
      try {
        let user = await Usuario.findOne({ email: profile.emails[0].value });

        if (!user) {
          const now = new Date();
          user = await Usuario.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            phone: "", 
            password: "google_oauth_no_password",
            type: "user",
            googleId: profile.id,
            registrationDate: now.toLocaleDateString('es-ES'),
            registrationTime: now.toLocaleTimeString('es-ES', { hour12: false })
          });
          console.log(`✅ Nuevo usuario creado vía Google: ${user.email}`);
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
          console.log(`✅ Cuenta vinculada con Google: ${user.email}`);
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

        return done(null, { user, token });
      } catch (error) {
        console.error("❌ Error en Google OAuth:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser(function(data, done) {
  done(null, data);
});

passport.deserializeUser(function(data, done) {
  done(null, data);
});

module.exports = passport;