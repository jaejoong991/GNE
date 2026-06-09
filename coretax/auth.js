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

async function checkUserRoleAccess(userId) {
  const allowedRolesEnv = process.env.CORETAX_ALLOWED_ROLES;

  // Kalau env kosong, semua role boleh login
  if (!allowedRolesEnv || !allowedRolesEnv.trim()) {
    return { allowed: true };
  }

  const allowedList = allowedRolesEnv.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const query = `
      SELECT r.name as role_name, r.ad_role_id::text as role_id
      FROM ad_user_roles ur
      JOIN ad_role r ON ur.ad_role_id = r.ad_role_id
      WHERE ur.ad_user_id = $1
        AND ur.isactive = 'Y'
        AND r.isactive = 'Y'
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return { allowed: false, message: 'User tidak memiliki role yang aktif' };
    }

    // Cek apakah ada role yang match (by name atau by ID)
    const hasMatch = result.rows.some(row => {
      return allowedList.includes(row.role_name) || allowedList.includes(row.role_id);
    });

    if (!hasMatch) {
      const userRoles = result.rows.map(r => r.role_name).join(', ');
      return {
        allowed: false,
        message: `Akses ditolak. Role anda: ${userRoles}. Hubungi admin untuk mendapatkan akses.`,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Role check error:', err);
    return { allowed: false, message: 'Terjadi kesalahan saat cek role' };
  }
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

    // Cek role access
    const roleCheck = await checkUserRoleAccess(user.ad_user_id);
    if (!roleCheck.allowed) {
      return { success: false, message: roleCheck.message };
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
