require('dotenv').config();
const express       = require('express');
const mongoose      = require('mongoose');
const session       = require('express-session');
const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Modelos
const User           = require('./models/user');

// Rutas
const authRouter       = require('./routes/auth');
const attendanceRouter = require('./routes/attendance');
const reportsRouter    = require('./routes/reports');
const adminRouter      = require('./routes/admin');

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✔️  MongoDB conectado'))
  .catch(err => console.error('❌ Error al conectar MongoDB:', err));

const app = express();

// Middlewares de Express
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Sesión y Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiame!',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const flash = require('connect-flash');
// …
app.use(session({ /* tu config de session */ }));
app.use(flash());               // <— añade esto
app.use(passport.initialize());
app.use(passport.session());


// Estrategia local
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Usuario no encontrado' });
    const valid = await user.verifyPassword(password);
    if (!valid) return done(null, false, { message: 'Contraseña incorrecta' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Después de passport.deserializeUser…
app.use((req, res, next) => {
  res.locals.user = req.user; // ahora todas las vistas tendrán acceso a `user`
  next();
});

// Montaje de rutas
app.use('/', authRouter);        // /login, /logout
app.use('/', attendanceRouter);  // /attendance
app.use('/', require('./routes/reports'));  // monta GET/POST /reports y POST /reports/export
app.use('/', adminRouter);       // /admin/*

// Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));