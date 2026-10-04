# Mis clases

Agenda de clases particulares: quién viene cuándo, cuánto cobra cada uno por hora, cuánto ganaste por semana y por mes, quién te debe, y un simulador de "¿y si sumo alumnos?". Hecho para el **iPad** (Safari), funciona sin internet y los datos quedan solo en ese iPad. Hermana de [Biblioteca](https://github.com/MateoLong/biblioteca): mismo aspecto.

## Para usarla en el iPad

1. Abrí la dirección en **Safari** → **Compartir** → **Agregar a pantalla de inicio**.
2. Abrila siempre desde el ícono "Mis clases". Funciona aunque no haya Wi-Fi.
3. La primera vez: probá con **datos de ejemplo**, o agregá tus alumnos en **Alumnos** (nombre, tarifa por hora, día y hora de su clase).

- **Agenda**: la semana con cada clase como una etiqueta. Tocá una para cancelarla (con o sin cobrarla), moverla o ver la ficha. A la derecha: lo ganado, lo que falta, **quién te debe** (botón Cobrar) y **Clase extra**.
- **Alumnos**: tarifa (los aumentos rigen desde una fecha; lo anterior no cambia), días de clase, pagos y cuenta de cada uno.
- **Ganancias**: por mes y por semana (lo ganado y lo agendado), y este mes por alumno.
- **¿Y si…?**: elegí cuántos alumnos nuevos, cuántas clases por semana, cuánto duran y a qué tarifa, y mirá cuánto ganarías por mes y por año.
- **Arriba a la derecha**: UYU / USD. La cotización se escribe en **Ajustes**.

Todo se guarda solo en el iPad: una vez por semana, **Ajustes → Guardar copia de seguridad** (la app lo recuerda).

## For developers

- Static site, no build: `app/static/`. Money and agenda logic in `registry.js` (pure, Node + browser); `store.js` keeps it in IndexedDB (coalesced writes) and makes the files; `app.js` draws the screens; charts are hand-built SVG (palette checked with the dataviz validator: dado #2347b5 / previsto #6d8cf0, hoy #2347b5 / nuevos #21804a).
- `npm test` (registry), `cd tests/e2e && npm install && npx playwright install webkit && npm run verify` (WebKit, iPad sizes). See `VERIFY.md`.
- Design: `PRODUCT.md`, `DESIGN.md` (shared with Biblioteca), `.impeccable/surfaces/`.
