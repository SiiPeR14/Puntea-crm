// ===========================================================
// PUNTEA — Cliente de la API (Google Apps Script)
// ===========================================================

const Api = (() => {
  function isConfigured() {
    return (
      PUNTEA_CONFIG.API_URL &&
      PUNTEA_CONFIG.API_URL.startsWith("http") &&
      PUNTEA_CONFIG.API_URL.includes("/exec")
    );
  }

  async function get(action, params = {}) {
    if (!isConfigured()) throw new Error("NOT_CONFIGURED");
    const url = new URL(PUNTEA_CONFIG.API_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), { method: "GET" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Error desconocido");
    return json.data;
  }

  async function post(action, data = {}) {
    if (!isConfigured()) throw new Error("NOT_CONFIGURED");
    // Content-Type text/plain evita el preflight CORS de Apps Script.
    const res = await fetch(PUNTEA_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, data }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Error desconocido");
    return json.data;
  }

  return {
    isConfigured,
    listVisitas: (params) => get("visitas", params),
    listClientes: (params) => get("clientes", params),
    addVisita: (data) => post("add_visita", data),
    updateCliente: (id, data) => post("update_cliente", { id, ...data }),
    addSeguimiento: (data) => post("add_seguimiento", data),
  };
})();
