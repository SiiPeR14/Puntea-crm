# Puntea — CRM de campo para Adam y Sergi

App web (sin backend propio, sin servidor que mantener) para registrar
visitas puerta a puerta y llevar la ficha de los clientes que compran
tarjetas NFC. Los datos viven en una **Google Sheet compartida**; la app
es un frontend estático que se despliega gratis en **Vercel**.

```
puntea/
├── index.html          → Pantalla "Registrar visita" (home)
├── visitas.html         → Listado de visitas + filtros
├── clientes.html        → Clientes vendidos + estadísticas
├── manifest.json         → Permite "Añadir a pantalla de inicio"
├── css/style.css         → Todo el diseño
├── js/
│   ├── config.js          → ⚠️ AQUÍ pegas la URL de tu Apps Script
│   ├── api.js              → Llamadas a la API
│   ├── ui.js                → Utilidades (toasts, formatos, badges)
│   ├── registrar.js          → Lógica de la pantalla 1
│   ├── visitas.js             → Lógica de la pantalla 2
│   └── clientes.js             → Lógica de la pantalla 3
└── apps-script/
    └── Code.gs             → Backend: convierte la Sheet en API
```

No hay build, ni `npm install`, ni frameworks: son ficheros HTML/CSS/JS
planos, así que cualquiera puede tocarlos con un editor de texto.

---

## Paso 1 — Crear la base de datos en Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja de
   cálculo nueva. Llámala, por ejemplo, **"Puntea - Base de datos"**.
2. Abre **Extensiones → Apps Script**. Se abrirá un editor de código
   vinculado a esa hoja.
3. Borra el contenido de `Code.gs` que aparece por defecto y pega **todo**
   el contenido del fichero [`apps-script/Code.gs`](apps-script/Code.gs)
   de este proyecto.
4. Guarda (icono de disquete o `Ctrl/Cmd + S`). Ponle un nombre al
   proyecto, por ejemplo "Puntea API".
5. (Opcional pero recomendado) En el desplegable de funciones de la
   barra superior selecciona `setup` y pulsa **▶ Ejecutar** una vez.
   Esto crea ya las tres pestañas (`Visitas`, `Clientes`,
   `Seguimientos`) con sus cabeceras. La primera vez te pedirá autorizar
   permisos: acepta con tu cuenta de Google (es tu propio script, sobre
   tu propia hoja).
6. Despliega el script como aplicación web:
   - Botón **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Descripción: `Puntea API v1`.
   - "Ejecutar como": **Yo (tu cuenta)**.
   - "Quién tiene acceso": **Cualquier usuario** (necesario para que la
     app pueda leer/escribir sin que cada uno tenga que iniciar sesión
     con Google; los datos solo son accesibles conociendo la URL secreta
     que se genera).
   - Pulsa **Implementar** y autoriza de nuevo si te lo pide.
7. Copia la **URL de la aplicación web** que te da (termina en `/exec`).
   Esa es la URL que conecta tu app con la Sheet.

> 💡 Cada vez que edites `Code.gs` en el futuro, tendrás que volver a
> **Implementar → Gestionar implementaciones → ✏️ (editar) → Nueva
> versión → Implementar** para que los cambios se apliquen. La URL no
> cambia.

---

## Paso 2 — Conectar la app con tu Sheet

Abre `js/config.js` y sustituye la URL de ejemplo:

```js
const PUNTEA_CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXXXXXXXXX/exec",
  COMERCIALES: ["Adam", "Sergi"],
};
```

Eso es todo. Ya no hay que tocar ni Airtable, ni claves de API, ni
`.env`: la URL de Apps Script es pública mediante enlace (nadie puede
adivinarla) y hace de intermediaria segura entre la app y la Sheet.

---

## Paso 3 — Probar en local (opcional)

Como son ficheros estáticos, puedes abrir `index.html` directamente en
el navegador, o mejor, servirlos con un servidor simple para evitar
restricciones del navegador con `file://`:

```bash
cd puntea
python3 -m http.server 8000
# abre http://localhost:8000
```

Registra una visita de prueba y comprueba que aparece en tu Google
Sheet al momento.

---

## Paso 4 — Subir a Vercel (gratis)

**Opción A — Sin usar la terminal (recomendada):**

