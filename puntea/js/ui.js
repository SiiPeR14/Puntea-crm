// ===========================================================
// PUNTEA — Utilidades UI compartidas
// ===========================================================

function toast(msg, type = "") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = "toast show" + (type ? " " + type : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function fmtMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v + "T00:00:00");
  if (isNaN(d)) return v;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowHM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function renderConfigBanner(containerId) {
  if (Api.isConfigured()) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="setup-banner">
      ⚠️ <strong>Puntea aún no está conectado a Google Sheets.</strong><br>
      Abre <code>js/config.js</code> y pega la URL de tu Apps Script en
      <code>API_URL</code>. Instrucciones en el <code>README.md</code>.
    </div>`;
}

const RESULTADOS = [
  { value: "Venta cerrada", emoji: "✅", tone: "success" },
  { value: "Interesado (seguimiento)", emoji: "👀", tone: "brand" },
  { value: "No interesado", emoji: "🚫", tone: "danger" },
  { value: "No estaba el responsable", emoji: "🚪", tone: "warning" },
  { value: "Volver otro día", emoji: "🔁", tone: "warning" },
  { value: "Otros", emoji: "✏️", tone: "neutral" },
];

function badgeForResultado(resultado) {
  const r = RESULTADOS.find((x) => x.value === resultado);
  const tone = r ? r.tone : "muted";
  return `<span class="badge badge-${tone}">${resultado || "—"}</span>`;
}
