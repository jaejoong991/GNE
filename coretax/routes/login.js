const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../auth');

router.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

router.post('/', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'Username dan password wajib diisi' });
  }

  const result = await authenticateUser(username, password);

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
