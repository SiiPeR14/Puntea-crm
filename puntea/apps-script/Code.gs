/**
 * ===========================================================
 * PUNTEA — API sobre Google Sheets (Google Apps Script)
 * ===========================================================
 * Este script convierte una Google Sheet en la base de datos
 * compartida de Adam y Sergi. Se despliega como "Aplicación web"
 * y el frontend (Vercel/Netlify) le habla por HTTP.
 *
 * Hojas que gestiona (se crean solas la primera vez que se usan):
 *   - Visitas
 *   - Clientes
 *   - Seguimientos
 *
 * Instrucciones de despliegue: ver README.md del proyecto.
 * ===========================================================
 */

const SHEET_VISITAS = "Visitas";
const SHEET_CLIENTES = "Clientes";
const SHEET_SEGUIMIENTOS = "Seguimientos";

const HEADERS = {
  [SHEET_VISITAS]: [
    "ID", "Fecha", "HoraLlegada", "HoraSalida", "DuracionMin", "Comercial",
    "NombreNegocio", "Direccion", "TipoNegocio", "PersonaContacto", "Cargo",
    "Telefono", "Email", "GoogleMapsLink", "Resultado", "NumTarjetas",
    "Importe", "FormaPago", "Notas", "Objeciones", "ProximaAccion",
    "FechaSeguimiento", "ClienteID", "FotoURL", "CreatedAt"
  ],
  [SHEET_CLIENTES]: [
    "ID", "NombreNegocio", "Direccion", "TipoNegocio", "PersonaContacto",
    "Cargo", "Telefono", "Email", "GoogleMapsLink", "FechaVenta",
    "ImporteTotal", "NumTarjetas", "Comercial", "Estado", "Notas",
    "VisitaID", "FotoURL", "CreatedAt"
  ],
  [SHEET_SEGUIMIENTOS]: [
    "ID", "ClienteID", "Fecha", "Tipo", "Descripcion", "Estado", "CreatedAt"
  ],
};

// -----------------------------------------------------------
// Utilidades de hoja
// -----------------------------------------------------------

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = values.slice(1);
  return rows
    .filter((r) => r.some((c) => c !== "" && c !== null))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
        obj[h] = v;
      });
      return obj;
    });
}

function appendObject_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));
  sheet.appendRow(row);
}

function updateRowById_(sheet, id, patch) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("ID");
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(id)) {
      headers.forEach((h, c) => {
        if (patch[h] !== undefined) {
          sheet.getRange(r + 1, c + 1).setValue(patch[h]);
        }
      });
      return true;
    }
  }
  return false;
}

function newId_(prefix) {
  return prefix + "_" + Utilities.getUuid().slice(0, 8);
}

// -----------------------------------------------------------
// Fotos de venta (Google Drive)
// -----------------------------------------------------------

const FOTOS_FOLDER_NAME = "Puntea - Fotos de ventas";

function getFotosFolder_() {
  const it = DriveApp.getFoldersByName(FOTOS_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(FOTOS_FOLDER_NAME);
}

// Recibe un data URL ("data:image/jpeg;base64,....") y devuelve
// la URL pública (ver con enlace) del archivo subido a Drive.
function subirFotoVenta_(dataUrl, nombreBase) {
  if (!dataUrl) return "";
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Formato de foto no válido");
  const mimeType = match[1];
  const base64Data = match[2];
  const ext = mimeType.split("/")[1] || "jpg";

  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType, nombreBase + "." + ext);

  const folder = getFotosFolder_();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return "https://drive.google.com/uc?id=" + file.getId();
}

function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nowIso_() {
  return new Date().toISOString();
}

// Calcula minutos entre HH:mm y HH:mm (si faltan, devuelve "")
function duracionMin_(llegada, salida) {
  if (!llegada || !salida) return "";
  const [h1, m1] = String(llegada).split(":").map(Number);
  const [h2, m2] = String(salida).split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => isNaN(n))) return "";
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60; // visita que cruza medianoche
  return mins;
}

// -----------------------------------------------------------
// Salida JSON con CORS
// -----------------------------------------------------------

function jsonOut_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) { return jsonOut_({ ok: true, data }); }
function fail_(msg) { return jsonOut_({ ok: false, error: String(msg) }); }

// -----------------------------------------------------------
// Router
// -----------------------------------------------------------

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "visitas") {
      let data = sheetToObjects_(getSheet_(SHEET_VISITAS));
      if (e.parameter.comercial) {
        data = data.filter((v) => v.Comercial === e.parameter.comercial);
      }
      data.sort((a, b) => (b.CreatedAt || "").localeCompare(a.CreatedAt || ""));
      return ok_(data);
    }
    if (action === "clientes") {
      let data = sheetToObjects_(getSheet_(SHEET_CLIENTES));
      const segs = sheetToObjects_(getSheet_(SHEET_SEGUIMIENTOS));
      data = data.map((c) => ({
        ...c,
        Seguimientos: segs.filter((s) => s.ClienteID === c.ID),
      }));
      data.sort((a, b) => (b.CreatedAt || "").localeCompare(a.CreatedAt || ""));
      return ok_(data);
    }
    return fail_("Acción GET no reconocida: " + action);
  } catch (err) {
    return fail_(err.message || err);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data || {};

    if (action === "add_visita") return ok_(addVisita_(data));
    if (action === "update_cliente") return ok_(updateCliente_(data));
    if (action === "add_seguimiento") return ok_(addSeguimiento_(data));

    return fail_("Acción POST no reconocida: " + action);
  } catch (err) {
    return fail_(err.message || err);
  }
}

