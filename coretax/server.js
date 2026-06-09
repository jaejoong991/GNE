require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const loginRoutes = require('./routes/login');
const dashboardRoutes = require('./routes/dashboard');
const fakturRoutes = require('./routes/faktur');

const app = express();
const PORT = process.env.CORETAX_APP_PORT || 3000;

// Pastikan session secret di-set
if (!process.env.CORETAX_SESSION_SECRET) {
  console.error('ERROR: CORETAX_SESSION_SECRET harus di-set di file .env');
  process.exit(1);
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // untuk inline style di EJS
      scriptSrc: ["'self'"],
    },
  },
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  session({
    secret: process.env.CORETAX_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 jam
      httpOnly: true,
      secure: false, // set ke true kalau pakai HTTPS
      sameSite: 'strict',
    },
    name: 'coretax.sid', // ganti nama cookie default biar gak ketahuan pakai express-session
  })
);

// Global template variables
app.use((req, res, next) => {
  res.locals.userName = req.session.userName || null;
  next();
});

// Routes
app.use('/login', loginRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/faktur', fakturRoutes);

// Redirect root
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// 404
app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Terjadi kesalahan pada server');
});

app.listen(PORT, () => {
  console.log(`CoreTax e-Faktur App running on http://localhost:${PORT}`);
});
