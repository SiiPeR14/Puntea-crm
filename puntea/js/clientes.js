// ===========================================================
// PUNTEA — Clientes vendidos + Estadísticas
// ===========================================================

renderConfigBanner("config-banner");

let allClientes = [];
let allVisitasForStats = [];
let filtroActivo = "todos";

const ESTADOS = ["Activo", "Posible upsell", "Inactivo"];
const TIPOS_SEGUIMIENTO = [
  "Reposición de tarjetas",
  "Gestión de reseñas",
  "Respuestas automáticas",
  "Pack ampliado",
  "Otro",
];

async function cargarTodo() {
  if (!Api.isConfigured()) {
    document.getElementById("list-card").innerHTML = `<div class="empty">Conecta Google Sheets para ver los clientes.</div>`;
    document.getElementById("stats-grid").innerHTML = "";
    return;
  }
  try {
    const [clientes, visitas] = await Promise.all([Api.listClientes(), Api.listVisitas()]);
    allClientes = clientes;
    allVisitasForStats = visitas;
    document.getElementById("count-tag").textContent = allClientes.length + " clientes";
    renderStats();
    render();
  } catch (err) {
    document.getElementById("list-card").innerHTML = `<div class="empty">Error al cargar: ${err.message}</div>`;
  }
}

// ---------- Estadísticas ----------
function renderStats() {
  const totalVisitas = allVisitasForStats.length;
  const totalVentas = allClientes.length;
  const ingresos = allClientes.reduce((s, c) => s + (Number(c.ImporteTotal) || 0), 0);
  const tarjetas = allClientes.reduce((s, c) => s + (Number(c.NumTarjetas) || 0), 0);
  const conversion = totalVisitas ? Math.round((totalVentas / totalVisitas) * 100) : 0;

  document.getElementById("stats-grid").innerHTML = `
    <div class="stat-card alt">
      <div class="stat-num">${fmtMoney(ingresos)}</div>
      <div class="stat-label">Ingresos totales</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${totalVentas}</div>
      <div class="stat-label">Clientes conseguidos</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${tarjetas}</div>
      <div class="stat-label">Tarjetas vendidas</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${conversion}%</div>
      <div class="stat-label">Conversión (${totalVentas}/${totalVisitas})</div>
    </div>
  `;

  const porComercial = PUNTEA_CONFIG.COMERCIALES.map((nombre) => {
    const visitas = allVisitasForStats.filter((v) => v.Comercial === nombre).length;
    const ventas = allClientes.filter((c) => c.Comercial === nombre).length;
    const ing = allClientes
      .filter((c) => c.Comercial === nombre)
      .reduce((s, c) => s + (Number(c.ImporteTotal) || 0), 0);
    return { nombre, visitas, ventas, ing };
  });
  const maxIng = Math.max(1, ...porComercial.map((p) => p.ing));
  const maxVis = Math.max(1, ...porComercial.map((p) => p.visitas));

  document.getElementById("stats-detail").innerHTML = `
    <div class="section-title" style="margin-top:0;">Ingresos por comercial</div>
    ${porComercial.map((p) => `
      <div class="bar-row">
        <div class="bar-label">${p.nombre}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(p.ing / maxIng) * 100}%"></div></div>
        <div class="bar-val">${Math.round(p.ing)}€</div>
      </div>
    `).join("")}
    <div class="section-title">Visitas realizadas</div>
    ${porComercial.map((p) => `
      <div class="bar-row">
        <div class="bar-label">${p.nombre}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(p.visitas / maxVis) * 100}%; background:var(--neutral2)"></div></div>
        <div class="bar-val">${p.visitas}</div>
      </div>
    `).join("")}
  `;
}

// ---------- Listado ----------
function aplicaFiltro(list) {
  if (filtroActivo === "todos") return list;
  if (ESTADOS.includes(filtroActivo)) return list.filter((c) => c.Estado === filtroActivo);
  return list.filter((c) => c.Comercial === filtroActivo);
}

function estadoBadgeClass(estado) {
  if (estado === "Activo") return "badge-success";
  if (estado === "Posible upsell") return "badge-warning";
  if (estado === "Inactivo") return "badge-muted";
  return "badge-brand";
}

function render() {
  const listCard = document.getElementById("list-card");
  const visibles = aplicaFiltro(allClientes);

  if (visibles.length === 0) {
    listCard.innerHTML = `<div class="empty">Todavía no hay clientes con este filtro.<br>¡Sal a vender! 💪</div>`;
    return;
  }

  listCard.innerHTML = visibles
    .map((c) => `
      <div class="visit-item" data-id="${c.ID}">
        <div style="flex:1; min-width:0;">
          <div class="visit-name">${escapeHtml(c.NombreNegocio || "Sin nombre")}</div>
          <div class="visit-meta">
            <span>${fmtDate(c.FechaVenta)}</span>
            <span>${c.Comercial || "—"}</span>
            <span>${fmtMoney(c.ImporteTotal)}</span>
          </div>
        </div>
        <span class="badge ${estadoBadgeClass(c.Estado)}">${c.Estado || "—"}</span>
      </div>
    `)
    .join("");

  [...listCard.querySelectorAll(".visit-item")].forEach((el) => {
    el.style.cursor = "pointer";
    el.onclick = () => abrirDetalle(allClientes.find((c) => c.ID === el.dataset.id));
  });
}