// -----------------------------------------------------------
// Casos de uso
// -----------------------------------------------------------

function addVisita_(data) {
  const sheet = getSheet_(SHEET_VISITAS);
  const id = newId_("V");
  const createdAt = nowIso_();
  const duracion = duracionMin_(data.HoraLlegada, data.HoraSalida);

  let fotoUrl = "";
  if (data.FotoBase64) {
    fotoUrl = subirFotoVenta_(data.FotoBase64, id);
  }

  let clienteId = "";
  if (data.Resultado === "Venta cerrada") {
    clienteId = crearClienteDesdeVisita_(data, id, fotoUrl);
  }

  const visita = {
    ID: id,
    Fecha: data.Fecha || todayStr_(),
    HoraLlegada: data.HoraLlegada || "",
    HoraSalida: data.HoraSalida || "",
    DuracionMin: duracion,
    Comercial: data.Comercial || "",
    NombreNegocio: data.NombreNegocio || "",
    Direccion: data.Direccion || "",
    TipoNegocio: data.TipoNegocio || "",
    PersonaContacto: data.PersonaContacto || "",
    Cargo: data.Cargo || "",
    Telefono: data.Telefono || "",
    Email: data.Email || "",
    GoogleMapsLink: data.GoogleMapsLink || "",
    Resultado: data.Resultado || "",
    NumTarjetas: data.NumTarjetas || "",
    Importe: data.Importe || "",
    FormaPago: data.FormaPago || "",
    Notas: data.Notas || "",
    Objeciones: data.Objeciones || "",
    ProximaAccion: data.ProximaAccion || "",
    FechaSeguimiento: data.FechaSeguimiento || "",
    ClienteID: clienteId,
    FotoURL: fotoUrl,
    CreatedAt: createdAt,
  };

  appendObject_(sheet, visita);
  return visita;
}

function crearClienteDesdeVisita_(data, visitaId, fotoUrl) {
  const sheet = getSheet_(SHEET_CLIENTES);
  const id = newId_("C");
  const cliente = {
    ID: id,
    NombreNegocio: data.NombreNegocio || "",
    Direccion: data.Direccion || "",
    TipoNegocio: data.TipoNegocio || "",
    PersonaContacto: data.PersonaContacto || "",
    Cargo: data.Cargo || "",
    Telefono: data.Telefono || "",
    Email: data.Email || "",
    GoogleMapsLink: data.GoogleMapsLink || "",
    FechaVenta: data.Fecha || todayStr_(),
    ImporteTotal: data.Importe || 0,
    NumTarjetas: data.NumTarjetas || 0,
    Comercial: data.Comercial || "",
    Estado: "Activo",
    Notas: data.Notas || "",
    VisitaID: visitaId,
    FotoURL: fotoUrl || "",
    CreatedAt: nowIso_(),
  };
  appendObject_(sheet, cliente);
  return id;
}

function updateCliente_(data) {
  const sheet = getSheet_(SHEET_CLIENTES);
  if (!data.id) throw new Error("Falta id de cliente");
  const patch = { ...data };
  delete patch.id;
  const okUpdate = updateRowById_(sheet, data.id, patch);
  if (!okUpdate) throw new Error("Cliente no encontrado: " + data.id);
  return { updated: true, id: data.id };
}

function addSeguimiento_(data) {
  const sheet = getSheet_(SHEET_SEGUIMIENTOS);
  const seguimiento = {
    ID: newId_("S"),
    ClienteID: data.ClienteID || "",
    Fecha: data.Fecha || todayStr_(),
    Tipo: data.Tipo || "",
    Descripcion: data.Descripcion || "",
    Estado: data.Estado || "Pendiente",
    CreatedAt: nowIso_(),
  };
  if (!seguimiento.ClienteID) throw new Error("Falta ClienteID");
  appendObject_(sheet, seguimiento);
  return seguimiento;
}

// -----------------------------------------------------------
// Inicialización manual (opcional): ejecútala una vez desde el
// editor de Apps Script (menú ▶ Ejecutar > setup) para crear las
// tres hojas con sus cabeceras antes de desplegar.
// -----------------------------------------------------------
function setup() {
  getSheet_(SHEET_VISITAS);
  getSheet_(SHEET_CLIENTES);
  getSheet_(SHEET_SEGUIMIENTOS);
}
