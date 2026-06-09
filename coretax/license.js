const crypto = require('crypto');

// Secret untuk validasi license — akan di-obfuscate saat build
const LICENSE_SECRET = 'GNE-CoreTax-2025-X9kL3mP';

/**
 * Validasi format license key.
 * Format: GNE-<XXXX>-<XXXXXXXX>
 * - XXXX = 4 hex karakter (client ID)
 * - XXXXXXXX = 8 hex karakter (HMAC signature)
 */
function validateLicense(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, message: 'License key tidak ditemukan' };
  }

  const parts = key.split('-');
  if (parts.length !== 3 || parts[0] !== 'GNE') {
    return { valid: false, message: 'Format license key tidak valid' };
  }

  const clientId = parts[1];
  const signature = parts[2];

  if (!/^[0-9A-Fa-f]{4}$/.test(clientId)) {
    return { valid: false, message: 'Format license key tidak valid' };
  }

  if (!/^[0-9A-Fa-f]{8}$/.test(signature)) {
    return { valid: false, message: 'Format license key tidak valid' };
  }

  const expected = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(parts[0] + clientId)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  if (signature.toUpperCase() !== expected) {
    return { valid: false, message: 'License key tidak valid' };
  }

  return { valid: true, clientId: clientId.toUpperCase() };
}

/**
 * Generator license key (untuk seller/developer)
 */
function generateLicense(clientId) {
  const cleanId = clientId.replace(/[^0-9A-Fa-f]/g, '').substring(0, 4).toUpperCase();
  if (cleanId.length !== 4) {
    throw new Error('Client ID harus 4 karakter hex (0-9, A-F)');
  }

  const signature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update('GNE' + cleanId)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  return `GNE-${cleanId}-${signature}`;
}

module.exports = {
  validateLicense,
  generateLicense,
};
