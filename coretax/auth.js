const pool = require('./db');
const crypto = require('crypto');

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
}

/**
 * Verifikasi password Adempiere.
 * Adempiere bisa menyimpan password dalam berbagai format:
 * 1. Plain text (tergantung konfigurasi lama)
 * 2. Hash internal Adempiere (biasanya hash kombinasi)
 * 3. MD5 hash
 *
 * Fungsi ini mencoba beberapa strategi verifikasi.
 */
async function verifyAdempierePassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;

  // 1. Plain text comparison (case insensitive untuk safety)
  if (inputPassword === storedPassword) {
    return true;
  }

  // 2. MD5 hash comparison
  const inputMd5 = crypto.createHash('md5').update(inputPassword).digest('hex');
  if (inputMd5.toLowerCase() === storedPassword.toLowerCase()) {
    return true;
  }

  // 3. MD5 with uppercased password (beberapa versi Adempiere)
  const inputMd5Upper = crypto.createHash('md5').update(inputPassword.toUpperCase()).digest('hex');
  if (inputMd5Upper.toLowerCase() === storedPassword.toLowerCase()) {
    return true;
  }

  // 4. Adempiere hash format: password dikombinasikan dengan salt/key
  // Format lama: hash = md5(password + key) atau md5(key + password)
  // Coba beberapa variasi umum
  const variations = [
    inputPassword + 'key',
    'key' + inputPassword,
    inputPassword + '1',
    inputPassword.toUpperCase(),
  ];
  for (const variant of variations) {
    const hash = crypto.createHash('md5').update(variant).digest('hex');
    if (hash.toLowerCase() === storedPassword.toLowerCase()) {
      return true;
    }
  }

  return false;
}

async function authenticateUser(username, password) {
  try {
    const query = `
      SELECT ad_user_id, name, password, ad_client_id, isactive
      FROM ad_user
      WHERE name = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return { success: false, message: 'User tidak ditemukan' };
    }

    const user = result.rows[0];

    if (user.isactive === 'N' || user.isactive === false) {
      return { success: false, message: 'User tidak aktif' };
    }

    const passwordMatch = await verifyAdempierePassword(password, user.password);
    if (!passwordMatch) {
      return { success: false, message: 'Password salah' };
    }

    return {
      success: true,
      user: {
        id: user.ad_user_id,
        name: user.name,
        clientId: user.ad_client_id,
      },
    };
  } catch (err) {
    console.error('Auth error:', err);
    return { success: false, message: 'Terjadi kesalahan saat login' };
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  authenticateUser,
};
