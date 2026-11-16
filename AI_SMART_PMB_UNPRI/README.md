# AI SMART PMB UNPRI — Prototipe Lokal

Aplikasi prototipe website AI Asisten Penerimaan Mahasiswa Baru dengan HTML/CSS/JavaScript, Node.js/Express, dan Ollama (default model `llama3.2`).

## Persyaratan
- Windows 10/11
- Node.js 18+ (disarankan Node.js 20/22)
- Ollama terpasang
- Model `llama3.2` sudah diunduh

## Instalasi
1. Ekstrak ZIP ke folder, misalnya `C:\AI_SMART_PMB`.
2. Buka PowerShell di folder tersebut.
3. Jalankan:
   ```powershell
   npm install
   ```
4. Salin `.env.example` menjadi `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
5. Edit `.env`, terutama ganti `ADMIN_KEY` dengan kata sandi admin yang kuat.
6. Pastikan Ollama aktif. Jika perlu, jalankan di terminal lain:
   ```powershell
   ollama serve
   ```
7. Pastikan model tersedia:
   ```powershell
   ollama pull llama3.2
   ```
8. Jalankan aplikasi:
   ```powershell
   npm start
   ```
9. Buka browser ke `http://localhost:3000`.

## Menggunakan chatbot
Chatbot mengirim pertanyaan ke Ollama lokal melalui backend. Model default di `.env` adalah `llama3.2`.

## Mengisi pengetahuan PMB UNPRI
Edit `data/pmb-info.json` dengan data resmi yang sudah diverifikasi, misalnya daftar program studi, biaya, jadwal, persyaratan, kontak, dan tautan resmi. Jangan memasukkan data perkiraan. Restart server setelah mengubah file bila perlu.

Contoh struktur:
```json
{
  "kampus": "Universitas Prima Indonesia (UNPRI)",
  "program_studi": ["Isi dari sumber resmi"],
  "biaya": "Isi informasi resmi atau rincian biaya yang sudah diverifikasi",
  "jadwal_pendaftaran": "Isi jadwal resmi",
  "persyaratan": ["Isi syarat resmi"],
  "kontak_resmi": "Isi kontak resmi",
  "tautan_resmi": "Isi URL resmi"
}
```

## Pendaftaran dan dashboard admin
- Form pendaftaran menyimpan data ke `data/registrations.json`.
- Dokumen PDF/JPG/PNG disimpan di folder `uploads/` (maksimal 5 MB).
- Endpoint daftar pendaftar: `GET http://localhost:3000/api/admin/registrations`
- Endpoint ini memerlukan header `x-admin-key` sesuai nilai `ADMIN_KEY` di `.env`.
- Data informasi PMB dapat dibaca melalui `GET /api/admin/info` dan diperbarui melalui `PUT /api/admin/info`, juga dengan header `x-admin-key`.
- Unduh dokumen: `GET /api/admin/document/ID_PENDAFTARAN` dengan header `x-admin-key`.

## Catatan keamanan dan batasan
Ini adalah prototipe lokal untuk pengembangan dan demonstrasi, BUKAN sistem PMB produksi. Penyimpanan pendaftar saat ini menggunakan file JSON, bukan MySQL. Belum tersedia autentikasi admin berbasis akun, enkripsi data, validasi/verifikasi dokumen, proteksi CSRF/rate limiting, audit log, kebijakan retensi, atau kepatuhan privasi. Jangan dipublikasikan ke internet atau digunakan untuk menerima data pribadi nyata sebelum aspek keamanan, legal, dan operasional diperkuat. Gunakan data dummy untuk pengujian.

AI dapat menghasilkan jawaban yang keliru. Data resmi harus diverifikasi dan jawaban penting harus dikonfirmasi ke kanal resmi kampus.