1. Sube la carpeta `puntea/` a un repositorio de GitHub (puedes
   arrastrar los ficheros directamente en github.com → "Add file →
   Upload files").
2. Entra en [vercel.com](https://vercel.com) → **Add New → Project**.
3. Importa ese repositorio.
4. Framework Preset: **Other** (o "Static"). No hace falta build
   command ni output directory: Vercel sirve los HTML tal cual.
5. Pulsa **Deploy**. En menos de un minuto tendrás una URL tipo
   `https://puntea.vercel.app`.

**Opción B — Con la CLI de Vercel:**

```bash
npm install -g vercel
cd puntea
vercel --prod
```

Sigue las preguntas (proyecto nuevo, sin build command) y te dará la
URL de producción.

> Netlify funciona exactamente igual: arrastra la carpeta `puntea/`
> directamente en [app.netlify.com/drop](https://app.netlify.com/drop)
> y listo, sin necesidad de repositorio.

---

## Paso 5 — Usarla desde el móvil (Adam y Sergi)

1. Abre la URL de Vercel (`https://puntea.vercel.app`) en el navegador
   del móvil (Safari en iPhone, Chrome en Android).
2. Añádela a la pantalla de inicio para que se abra como una app:
   - **iPhone**: botón compartir → "Añadir a pantalla de inicio".
   - **Android**: menú (⋮) → "Añadir a pantalla de inicio" / "Instalar
     app".
3. La primera vez que se abre, en la pantalla "Registrar" hay que tocar
   el chip **Adam** o **Sergi** una vez — la app lo recuerda en ese
   móvil para las siguientes visitas.
4. Como los dos leéis y escribís la misma Google Sheet, cualquier
   visita o venta que registre uno la ve el otro al instante (solo hay
   que refrescar la pantalla de Visitas/Clientes).

---

## Cómo funciona por dentro

- **Registrar visita** guarda una fila en la pestaña `Visitas`. Si el
  resultado es *"Venta cerrada"*, el propio script crea automáticamente
  una fila nueva en `Clientes` con estado `Activo`, para que no tengáis
  que duplicar la entrada de datos.
- **Listado de visitas** lee la pestaña `Visitas` y permite filtrar por
  comercial, resultado o "hoy".
- **Clientes** lee `Clientes` (con su historial de `Seguimientos`
  asociado) y calcula las estadísticas en el propio navegador: ingresos
  totales, tarjetas vendidas, tasa de conversión y comparativa Adam vs
  Sergi.
- Desde la ficha de un cliente podéis cambiar su **Estado** (Activo /
  Posible upsell / Inactivo), editar las notas, y añadir entradas al
  **historial de oportunidades futuras** (reposición de tarjetas,
  gestión de reseñas, respuestas automáticas, packs...). Todo eso se
  guarda en la pestaña `Seguimientos`, enlazada al cliente por su ID.

---

## Preparado para crecer

- **Añadir un campo nuevo a una visita o cliente**: añade la columna en
  la cabecera de la Sheet, añade la clave en el objeto `HEADERS` de
  `Code.gs`, y añade el `<input>` correspondiente en el HTML + el campo
  en el objeto `payload` de `registrar.js`. No hace falta tocar nada
  más: `appendObject_` mapea automáticamente por nombre de columna.
- **Añadir un tercer comercial**: solo hay que añadir su nombre al
  array `COMERCIALES` en `js/config.js`.
- **Añadir un nuevo resultado de visita**: añade un objeto al array
  `RESULTADOS` en `js/ui.js` (con `value`, `emoji` y `tone` de color:
  `success` / `brand` / `warning` / `danger` / `neutral`).
- **Exportar/analizar datos**: como todo vive en una Google Sheet
  normal, siempre podéis abrir las pestañas `Visitas` / `Clientes` /
  `Seguimientos` directamente, hacer tablas dinámicas, exportarlas a
  Excel, o conectarlas a Looker Studio para dashboards más avanzados.
- **Notificaciones o recordatorios de seguimiento**: se puede añadir
  fácilmente un disparador de tiempo en Apps Script (`Triggers`) que
  revise la columna `FechaSeguimiento` de `Visitas` cada mañana y envíe
  un email/Slack cuando toque volver a llamar a alguien.

---

## Problemas frecuentes

- **"Puntea aún no está conectado a Google Sheets"**: falta pegar la
  URL en `js/config.js`, o la URL no termina en `/exec`.
- **Error `NOT_CONFIGURED` o de red al guardar**: revisa que la
  implementación de Apps Script tenga acceso "Cualquier usuario" (paso
  1.6) y que hayas desplegado una **implementación**, no solo guardado
  el script.
- **Los cambios en `Code.gs` no se reflejan**: hay que crear una
  **nueva versión** de la implementación (Implementar → Gestionar
  implementaciones → editar → Nueva versión), guardar el script solo no
  actualiza la URL publicada.
- **Un comercial ve visitas del otro que no debería**: es intencionado,
  todo es compartido; si en el futuro queréis vistas privadas, se puede
  añadir sin problema.
