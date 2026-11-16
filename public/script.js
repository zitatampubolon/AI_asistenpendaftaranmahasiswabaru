const $ = (id) => document.getElementById(id);
function addMessage(text, who) {
  const el = document.createElement("div");
  el.className = `bubble ${who}`;
  el.textContent = text;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
}
async function checkHealth() {
  try {
    const r = await fetch("/api/health");
    const d = await r.json();
    $("apiStatus").textContent = "Aktif";
    $("apiDot").className = "status-dot ok";
    $("ollamaStatus").textContent = d.ollama ? "Terhubung" : "Tidak terhubung";
    $("ollamaDot").className = `status-dot ${d.ollama ? "ok" : "bad"}`;
    const found = d.availableModels.some(m => m === d.model || m.startsWith(d.model + ":"));
    $("modelStatus").textContent = found ? d.model + " siap" : d.model + " belum tersedia";
    $("modelDot").className = `status-dot ${found ? "ok" : "bad"}`;
    $("chatStatus").textContent = d.ollama && found ? "Siap membantu" : "Periksa Ollama/model";
  } catch {
    $("apiStatus").textContent = "Tidak aktif";
    $("apiDot").className = "status-dot bad";
    $("chatStatus").textContent = "Backend tidak aktif";
  }
}
$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("chatMessage");
  const message = input.value.trim();
  if (!message) return;
  addMessage(message, "user");
  input.value = "";
  const waiting = document.createElement("div");
  waiting.className = "bubble bot";
  waiting.textContent = "AI sedang menyiapkan jawaban...";
  $("messages").appendChild(waiting);
  $("messages").scrollTop = $("messages").scrollHeight;
  try {
    const r = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const d = await r.json();
    waiting.textContent = r.ok ? d.answer : (d.error || "Terjadi kesalahan.");
  } catch {
    waiting.textContent = "Tidak dapat menghubungi server. Pastikan backend dan Ollama sedang berjalan.";
  }
});
document.querySelectorAll(".suggestion").forEach(btn => btn.addEventListener("click", () => {
  $("chatMessage").value = btn.textContent;
  $("chatMessage").focus();
}));
$("registrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const result = $("registrationResult");
  result.textContent = "Mengirim data...";
  const data = new FormData(form);
  try {
    const r = await fetch("/api/registrations", { method: "POST", body: data });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Pendaftaran gagal.");
    result.textContent = `Berhasil! Nomor pendaftaran: ${d.registration.id}. Status: ${d.registration.status}. Simpan nomor ini.`;
    result.style.color = "#16845a";
    form.reset();
  } catch (err) {
    result.textContent = err.message;
    result.style.color = "#c43d3d";
  }
});
checkHealth();
setInterval(checkHealth, 20000);
