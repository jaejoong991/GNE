# CoreTax e-Faktur App — Panduan User / Pembeli

Aplikasi untuk menarik data faktur pajak dari sistem ERP Adempiere dan mengekspor ke format CSV e-Faktur yang siap diunggah ke sistem perpajakan.

## Fitur

- **Login** menggunakan user yang sudah terdaftar di Adempiere
- **Faktur PPN Keluaran** (penjualan)
- **Faktur PPN Masukan** (pembelian)
- **Filter** berdasarkan tanggal, nomor faktur, dan nama customer/supplier (dengan wildcard)
- **Export CSV** format e-Faktur
- **Scrollable table** dengan sticky header

---

## Persyaratan Sistem

| Komponen | Versi |
|----------|-------|
| Node.js | ≥ 16 |
| PostgreSQL | 9.2+ (sudah ada di Docker Adempiere) |
| Browser | Chrome / Firefox / Edge terbaru |

---

## Instalasi

### 1. Extract File

Extract file `coretax-app.zip` yang diberikan developer ke folder di server:

```bash
cd /opt
coretax-app.zip
cd coretax-app
```

### 2. Install Dependency

```bash
npm install
```

### 3. Konfigurasi Environment

Copy file template:

```bash
cp .env.example .env
```

Edit file `.env` dengan editor (nano / vim / notepad):

```env
# ==========================================
# LICENSE (WAJIB — dari developer)
# ==========================================
CORETAX_LICENSE_KEY=GNE-XXXX-XXXXXXXX

# ==========================================
# KONEKSI DATABASE ADEMPIERE
# ==========================================
CORETAX_DB_HOST=localhost
CORETAX_DB_PORT=5432
CORETAX_DB_NAME=adempiere
CORETAX_DB_USER=adempiere
CORETAX_DB_PASSWORD=adempiere

# ==========================================
# APP SETTING
# ==========================================
CORETAX_APP_PORT=3000

# Session secret (buat string random, min 32 karakter)
CORETAX_SESSION_SECRET=GANTI-DENGAN-RANDOM-STRING-PANJANG-MINIMAL-32

# ==========================================
# KONFIGURASI NPWP
# ==========================================
# Default: taxid di tabel c_bpartner
# Kalau NPWP disimpan di kolom lain, ubah di sini
CORETAX_NPWP_COLUMN=taxid
```

**Catatan penting:**
- `CORETAX_LICENSE_KEY` — wajib diisi dengan key dari developer. Kalau salah/kosong, app tidak akan jalan.
- `CORETAX_DB_HOST` — kalau PostgreSQL di Docker, biasanya `localhost` (karena port 5432 di-expose).
- `CORETAX_SESSION_SECRET` — buat string random panjang. Bisa generate dengan:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 4. Jalankan Aplikasi

```bash
npm start
```

Aplikasi akan berjalan di: `http://localhost:3000`

Buka browser dan akses URL tersebut.

### 5. Jalankan sebagai Background Service (Opsional)

Pakai **PM2**:

```bash
npm install -g pm2
pm2 start server.js --name coretax-app
pm2 startup
pm2 save
```

Atau pakai **systemd** — hubungi admin server untuk setup.

---

## Cara Pakai

### Login

- Masukkan **Username** dan **Password** yang sama dengan login Adempiere.
- Session berlaku selama **8 jam**.

### Dashboard

Menampilkan ringkasan jumlah faktur, total DPP, dan total PPN untuk bulan berjalan.

### Menu Faktur PPN

#### Tab PPN Keluaran
Menampilkan faktur pajak keluaran (penjualan ke customer).

#### Tab PPN Masukan
Menampilkan faktur pajak masukan (pembelian dari supplier).

#### Filter

| Filter | Cara Pakai |
|--------|-----------|
| Dari / Sampai Tanggal | Pilih range tanggal faktur |
| Nomor Faktur | Bisa pakai wildcard `%` (sama seperti di Adempiere). Contoh: `%1000236` = cari yang akhirnya 1000236 |
| Customer / Supplier | Bisa pakai wildcard `%`. Contoh: `%PT ABC%` = cari yang mengandung "PT ABC" |

#### Export CSV

1. Centang faktur yang mau di-export (bisa pilih semua pakai checkbox di header).
2. Klik tombol **Export CSV CoreTax**.
3. File CSV akan otomatis ter-download.
4. File siap di-import ke aplikasi e-Faktur.

---

## Troubleshooting

### App tidak bisa jalan, muncul "License key tidak valid"

→ Pastikan `CORETAX_LICENSE_KEY` di file `.env` sudah diisi dengan benar. Hubungi developer kalau belum punya key.

### App tidak bisa jalan, muncul "CORETAX_SESSION_SECRET harus di-set"

→ Isi `CORETAX_SESSION_SECRET` di `.env` dengan string random panjang (min 32 karakter).

### Tidak bisa konek ke database

→ Cek konfigurasi DB di `.env`:
```env
CORETAX_DB_HOST=localhost
CORETAX_DB_PORT=5432
```

Pastikan PostgreSQL Adempiere sudah running dan port 5432 bisa diakses.

### Port 3000 sudah dipakai aplikasi lain

→ Ubah port di `.env`:
```env
CORETAX_APP_PORT=3001
```
Lalu akses `http://localhost:3001`.

### Kolom NPWP kosong di tabel faktur

→ Cek apakah di Adempiere kolom NPWP disimpan dengan nama berbeda dari `taxid`. Kalau beda, ubah di `.env`:
```env
CORETAX_NPWP_COLUMN=npwp
```
Restart app setelah ubah.

---

## Ganti Logo Perusahaan

Logo ditampilkan di navbar (atas halaman) dan di halaman login.

### Cara Ganti

1. Siapkan file logo (disarankan format `.png` atau `.jpg`).
2. Ganti file ini dengan logo kamu:
   ```
   public/images/logo.png
   ```
3. Ukuran yang direkomendasikan:
   - **Navbar:** tinggi sekitar 32px
   - **Login page:** tinggi maksimal 60px
4. Restart aplikasi setelah ganti logo:
   ```bash
   npm start
   ```

Kalau belum ada file logo, halaman tetap jalan normal — bagian logo otomatis disembunyikan.

---

## Catatan Keamanan

- **Jangan bagikan file `.env`** — terutama `CORETAX_LICENSE_KEY` dan `CORETAX_SESSION_SECRET`.
- **Jangan ubah file JS** — file sudah di-obfuscate; mengubahnya bisa merusak aplikasi.
- App menggunakan session cookie dengan proteksi `httpOnly` dan `sameSite`.
- Semua password dicek langsung ke database Adempiere — password tidak disimpan di aplikasi ini.

---

## Butuh Bantuan?

Hubungi developer untuk:
- License key baru / perpanjangan
- Perubahan kolom NPWP / mapping field
- Integrasi tambahan
- Troubleshooting teknis