// ---------- Detalle / edición ----------
function abrirDetalle(c) {
  const modalBg = document.getElementById("modal-bg");
  const modal = document.getElementById("modal-content");

  modal.innerHTML = `
    <div class="modal-head">
      <h3>${escapeHtml(c.NombreNegocio || "Cliente")}</h3>
      <button class="modal-close" id="modal-close">&times;</button>
    </div>

    <div class="field">
      <label>Estado del cliente</label>
      <select id="estado-select">
        ${ESTADOS.map((e) => `<option value="${e}" ${c.Estado === e ? "selected" : ""}>${e}</option>`).join("")}
      </select>
    </div>

    <div class="kv"><span class="k">Comercial</span><span class="v">${c.Comercial || "—"}</span></div>
    <div class="kv"><span class="k">Fecha de venta</span><span class="v">${c.FechaVenta || "—"}</span></div>
    <div class="kv"><span class="k">Importe</span><span class="v">${fmtMoney(c.ImporteTotal)}</span></div>
    <div class="kv"><span class="k">Tarjetas</span><span class="v">${c.NumTarjetas || "—"}</span></div>
    <div class="kv"><span class="k">Dirección</span><span class="v">${escapeHtml(c.Direccion || "—")}</span></div>
    <div class="kv"><span class="k">Contacto</span><span class="v">${escapeHtml(c.PersonaContacto || "—")} ${c.Cargo ? "(" + c.Cargo + ")" : ""}</span></div>
    <div class="kv"><span class="k">Teléfono</span><span class="v">${c.Telefono || "—"}</span></div>
    <div class="kv"><span class="k">Email</span><span class="v">${c.Email || "—"}</span></div>
    ${c.GoogleMapsLink ? `<div class="kv"><span class="k">Google</span><span class="v"><a href="${c.GoogleMapsLink}" target="_blank">Ver perfil ↗</a></span></div>` : ""}

    <div class="field" style="margin-top:14px;">
      <label for="notas-edit">Notas para futuros seguimientos</label>
      <textarea id="notas-edit">${escapeHtml(c.Notas || "")}</textarea>
    </div>
    <button class="btn btn-primary btn-block" id="guardar-cambios">Guardar cambios</button>

    <div class="section-title">Historial de oportunidades futuras</div>
    <div id="seg-list">
      ${
        (c.Seguimientos || []).length
          ? c.Seguimientos.map((s) => `
              <div class="kv">
                <span class="k">${s.Fecha} · ${s.Tipo}</span>
                <span class="v">${escapeHtml(s.Descripcion || "")} <span class="badge badge-muted">${s.Estado}</span></span>
              </div>
            `).join("")
          : `<p style="font-size:13px; color:var(--muted);">Sin oportunidades registradas todavía.</p>`
      }
    </div>

    <div class="field" style="margin-top:10px;">
      <label for="seg-tipo">Añadir oportunidad (reposición, upsell...)</label>
      <select id="seg-tipo">
        ${TIPOS_SEGUIMIENTO.map((t) => `<option>${t}</option>`).join("")}
      </select>
      <textarea id="seg-desc" placeholder="Detalle de la oportunidad..." style="margin-top:8px;"></textarea>
    </div>
    <button class="btn btn-ghost btn-block" id="add-seg">+ Añadir al historial</button>
  `;

  modalBg.classList.add("show");
  document.getElementById("modal-close").onclick = () => modalBg.classList.remove("show");
  modalBg.onclick = (e) => { if (e.target === modalBg) modalBg.classList.remove("show"); };

  document.getElementById("guardar-cambios").onclick = async (ev) => {
    const btn = ev.target;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      await Api.updateCliente(c.ID, {
        Estado: document.getElementById("estado-select").value,
        Notas: document.getElementById("notas-edit").value,
      });
      toast("Cliente actualizado", "ok");
      modalBg.classList.remove("show");
      cargarTodo();
    } catch (err) {
      toast("Error: " + err.message, "error");
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  };

  document.getElementById("add-seg").onclick = async (ev) => {
    const btn = ev.target;
    const desc = document.getElementById("seg-desc").value.trim();
    if (!desc) { toast("Describe la oportunidad", "error"); return; }
    btn.disabled = true;
    btn.textContent = "Añadiendo...";
    try {
      await Api.addSeguimiento({
        ClienteID: c.ID,
        Tipo: document.getElementById("seg-tipo").value,
        Descripcion: desc,
        Estado: "Pendiente",
      });
      toast("Oportunidad añadida", "ok");
      modalBg.classList.remove("show");
      cargarTodo();
    } catch (err) {
      toast("Error: " + err.message, "error");
      btn.disabled = false;
      btn.textContent = "+ Añadir al historial";
    }
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

[...document.querySelectorAll(".filter-chip")].forEach((chip) => {
  chip.onclick = () => {
    filtroActivo = chip.dataset.f;
    [...document.querySelectorAll(".filter-chip")].forEach((c) => c.classList.toggle("active", c === chip));
    render();
  };
});

cargarTodo();
