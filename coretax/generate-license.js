const { generateLicense } = require('./license');

const clientId = process.argv[2];

if (!clientId) {
  console.error('Penggunaan: node generate-license.js <client-id>');
  console.error('Contoh: node generate-license.js A1B2');
  process.exit(1);
}

try {
  const key = generateLicense(clientId);
  console.log('\n✅ License Key Generated:');
  console.log(key);
  console.log('\nCopy key ini ke .env pembeli:');
  console.log(`CORETAX_LICENSE_KEY=${key}\n`);
} catch (err) {
  console.error('❌ Gagal generate license:', err.message);
  process.exit(1);
}
