const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateUser } = require('../auth');

// Rate limiter buat login: maksimal 5 percobaan per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

router.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

router.post('/', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'Username dan password wajib diisi' });
  }

  // Sanitasi input: hapus karakter berbahaya
  const cleanUsername = String(username).trim().substring(0, 100);
  const cleanPassword = String(password).substring(0, 200);

  const result = await authenticateUser(cleanUsername, cleanPassword);

  if (!result.success) {
    return res.render('login', { error: result.message });
  }

  req.session.userId = result.user.id;
  req.session.userName = result.user.name;
  req.session.clientId = result.user.clientId;

  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
