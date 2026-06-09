const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');

// Daftar file JS yang perlu di-obfuscate
const jsFiles = [
  'server.js',
  'db.js',
  'auth.js',
  'license.js',
  'routes/login.js',
  'routes/dashboard.js',
  'routes/faktur.js',
];

// File/folder yang di-copy tanpa obfuscate
const copyItems = [
  'package.json',
  '.env.example',
  'config',
  'views',
  'public',
];

// Setting obfuscator — cukup kuat tapi gak merusak runtime
const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('Building CoreTax e-Faktur App...\n');

  // Bersihkan dist lama
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDir(DIST_DIR);

  // Copy file non-JS
  for (const item of copyItems) {
    const src = path.join(SRC_DIR, item);
    const dest = path.join(DIST_DIR, item);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      console.log(`✓ Copied: ${item}`);
    } else {
      console.warn(`⚠ Not found: ${item}`);
    }
  }

  // Obfuscate file JS
  for (const file of jsFiles) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);

    if (!fs.existsSync(src)) {
      console.warn(`⚠ Not found: ${file}`);
      continue;
    }

    ensureDir(path.dirname(dest));

    const code = fs.readFileSync(src, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
    fs.writeFileSync(dest, obfuscationResult.getObfuscatedCode());
    console.log(`✓ Obfuscated: ${file}`);
  }

  // Buat README build di dist
  const readme = `# CoreTax e-Faktur App — Production Build

## Cara Install

1. Copy seluruh isi folder ini ke server.
2. Jalankan \`npm install\`.
3. Copy \`.env.example\` jadi \`.env\`, lalu isi konfigurasi.
4. Pastikan \`CORETAX_LICENSE_KEY\` sudah diisi dengan key yang valid.
5. Jalankan \`npm start\`.

## Catatan Keamanan

- File JS sudah di-obfuscate dan di-minify.
- Jangan mengubah file JS karena bisa merusak aplikasi.
- License key terikat per client — hubungi developer untuk key baru.
`;
  fs.writeFileSync(path.join(DIST_DIR, 'README-BUILD.md'), readme);

  console.log('\n✅ Build selesai. Output di folder: dist/');
}

build();
