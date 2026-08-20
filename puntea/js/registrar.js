// ===========================================================
// PUNTEA — Registrar visita
// ===========================================================

renderConfigBanner("config-banner");

// Reloj en la cabecera
function tickClock() {
  document.getElementById("clock").textContent = nowHM();
}
tickClock();
setInterval(tickClock, 30000);

// Comercial
const comercialWrap = document.getElementById("comercial-select");
let comercialActivo = localStorage.getItem("puntea_comercial") || "";
PUNTEA_CONFIG.COMERCIALES.forEach((nombre) => {
  const chip = document.createElement("div");
  chip.className = "chip" + (nombre === comercialActivo ? " active" : "");
  chip.textContent = nombre;
  chip.onclick = () => {
    comercialActivo = nombre;
    localStorage.setItem("puntea_comercial", nombre);
    [...comercialWrap.children].forEach((c) => c.classList.toggle("active", c === chip));
  };
  comercialWrap.appendChild(chip);
});

// Resultado de visita (botones grandes)
const resultadoGrid = document.getElementById("resultado-grid");
const resultadoInput = document.getElementById("resultado");
const ventaFields = document.getElementById("venta-fields");

RESULTADOS.forEach((r) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "result-btn";
  btn.dataset.tone = r.tone;
  btn.innerHTML = `<span class="emoji">${r.emoji}</span><span>${r.value}</span>`;
  btn.onclick = () => {
    resultadoInput.value = r.value;
    [...resultadoGrid.children].forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ventaFields.style.display = r.value === "Venta cerrada" ? "block" : "none";
  };
  resultadoGrid.appendChild(btn);
});

// Autorrelleno de fecha / hora de llegada
document.getElementById("fecha").value = todayISO();
document.getElementById("horaLlegada").value = nowHM();

// Duración en vivo
const horaSalidaInput = document.getElementById("horaSalida");
horaSalidaInput.addEventListener("focus", () => {
  if (!horaSalidaInput.value) horaSalidaInput.value = nowHM();
});

// Envío
const form = document.getElementById("visita-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!comercialActivo) {
    toast("Selecciona qué comercial hace la visita", "error");
    return;
  }
  if (!resultadoInput.value) {
    toast("Selecciona el resultado de la visita", "error");
    return;
  }
  if (!Api.isConfigured()) {
    toast("Falta conectar Google Sheets — mira el README", "error");
    return;
  }

  const payload = {
    Comercial: comercialActivo,
    NombreNegocio: val("nombreNegocio"),
    Direccion: val("direccion"),
    TipoNegocio: val("tipoNegocio"),
    PersonaContacto: val("personaContacto"),
    Cargo: val("cargo"),
    Telefono: val("telefono"),
    Email: val("email"),
    GoogleMapsLink: val("googleMapsLink"),
    Fecha: val("fecha"),
    HoraLlegada: val("horaLlegada"),
    HoraSalida: val("horaSalida"),
    Resultado: resultadoInput.value,
    NumTarjetas: val("numTarjetas"),
    Importe: val("importe"),
    FormaPago: val("formaPago"),
    Notas: val("notas"),
    Objeciones: val("objeciones"),
    ProximaAccion: val("proximaAccion"),
    FechaSeguimiento: val("fechaSeguimiento"),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Guardando...";
  try {
    await Api.addVisita(payload);
    toast(
      payload.Resultado === "Venta cerrada" ? "¡Venta registrada! 🎉" : "Visita guardada",
      "ok"
    );
    resetForm();
  } catch (err) {
    toast("Error al guardar: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Guardar visita";
  }
});

function val(id) {
  return document.getElementById(id).value.trim();
}

function resetForm() {
  const keepComercial = comercialActivo;
  form.reset();
  document.getElementById("fecha").value = todayISO();
  document.getElementById("horaLlegada").value = nowHM();
  resultadoInput.value = "";
  ventaFields.style.display = "none";
  [...resultadoGrid.children].forEach((b) => b.classList.remove("active"));
  comercialActivo = keepComercial;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
