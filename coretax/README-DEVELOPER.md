# CoreTax e-Faktur App — Panduan Developer

## Tech Stack

- **Node.js** ≥ 16
- **Express** + **EJS** (server-side rendering)
- **PostgreSQL** (via `pg` — konek ke DB Adempiere)
- **javascript-obfuscator** (proteksi source code)

---

## Struktur Folder

```
coretax/
├── server.js              # Entry point Express
├── db.js                  # Pool koneksi PostgreSQL
├── auth.js                # Login langsung ke tabel ad_user
├── license.js             # Validasi & generator license key
├── build.js               # Script build → obfuscate ke coretax-client/
├── generate-license.js    # Script generate license untuk client
├── package.json
├── .env                   # Konfigurasi lokal (tidak masuk git)
├── .env.example           # Template .env untuk user
├── config/
│   └── field-mapping.json # Mapping kolom NPWP (bisa disesuaikan)
├── routes/
│   ├── login.js           # Login/logout + rate limiter
│   ├── dashboard.js       # Summary faktur
│   └── faktur.js          # List faktur + export CSV
├── views/                 # Template EJS
└── public/css/            # Static assets
```

---

## Cara Develop (Mode Development)

```bash
cd coretax
npm install

# Buat .env dari template
cp .env.example .env
# Isi semua konfigurasi, termasuk CORETAX_LICENSE_KEY

# Jalankan
npm start
# atau
npm run dev
```

App akan jalan di `http://localhost:3000` (atau port sesuai `CORETAX_APP_PORT`).

---

## Generate License Key

Format license: `GNE-<4-digit-hex>-<8-digit-signature>`

```bash
# Generate license untuk client
npm run generate-license -- A1B2
# Output: GNE-A1B2-652AE124
```

- `A1B2` = client ID (bebas, 4 karakter hex 0-9 A-F)
- Satu key untuk satu client/installasi
- Key di-generate pakai HMAC + secret hardcoded di `license.js`

---

## Build Production Package

```bash
npm run build
```

Hasil:
- Folder `coretax-client/` berisi app siap jual
- Semua file `.js` sudah di-obfuscate & minify
- File non-JS (views, css, config) di-copy apa adanya

**Yang dijual ke client = isi folder `coretax-client/` saja.**

### Opsi Build Manual

Kalau mau custom build tanpa script:

```bash
node build.js
```

---

## Cara Kerja License

1. `server.js` load `.env` → cek `CORETAX_LICENSE_KEY`
2. Panggil `validateLicense()` dari `license.js`
3. Kalau valid → app jalan
4. Kalau invalid → `process.exit(1)` dengan pesan error

### Algoritma Validasi

```
signature = HMAC-SHA256("GNE" + clientId, SECRET).substring(0, 8)
```

- `SECRET` hardcoded di `license.js`
- Client tidak bisa generate key sendiri tanpa tahu SECRET
- SECRET akan ikut di-obfuscate saat build

---

## Ganti Logo Perusahaan

Logo ditampilkan di **navbar** (semua halaman) dan **login page**.

### Cara Ganti

1. Copy file logo ke:
   ```
   public/images/logo.png
   ```

2. Format yang didukung: `.png`, `.jpg`, `.svg`

3. Kalau mau ganti nama file atau extension, edit di 3 file template:
   - `views/login.ejs`
   - `views/dashboard.ejs`
   - `views/faktur.ejs`

   Cari tag `<img src="/images/logo.png"` dan ganti path-nya.

4. Re-build kalau sudah production:
   ```bash
   npm run build
   ```

**Catatan:** Kalau file logo belum ada, halaman tetap jalan normal — logo otomatis hidden.

---

## Konfigurasi Kolom NPWP

Default ambil dari `c_bpartner.taxid`. Kalau client pakai kolom custom:

**Opsi 1: Env var**
```env
CORETAX_NPWP_COLUMN=npwp
```

**Opsi 2: File mapping**
Edit `config/field-mapping.json`:
```json
{
  "npwpColumn": "npwp",
  "npwpTable": "c_bpartner"
}
```

Restart app setelah ubah konfigurasi.

---

## Catatan Keamanan

| Layer | File | Keterangan |
|-------|------|-----------|
| Rate limiter | `routes/login.js` | Max 5x login salah per 15 menit per IP |
| Session | `server.js` | `httpOnly` + `sameSite: strict`, nama cookie custom |
| Helmet | `server.js` | Security headers (CSP, XSS filter, dll) |
| SQL Injection | semua routes | Parameterized query 100% |
| Inspect Element | `routes/faktur.js` | Server validasi ulang semua ID sebelum export |
| Obfuscation | `build.js` | Hex var names, dead code, string encode, anti-debug |

---

## Troubleshooting Develop

**App exit: "CORETAX_SESSION_SECRET harus di-set"**
→ Isi `CORETAX_SESSION_SECRET` di `.env` dengan string random ≥ 32 karakter.

**App exit: "License key tidak valid"**
→ Pastikan `CORETAX_LICENSE_KEY` di `.env` sudah diisi dengan key yang benar.

**Error koneksi DB**
→ Cek `CORETAX_DB_HOST`, `PORT`, `NAME`, `USER`, `PASSWORD`.
→ Pastikan PostgreSQL Adempiere expose port 5432 dan bisa diakses dari host.

**Port sudah digunakan**
→ Ubah `CORETAX_APP_PORT` di `.env` atau kill proses yang pakai port tersebut.

---

## Perintah Berguna

```bash
# Generate license
node generate-license.js <CLIENT_ID>

# Build production
node build.js

# Cek syntax file JS
node -e "require('./server.js')"

# Lihat isi license validator
node -e "const l=require('./license'); console.log(l.validateLicense('GNE-A1B2-652AE124'))"
```
