# Google Drive Setup Troubleshooting

## Masalah yang Ditemukan

Upload ke Google Drive gagal karena **Google Drive belum terhubung** ke akun Anda.

## Langkah Perbaikan

### 1. Daftarkan Redirect URI di Google Cloud Console

Anda perlu mendaftarkan redirect URI berikut di Google Cloud Console:

**Untuk Production:**
- `https://www.nohanvault.my.id/api/auth/google/callback`

**Untuk Development (localhost):**
- `http://localhost:3000/api/auth/google/callback`

### Cara Mendaftarkan Redirect URI:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. Buka **APIs & Services** > **Credentials**
4. Klik pada OAuth 2.0 Client ID Anda
5. Di bagian **Authorized redirect URIs**, tambahkan:
   - `https://www.nohanvault.my.id/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (untuk development)
6. Klik **Save**

### 2. Hubungkan Google Drive

Setelah redirect URI terdaftar:

1. Buka aplikasi di `http://localhost:3000` (development) atau `https://www.nohanvault.my.id` (production)
2. Login ke akun Anda
3. Buka halaman **Pengaturan**
4. Klik **Hubungkan Google Drive**
5. Authorize akses ke Google Drive

### 3. Test Upload

Setelah Google Drive terhubung, coba upload file lagi.

## Diagnostic Tools

Anda bisa menjalankan diagnostic untuk memeriksa status koneksi:

```bash
# Pastikan dev server berjalan di localhost:3000
node scripts/test-gdrive-upload.mjs
```

Atau buka di browser:
- `http://localhost:3000/api/gdrive/diagnostic` - Diagnostic endpoint
- `http://localhost:3000/api/auth/google/status` - Status koneksi

## Error Messages

Jika masih gagal, periksa console browser (F12) untuk melihat error message detail.

## Catatan Penting

- Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` sudah dikonfigurasi di `.env.local`
- Pastikan Google Drive API sudah diaktifkan di Google Cloud Console
- Token Google OAuth akan otomatis di-refresh jika kedaluwarsa
