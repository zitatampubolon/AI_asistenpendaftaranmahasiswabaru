require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const ADMIN_KEY = process.env.ADMIN_KEY || "ganti-password-admin";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const REG_FILE = path.join(DATA_DIR, "registrations.json");
const INFO_FILE = path.join(DATA_DIR, "pmb-info.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(REG_FILE)) fs.writeFileSync(REG_FILE, "[]", "utf8");
if (!fs.existsSync(INFO_FILE)) {
  fs.writeFileSync(INFO_FILE, JSON.stringify({
    kampus: "Universitas Prima Indonesia (UNPRI)",
    catatan: "Lengkapi berkas ini dengan informasi resmi PMB UNPRI sebelum digunakan untuk menjawab calon mahasiswa.",
    program_studi: [],
    biaya: null,
    jadwal_pendaftaran: null,
    persyaratan: [],
    kontak_resmi: null,
    tautan_resmi: null
  }, null, 2), "utf8");
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readRegistrations() {
  try { return JSON.parse(fs.readFileSync(REG_FILE, "utf8")); }
  catch { return []; }
}
function writeRegistrations(rows) {
  fs.writeFileSync(REG_FILE, JSON.stringify(rows, null, 2), "utf8");
}
function adminOnly(req, res, next) {
  const key = req.get("x-admin-key") || req.query.key;
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: "Kunci admin tidak valid." });
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("Format dokumen harus PDF, JPG, JPEG, atau PNG."));
    cb(null, true);
  }
});

app.get("/api/health", async (_req, res) => {
  let ollama = false;
  let models = [];
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (r.ok) {
      const data = await r.json();
      ollama = true;
      models = (data.models || []).map(m => m.name);
    }
  } catch {}
  res.json({ ok: true, ollama, model: OLLAMA_MODEL, availableModels: models });
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  if (message.length > 2000) return res.status(400).json({ error: "Pesan maksimal 2.000 karakter." });

  let info = {};
  try { info = JSON.parse(fs.readFileSync(INFO_FILE, "utf8")); } catch {}
  const context = JSON.stringify(info, null, 2);
  const system = `Kamu adalah AI SMART PMB, asisten informasi Penerimaan Mahasiswa Baru Universitas Prima Indonesia (UNPRI). Jawab dalam Bahasa Indonesia yang ramah, sopan, jelas, dan ringkas.
Gunakan hanya data kampus pada KONTEKS DATA RESMI di bawah ini. Jangan mengarang biaya, program studi, jadwal, persyaratan, nomor kontak, tautan, atau kebijakan.
Jika data yang ditanyakan tidak tersedia, katakan dengan jujur bahwa informasinya belum dimasukkan/terverifikasi dan arahkan calon mahasiswa untuk menghubungi kanal resmi UNPRI. Jangan menyatakan diri sebagai petugas resmi atau menjamin kelulusan.
Jangan meminta kata sandi, PIN, OTP, atau data pembayaran rahasia. Untuk pendaftaran, arahkan pengguna mengisi formulir pada menu Pendaftaran di website ini.
KONTEKS DATA PMB:
${context}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: message }
        ],
        options: { temperature: 0.3 }
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: `Ollama gagal memproses permintaan (${response.status}). Pastikan Ollama aktif dan model ${OLLAMA_MODEL} tersedia.`, detail });
    }
    const data = await response.json();
    res.json({ answer: data.message?.content || "Maaf, AI belum memberikan jawaban." });
  } catch (err) {
    res.status(503).json({ error: "Tidak dapat terhubung ke Ollama. Jalankan Ollama dan pastikan alamat lokalnya benar.", detail: err.message });
  }
});

app.post("/api/registrations", upload.single("document"), (req, res) => {
  const { nama, email, telepon, programStudi, asalSekolah } = req.body;
  if (![nama, email, telepon, programStudi, asalSekolah].every(v => String(v || "").trim())) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Lengkapi semua kolom wajib." });
  }
  const rows = readRegistrations();
  const id = `PMB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const row = {
    id, nama: String(nama).trim(), email: String(email).trim(),
    telepon: String(telepon).trim(), programStudi: String(programStudi).trim(),
    asalSekolah: String(asalSekolah).trim(),
    document: req.file ? req.file.filename : null,
    status: "Menunggu verifikasi",
    createdAt: new Date().toISOString()
  };
  rows.push(row);
  writeRegistrations(rows);
  res.status(201).json({ message: "Pendaftaran berhasil disimpan pada prototipe lokal.", registration: row });
});

app.get("/api/admin/registrations", adminOnly, (_req, res) => {
  res.json(readRegistrations().map(({ document, ...r }) => ({ ...r, hasDocument: Boolean(document) })));
});

app.get("/api/admin/info", adminOnly, (_req, res) => {
  res.sendFile(INFO_FILE);
});

app.put("/api/admin/info", adminOnly, (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Format data tidak valid." });
  }
  fs.writeFileSync(INFO_FILE, JSON.stringify(req.body, null, 2), "utf8");
  res.json({ message: "Data informasi PMB berhasil diperbarui." });
});

app.get("/api/admin/document/:id", adminOnly, (req, res) => {
  const row = readRegistrations().find(r => r.id === req.params.id);
  if (!row || !row.document) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
  const file = path.join(UPLOAD_DIR, path.basename(row.document));
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Berkas tidak tersedia." });
  res.download(file);
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Terjadi kesalahan pada permintaan." });
});

app.listen(PORT, () => {
  console.log(`AI SMART PMB UNPRI berjalan di http://localhost:${PORT}`);
  console.log(`Model Ollama: ${OLLAMA_MODEL} (${OLLAMA_URL})`);
});
