/* Mis clases: the whole front end. Hash routes, one view per section.
   Data lives on this iPad (store.js); the money maths lives in registry.js. */
import { start, flushed, download, reg } from "./store.js";
import { addDays, weekStart, weekday, toMinutes, fromMinutes, parseNumber, RegistryError } from "./registry.js";

// ── helpers ───────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const main = $("#main");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<svg aria-hidden="true"><use href="icons.svg#i-${name}"/></svg>`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180];

const cur = () => reg.state.settings.currency;
const fmt = (cy, digits) => new Intl.NumberFormat("es-UY", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Money in a currency: "$ 1.200", "US$ 45,50". */
function moneyIn(v, cy) {
  const n = Number(v) || 0;
  const digits = cy === "USD" && Math.round(n) !== Math.round(n * 100) / 100 ? 2 : 0;
  return `${cy === "USD" ? "US$" : "$"} ${fmt(cy, digits).format(cy === "USD" ? n : Math.round(n))}`;
}
/** An amount in a student's currency, shown in hers. */
const shown = (amount, from) => moneyIn(reg.convert(amount, from), cur());
const money = (v) => moneyIn(v, cur());

const dayNum = (iso) => Number(iso.slice(8));
const monNum = (iso) => Number(iso.slice(5, 7));
const fmtDM = (iso) => `${dayNum(iso)}/${monNum(iso)}`;
const fmtDayLong = (iso) => `${DAYS[weekday(iso) - 1]} ${fmtDM(iso)}`;
const fmtDayShort = (iso) => `${DAYS_SHORT[weekday(iso) - 1].toLowerCase()} ${fmtDM(iso)}`;
function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  if (m === 30) return `${h}½ h`;
  return m ? `${h} h ${m}` : `${h} h`;
}
const fmtHours = (hours) => fmtDuration(Math.round(hours * 60));
/** "17/10", "17-10-2026" -> ISO; without a year, a date far in the past means next year. */
function parseDM(text) {
  const m = String(text).trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2}|\d{4}))?$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]);
  const today = reg.today();
  let y = m[3] ? Number(m[3].length === 2 ? "20" + m[3] : m[3]) : Number(today.slice(0, 4));
  const iso = (yy) => `${yy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const t = new Date(`${iso(y)}T12:00:00`);
  if (t.getDate() !== d || t.getMonth() + 1 !== mo) return null;
  if (!m[3] && iso(y) < addDays(today, -180)) y += 1;
  return iso(y);
}

// Each student keeps one forro colour everywhere (dark inks only: white initials sit on them).
const INKS = ["cobalto", "tomate", "pasto", "violeta", "turquesa", "rosa"];
const ink = (id) => `var(--f-${INKS[(Number(id) * 5 + 1) % INKS.length]})`;
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const avatar = (s, size = 34) => `<span class="avatar" style="--c:${ink(s.id)};width:${size}px;height:${size}px;font-size:${size * 0.38}px" aria-hidden="true">${esc(initials(s.name))}</span>`;

// ── toasts & undo ─────────────────────────────────────────────────────
function toast(message, { action, label = "Deshacer", error = false, ms = 7000 } = {}) {
  const el = document.createElement("div");
  el.className = "toast" + (error ? " is-error" : "");
  el.setAttribute("role", error ? "alert" : "status");
  const p = document.createElement("p");
  p.textContent = message;
  el.append(p);
  if (action) {
    const b = document.createElement("button");
    b.className = "btn btn-sm";
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => { el.remove(); action(); });
    el.append(b);
  }
  const stack = $(".toasts");
  stack.append(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => el.remove(), ms);
}

/** Run a change; on error show it; offer Deshacer that puts the previous state back. */
function act(fn, message, { undo = true, after = route } = {}) {
  const snapshot = reg.state;
  try {
    const out = fn();
    if (message) toast(typeof message === "function" ? message(out) : message, undo ? { action: () => { reg.replaceState(snapshot); toast("Listo, quedó como antes."); route(); } } : {});
    after?.();
    return out ?? true;
  } catch (err) {
    toast(err.message, { error: true });
    return null;
  }
}

/** Same, but shows the error inside a form instead of a toast. */
function actInForm(form, fn, message) {
  const box = $(".form-msg", form);
  try {
    const out = reg.atomic(fn);
    if (box) box.innerHTML = "";
    if (message) toast(typeof message === "function" ? message(out) : message);
    route();
    return out;
  } catch (err) {
    if (box) box.innerHTML = `<div class="notice notice-error" role="alert">${esc(err.message)}</div>`;
    else toast(err.message, { error: true });
    return null;
  }
}

const durationSelect = (name, value = 60, testid = "") =>
  `<select class="input" name="${name}" ${testid ? `data-testid="${testid}"` : ""}>${DURATIONS.map((m) => `<option value="${m}" ${m === Number(value) ? "selected" : ""}>${fmtDuration(m)}</option>`).join("")}</select>`;
const weekdaySelect = (name, value = 1, testid = "") =>
  `<select class="input" name="${name}" ${testid ? `data-testid="${testid}"` : ""}>${DAYS.map((d, i) => `<option value="${i + 1}" ${i + 1 === Number(value) ? "selected" : ""}>${d[0].toUpperCase() + d.slice(1)}</option>`).join("")}</select>`;

// ── chrome ────────────────────────────────────────────────────────────
function refreshChrome() {
  const s = reg.summary();
  $("[data-testid=app-title]").textContent = s.settings.title;
  document.title = s.settings.title;
  $$(".currency-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.currency === s.settings.currency)));
  $("[data-testid=demo-strip]").hidden = !s.has_demo;
}
$$(".currency-switch button").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.currency === cur()) return;
  act(() => reg.updateSettings({ currency: b.dataset.currency }), null, { undo: false });
}));

// ══ AGENDA ═════════════════════════════════════════════════════════════
let selected = null; // key of the selected class
let extraOpen = false;

function viewAgenda(params) {
  const today = reg.today();
  const from = params.get("semana") || weekStart(today);
  const week = reg.week(from);
  const classes = week.classes_list;
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter((d, i) => i < 6 || classes.some((c) => c.date === d));
  const to = addDays(from, 6);
  const thisWeek = from === weekStart(today);
  const past = to < today;
  const sel = classes.find((c) => c.key === selected) || null;
  const range = monNum(from) === monNum(to) ? `${dayNum(from)} – ${dayNum(to)} de ${MONTHS[monNum(to) - 1]}` : `${dayNum(from)} de ${MONTHS[monNum(from) - 1]} – ${dayNum(to)} de ${MONTHS[monNum(to) - 1]}`;
  const students = reg.students();
  const empty = !reg.state.students.length;

  main.innerHTML = `
    ${empty ? firstRun() : backupNudge()}
    <div class="agenda">
      <section class="board-wrap" aria-labelledby="week-h">
        <div class="week-head">
          <a class="btn btn-quiet btn-icon" href="#/agenda?semana=${addDays(from, -7)}" aria-label="Semana anterior" data-testid="prev-week">${icon("chevron-left")}</a>
          <h1 id="week-h">${range}</h1>
          <a class="btn btn-quiet btn-icon" href="#/agenda?semana=${addDays(from, 7)}" aria-label="Semana siguiente" data-testid="next-week">${icon("chevron-right")}</a>
          ${thisWeek ? "" : `<a class="btn btn-line btn-sm" href="#/agenda">Hoy</a>`}
        </div>
        <div class="board" style="--days:${days.length}" data-testid="board">
          ${days.map((d) => {
            const cs = classes.filter((c) => c.date === d);
            return `<section class="day ${d === today ? "is-today" : ""}" aria-label="${fmtDayLong(d)}">
              <h2 class="day-head"><span>${DAYS_SHORT[weekday(d) - 1]}</span> <strong>${dayNum(d)}</strong>${d === today ? `<em>hoy</em>` : ""}</h2>
              <div class="day-classes">${cs.length ? cs.map(classLabel).join("") : `<p class="free">Libre</p>`}</div>
            </section>`;
          }).join("")}
        </div>
      </section>
      <aside class="rail" aria-label="Resumen">
        <section class="panel rail-week" data-testid="week-money">
          <h2>${past ? "Esa semana" : thisWeek ? "Esta semana" : "Esa semana"}</h2>
          <p class="hero-figure" data-testid="week-earned">${money(week.earned)}</p>
          <p class="muted hero-sub">${past ? "ganados" : week.earned ? "ya ganados" : "ganados por ahora"}</p>
          ${week.total ? `<div class="meter" role="img" aria-label="${Math.round((week.earned / week.total) * 100)}% de la semana"><span style="width:${(week.earned / week.total) * 100}%"></span></div>` : ""}
          <dl class="stats">
            ${past ? "" : `<div><dt>Faltan</dt><dd data-testid="week-expected">${money(week.expected)}</dd></div>`}
            <div><dt>Total de la semana</dt><dd>${money(week.total)}</dd></div>
            <div><dt>Clases</dt><dd>${plural(week.classes, "clase", "clases")} · ${fmtHours(week.hours)}</dd></div>
          </dl>
        </section>
        ${sel ? selectedPanel(sel) : ""}
        ${owingPanel()}
        <section class="panel rail-extra">
          ${extraOpen ? extraForm(students, thisWeek ? today : from) : `<button type="button" class="btn btn-go" data-act="open-extra" data-testid="extra-toggle" ${students.length ? "" : "disabled"}>${icon("calendar-plus")}Clase extra</button>`}
        </section>
      </aside>
    </div>`;

  $$(".clase").forEach((b) => b.addEventListener("click", () => { selected = selected === b.dataset.key ? null : b.dataset.key; viewAgenda(params); }));
  wireSelected(sel, params);
  wireOwing();
  $("[data-act=open-extra]")?.addEventListener("click", () => { extraOpen = true; viewAgenda(params); $("#extra-form [name=student]")?.focus(); });
  wireExtra(params);
  wireFirstRun();
}

function classLabel(c) {
  const state = c.status === "cancelled"
    ? (c.charge ? `<span class="state">${icon("calendar-x")}cancelada · se cobra</span>` : `<span class="state">${icon("calendar-x")}cancelada</span>`)
    : c.status === "given" ? `<span class="state">${icon("check")}dada</span>`
    : c.moved_from ? `<span class="state">${icon("calendar-clock")}movida</span>`
    : c.kind === "extra" ? `<span class="state">${icon("plus")}extra</span>` : "";
  const label = `${c.student}, ${fmtDayLong(c.date)} ${c.start}, ${fmtDuration(c.minutes)}, ${shown(c.amount, c.currency)}, ${c.status === "given" ? "dada" : c.status === "cancelled" ? "cancelada" : "agendada"}`;
  return `<button type="button" class="clase is-${c.status} ${c.charge ? "is-charged" : ""}" style="--c:${ink(c.student_id)}" data-key="${c.key}" aria-pressed="${c.key === selected}" aria-label="${esc(label)}" data-testid="clase">
    <span class="clase-top"><span class="clase-time">${c.start}</span><span class="clase-dur">${fmtDuration(c.minutes)}</span></span>
    <span class="clase-name hand">${esc(c.student)}</span>
    <span class="clase-foot"><span class="amount">${c.status === "cancelled" && !c.charge ? "—" : shown(c.amount, c.currency)}</span>${state}</span>
  </button>`;
}

function selectedPanel(c) {
  const end = fromMinutes(toMinutes(c.start) + c.minutes);
  const canRestore = c.status === "cancelled" || c.moved_from;
  return `<section class="panel rail-selected" style="--c:${ink(c.student_id)}" data-testid="selected-class" aria-label="Clase elegida">
    <div class="selected-head">${avatar({ id: c.student_id, name: c.student }, 40)}<div><h2>${esc(c.student)}</h2>
      <p class="muted">${fmtDayLong(c.date)} · ${c.start} a ${end}</p></div></div>
    <p class="selected-money">${c.status === "cancelled" ? (c.charge ? `Cancelada, <strong>se cobra ${shown(c.amount, c.currency)}</strong>` : "Cancelada, no se cobra") : `${c.status === "given" ? "Dada" : "Agendada"} · <strong>${shown(c.amount, c.currency)}</strong>`}
      ${c.moved_from ? `<br><span class="muted">Movida desde el ${fmtDayLong(c.moved_from)}</span>` : ""}</p>
    <div class="btn-col">
      ${c.status !== "cancelled" ? `<button type="button" class="btn btn-line btn-sm" data-act="cancel" data-testid="cancel-class">${icon("calendar-x")}Cancelar</button>
        <button type="button" class="btn btn-line btn-sm" data-act="cancel-charge" data-testid="cancel-charge">Cancelar y cobrar igual</button>` : ""}
      ${c.status === "cancelled" && !c.charge ? `<button type="button" class="btn btn-line btn-sm" data-act="cancel-charge">Cobrarla igual</button>` : ""}
      ${canRestore ? `<button type="button" class="btn btn-line btn-sm" data-act="restore" data-testid="restore-class">${icon("undo-2")}Volver a su día y hora</button>` : ""}
      <button type="button" class="btn btn-quiet btn-sm" data-act="move-open" data-testid="move-open">${icon("calendar-clock")}Mover</button>
    </div>
    <form class="move-form" hidden novalidate data-testid="move-form">
      <div class="row-2">
        <label class="field"><span>Día</span><input class="input" name="date" value="${fmtDM(c.date)}" inputmode="numeric" placeholder="17/10"></label>
        <label class="field"><span>Hora</span><input class="input" name="start" value="${c.start}" inputmode="numeric" placeholder="17:30"></label>
      </div>
      <div class="form-msg"></div>
      <button class="btn btn-go btn-sm" type="submit">Mover la clase</button>
    </form>
    <a class="link-small" href="#/alumnos/${c.student_id}">Ver la ficha de ${esc(c.student.split(" ")[0])} →</a>
  </section>`;
}

function wireSelected(c, params) {
  if (!c) return;
  const panel = $("[data-testid=selected-class]");
  const when = `${c.student.split(" ")[0]}, ${fmtDayShort(c.date)}`;
  $("[data-act=cancel]", panel)?.addEventListener("click", () => act(() => reg.cancelClass(c.key), `Cancelada: ${when}.`));
  $$("[data-act=cancel-charge]", panel).forEach((b) => b.addEventListener("click", () => act(() => reg.cancelClass(c.key, { charge: true }), `Cancelada, se cobra igual: ${when}.`)));
  $("[data-act=restore]", panel)?.addEventListener("click", () => act(() => reg.restoreClass(c.key), `La clase volvió a su día: ${when}.`));
  const form = $(".move-form", panel);
  $("[data-act=move-open]", panel).addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) form.date.focus(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = parseDM(form.date.value);
    if (!date) { $(".form-msg", form).innerHTML = `<div class="notice notice-error" role="alert">No entendí el día. Escribilo como 17/10.</div>`; return; }
    actInForm(form, () => reg.moveClass(c.key, { date, start: form.start.value }), `Movida al ${fmtDayLong(date)} a las ${form.start.value.trim()}.`);
    if (date < weekStart(reg.today()) || date > addDays(weekStart(params.get("semana") || reg.today()), 6)) location.hash = `#/agenda?semana=${weekStart(date)}`;
  });
}

function owingPanel() {
  const owing = reg.owing();
  const total = owing.reduce((n, o) => n + o.owes_display, 0);
  return `<section class="panel rail-owing" data-testid="owing">
    <h2>Te deben ${owing.length ? `<span class="owing-total">${money(total)}</span>` : ""}</h2>
    ${owing.length ? `<ul class="owing-list">${owing.map((o) => `<li data-student="${o.id}">
        <span class="swatch-dot" style="--c:${ink(o.id)}" aria-hidden="true"></span>
        <a href="#/alumnos/${o.id}" class="owing-name">${esc(o.name)}</a>
        <span class="owing-amount">${moneyIn(o.owes_display, cur())}${o.currency !== cur() ? `<small>${moneyIn(o.owes, o.currency)}</small>` : ""}</span>
        <button type="button" class="btn btn-line btn-sm" data-pay="${o.id}" aria-label="Cobrar ${moneyIn(o.owes, o.currency)} a ${esc(o.name)}">${icon("hand-coins")}Cobrar</button>
        <span class="stamp" aria-hidden="true">Pagado</span>
      </li>`).join("")}</ul>` : `<p class="muted">Todos al día.</p>`}
  </section>`;
}

function wireOwing() {
  $$("[data-pay]").forEach((b) => b.addEventListener("click", () => {
    const st = reg.student(b.dataset.pay);
    const amount = st.owes;
    const snapshot = reg.state;
    try {
      reg.addPayment(st.id, { amount });
    } catch (err) { toast(err.message, { error: true }); return; }
    // The signature moment: the row gets stamped PAGADO, then the list settles.
    const row = b.closest("li");
    row.classList.add("is-paid");
    b.disabled = true;
    toast(`Cobrado: ${moneyIn(amount, st.currency)} de ${st.name}.`, { action: () => { reg.replaceState(snapshot); toast("Listo, quedó como antes."); route(); } });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(route, reduce ? 300 : 1100);
  }));
}

function extraForm(students, day) {
  return `<form id="extra-form" class="extra-form" novalidate data-testid="extra-form">
    <h2>Clase extra</h2>
    <label class="field"><span>Con</span><select class="input" name="student" data-testid="extra-student">${students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
    <div class="row-2">
      <label class="field"><span>Día</span><input class="input" name="date" value="${fmtDM(day)}" inputmode="numeric" placeholder="17/10" data-testid="extra-date"></label>
      <label class="field"><span>Hora</span><input class="input" name="start" value="" inputmode="numeric" placeholder="17:30" data-testid="extra-start"></label>
    </div>
    <label class="field"><span>Duración</span>${durationSelect("minutes", 60)}</label>
    <div class="form-msg"></div>
    <div class="row"><button class="btn btn-go btn-sm" type="submit" data-testid="extra-save">${icon("check")}Agregar</button>
      <button class="btn btn-quiet btn-sm" type="button" data-act="close-extra">Cancelar</button></div>
  </form>`;
}

function wireExtra(params) {
  const form = $("#extra-form");
  if (!form) return;
  $("[data-act=close-extra]", form).addEventListener("click", () => { extraOpen = false; viewAgenda(params); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = parseDM(form.date.value);
    if (!date) { $(".form-msg", form).innerHTML = `<div class="notice notice-error" role="alert">No entendí el día. Escribilo como 17/10.</div>`; return; }
    const ok = actInForm(form, () => reg.addExtra(form.student.value, { date, start: form.start.value, minutes: form.minutes.value }),
      `Clase extra agregada: ${fmtDayLong(date)}.`);
    if (ok) { extraOpen = false; selected = ok; if (weekStart(date) !== (params.get("semana") || weekStart(reg.today()))) location.hash = `#/agenda?semana=${weekStart(date)}`; else route(); }
  });
}

function firstRun() {
  return `<div class="empty-state first-run" data-testid="first-run">
    <h3>¡Hola! Acá va a estar tu semana de clases</h3>
    <p>Agregá a tus alumnos con su día, hora y tarifa, y la agenda se arma sola. O probala primero con datos de ejemplo.</p>
    <div class="row">
      <a class="btn btn-go" href="#/alumnos?nuevo=1">${icon("user-plus")}Agregar un alumno</a>
      <button type="button" class="btn btn-line" data-action="load-demo">${icon("sparkles")}Probar con datos de ejemplo</button>
    </div>
  </div>`;
}
function wireFirstRun() {
  $$("[data-action=load-demo]").forEach((b) => b.addEventListener("click", () => act(() => reg.loadDemo(DEMO), "Listo: cargué alumnos, clases y pagos de ejemplo.", { undo: false })));
}
function backupNudge() {
  const s = reg.summary();
  if (s.has_demo || !reg.state.students.length) return "";
  const days = s.last_backup ? Math.round((Date.parse(`${s.today}T12:00:00`) - Date.parse(`${s.last_backup}T12:00:00`)) / 86400000) : null;
  if (days !== null && days < 7) return "";
  return `<div class="notice notice-warn backup-nudge" data-testid="backup-nudge">
    <p>${days === null ? "Todavía no guardaste ninguna copia de seguridad." : `Hace ${plural(days, "día", "días")} que no guardás una copia de seguridad.`} Todo está solo en este iPad.</p>
    <div class="row"><a class="btn btn-go btn-sm" href="#/ajustes">${icon("download")}Ir a guardar una copia</a></div>
  </div>`;
}

// ══ ALUMNOS ════════════════════════════════════════════════════════════
const slotText = (s) => `${DAYS_SHORT[s.weekday - 1]} ${s.start}`;

function viewAlumnos(params) {
  const showArchived = params.get("archivados") === "1";
  const students = reg.students(showArchived);
  const openForm = params.get("nuevo") === "1";
  main.innerHTML = `
    <div class="page-head"><div><h1>Alumnos</h1><p>${plural(students.filter((s) => !s.archived).length, "alumno", "alumnos")} · ${fmtHours(reg.baseline().hours_per_week)} de clase por semana</p></div>
      <button type="button" class="btn btn-go" id="add-toggle" aria-expanded="${openForm}" data-testid="add-student-toggle">${icon("user-plus")}Agregar alumno</button></div>
    <form class="panel add-form" id="add-student" ${openForm ? "" : "hidden"} novalidate data-testid="add-student-form">
      <h2>Alumno nuevo</h2>
      <div class="grid-student">
        <label class="field"><span>Nombre</span><input class="input" name="name" data-testid="new-name"></label>
        <label class="field"><span>Tarifa por hora</span><input class="input" name="rate" inputmode="decimal" placeholder="800" data-testid="new-rate"></label>
        <fieldset class="field seg-field"><legend>Moneda</legend><div class="seg">
          <label><input type="radio" name="currency" value="UYU" checked><span>$ UYU</span></label>
          <label><input type="radio" name="currency" value="USD"><span>US$ USD</span></label></div></fieldset>
      </div>
      <p class="form-sub">Su clase de todas las semanas <span class="muted">(después podés agregar más días)</span></p>
      <div class="grid-slot">
        <label class="field"><span>Día</span><select class="input" name="weekday" data-testid="new-weekday"><option value="">Sin día fijo</option>${DAYS.map((d, i) => `<option value="${i + 1}">${d[0].toUpperCase() + d.slice(1)}</option>`).join("")}</select></label>
        <label class="field"><span>Hora</span><input class="input" name="start" inputmode="numeric" placeholder="17:00" data-testid="new-start"></label>
        <label class="field"><span>Duración</span>${durationSelect("minutes", 60, "new-minutes")}</label>
      </div>
      <div class="form-msg"></div>
      <div class="row"><button class="btn btn-go" type="submit" data-testid="new-save">${icon("check")}Guardar</button><button class="btn btn-quiet" type="button" id="add-cancel">Cancelar</button></div>
    </form>
    ${students.length ? `<ul class="student-list" data-testid="student-list">${students.map((s) => `<li>
        <a href="#/alumnos/${s.id}" class="student-row">
          ${avatar(s, 44)}
          <span class="student-main"><strong>${esc(s.name)}</strong>${s.archived ? ' <span class="pill pill-off">Archivado</span>' : ""}
            <span class="muted">${s.slots.length ? s.slots.map(slotText).join(" · ") : "Sin día fijo"}</span></span>
          <span class="student-rate">${moneyIn(s.rate, s.currency)}<small>por hora</small></span>
          <span class="student-owes">${s.owes > 0.004 ? `<span class="pill pill-late">Debe ${moneyIn(s.owes, s.currency)}</span>` : `<span class="pill pill-ok">Al día</span>`}</span>
        </a></li>`).join("")}</ul>`
      : `<div class="empty-state"><h3>Todavía no hay alumnos</h3><p>Agregá el primero con el botón amarillo: nombre, tarifa y su día de clase.</p></div>`}
    <p><a class="btn btn-quiet" href="#/alumnos${showArchived ? "" : "?archivados=1"}">${showArchived ? "Ocultar archivados" : "Ver archivados"}</a></p>`;

  const form = $("#add-student");
  const toggle = $("#add-toggle");
  const setOpen = (open) => { form.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); if (open) form.name.focus(); };
  toggle.addEventListener("click", () => setOpen(form.hidden));
  $("#add-cancel").addEventListener("click", () => setOpen(false));
  if (openForm) form.name.focus();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form;
    const s = actInForm(f, () => {
      const st = reg.addStudent({ name: f.name.value, rate: f.rate.value, currency: f.currency.value, from: "2000-01-01" });
      if (f.weekday.value) reg.addSlot(st.id, { weekday: f.weekday.value, start: f.start.value, minutes: f.minutes.value });
      return st;
    }, (st) => `Agregado: ${st.name}.`);
    if (s) location.hash = `#/alumnos/${s.id}`;
  });
}

function viewAlumno(id) {
  const s = reg.student(id);
  const today = reg.today();
  const upcoming = reg.classesBetween(today, addDays(today, 27)).filter((c) => c.student_id === s.id && c.status !== "given");
  const recent = reg.classesBetween(addDays(today, -56), today).filter((c) => c.student_id === s.id && c.status !== "scheduled").reverse();
  const pays = reg.payments(s.id);
  const rateHist = s.rates.length > 1 ? s.rates.map((r) => `${moneyIn(r.amount, s.currency)} ${r.from <= "2000-01-01" ? "al principio" : `desde el ${fmtDM(r.from)}${r.from.slice(0, 4) !== today.slice(0, 4) ? `/${r.from.slice(0, 4)}` : ""}`}`).join(" · ") : "";
  main.innerHTML = `
    <a class="back" href="#/alumnos">← Alumnos</a>
    <div class="detail-head">
      ${avatar(s, 84)}
      <div><h1>${esc(s.name)}</h1>
        <div class="stat-line"><span><strong>${moneyIn(s.rate, s.currency)}</strong> por hora</span><span>${s.slots.length ? s.slots.map((sl) => `${slotText(sl)} (${fmtDuration(sl.minutes)})`).join(" · ") : "Sin día fijo"}</span>${s.archived ? '<span class="pill pill-off">Archivado</span>' : ""}</div></div>
      <div class="btn-col">
        <button type="button" class="btn btn-quiet ${s.archived ? "" : "btn-danger"}" data-act="archive">${icon("archive")}${s.archived ? "Reactivar" : "Archivar"}</button>
      </div>
    </div>

    <div class="detail-grid">
      <section class="panel account" data-testid="account">
        <h2>Cuenta</h2>
        <p class="hero-figure ${s.owes > 0.004 ? "is-owed" : ""}" data-testid="student-owes">${s.owes > 0.004 ? moneyIn(s.owes, s.currency) : "Al día"}</p>
        <p class="muted">${s.owes > 0.004 ? "te debe" : "no te debe nada"}${s.currency !== cur() && s.owes > 0.004 ? ` · ${shown(s.owes, s.currency)}` : ""}</p>
        <dl class="stats"><div><dt>Clases cobrables hasta hoy</dt><dd>${moneyIn(s.earned_total, s.currency)}</dd></div><div><dt>Pagado</dt><dd>${moneyIn(s.paid_total, s.currency)}</dd></div></dl>
        <form id="pay-form" class="inline-form" novalidate>
          <div class="row-2">
            <label class="field"><span>Pagó</span><input class="input" name="amount" inputmode="decimal" value="${s.owes > 0.004 ? s.owes : ""}" placeholder="${s.currency === "USD" ? "25" : "800"}" data-testid="pay-amount"></label>
            <label class="field"><span>Día</span><input class="input" name="date" inputmode="numeric" value="${fmtDM(today)}" data-testid="pay-date"></label>
          </div>
          <div class="form-msg"></div>
          <button class="btn btn-go" type="submit" data-testid="pay-save">${icon("hand-coins")}Registrar pago</button>
        </form>
        ${pays.length ? `<h3 class="sub-h">Pagos</h3><ul class="plain-list" data-testid="payments">${pays.slice(0, 12).map((p) => `<li><span>${fmtDayLong(p.date)}${p.date.slice(0, 4) !== today.slice(0, 4) ? ` de ${p.date.slice(0, 4)}` : ""}</span><strong>${moneyIn(p.amount, p.currency)}</strong>
            <button type="button" class="btn btn-quiet btn-sm" data-unpay="${p.id}" aria-label="Borrar el pago de ${moneyIn(p.amount, p.currency)} del ${fmtDM(p.date)}">${icon("x")}</button></li>`).join("")}</ul>` : ""}
      </section>

      <section class="panel" data-testid="slots">
        <h2>Días de clase</h2>
        ${s.slots.length ? `<ul class="plain-list">${s.slots.map((sl) => `<li class="slot-row" data-slot="${sl.id}">
            <span><strong>${DAYS[sl.weekday - 1][0].toUpperCase() + DAYS[sl.weekday - 1].slice(1)}</strong> ${sl.start} · ${fmtDuration(sl.minutes)}</span>
            <span class="row"><button type="button" class="btn btn-quiet btn-sm" data-edit-slot="${sl.id}">${icon("pencil")}Cambiar</button>
            <button type="button" class="btn btn-quiet btn-sm btn-danger" data-end-slot="${sl.id}">${icon("x")}Quitar</button></span>
            <form class="slot-form inline-form" data-slot-form="${sl.id}" hidden novalidate>
              <div class="grid-slot">
                <label class="field"><span>Día</span>${weekdaySelect("weekday", sl.weekday)}</label>
                <label class="field"><span>Hora</span><input class="input" name="start" value="${sl.start}" inputmode="numeric"></label>
                <label class="field"><span>Duración</span>${durationSelect("minutes", sl.minutes)}</label>
              </div>
              <label class="field"><span>Desde</span><input class="input" name="from" value="${fmtDM(today)}" inputmode="numeric"><small>Las clases de antes quedan como estaban.</small></label>
              <div class="form-msg"></div>
              <button class="btn btn-go btn-sm" type="submit">Guardar el cambio</button>
            </form></li>`).join("")}</ul>` : `<p class="muted">No tiene un día fijo. Agregale uno, o anotá clases sueltas con "Clase extra" en la agenda.</p>`}
        ${s.archived ? "" : `<form id="slot-add" class="inline-form" novalidate>
          <h3 class="sub-h">Agregar un día</h3>
          <div class="grid-slot">
            <label class="field"><span>Día</span>${weekdaySelect("weekday", 1, "slot-weekday")}</label>
            <label class="field"><span>Hora</span><input class="input" name="start" inputmode="numeric" placeholder="17:00" data-testid="slot-start"></label>
            <label class="field"><span>Duración</span>${durationSelect("minutes", 60)}</label>
          </div>
          <div class="form-msg"></div>
          <button class="btn btn-line btn-sm" type="submit" data-testid="slot-save">${icon("plus")}Agregar día</button>
        </form>`}
      </section>

      <section class="panel" data-testid="rate">
        <h2>Tarifa</h2>
        <p><strong>${moneyIn(s.rate, s.currency)}</strong> por hora${rateHist ? `<br><span class="muted">${rateHist}</span>` : ""}</p>
        <form id="rate-form" class="inline-form" novalidate>
          <div class="row-2">
            <label class="field"><span>Nueva tarifa por hora</span><input class="input" name="rate" inputmode="decimal" placeholder="${s.rate}" data-testid="rate-new"></label>
            <label class="field"><span>Desde</span><input class="input" name="from" inputmode="numeric" value="${fmtDM(today)}" data-testid="rate-from"></label>
          </div>
          <small class="muted">Las clases de antes de esa fecha se siguen cobrando a la tarifa vieja.</small>
          <div class="form-msg"></div>
          <button class="btn btn-line btn-sm" type="submit" data-testid="rate-save">Cambiar tarifa</button>
        </form>
        <form id="edit-form" class="inline-form" novalidate>
          <h3 class="sub-h">Datos</h3>
          <label class="field"><span>Nombre</span><input class="input" name="name" value="${esc(s.name)}"></label>
          <label class="field"><span>Notas</span><textarea class="input paste" name="notes" rows="2" placeholder="Materia, colegio, teléfono de la mamá…">${esc(s.notes)}</textarea></label>
          <div class="form-msg"></div>
          <button class="btn btn-line btn-sm" type="submit">Guardar</button>
        </form>
      </section>

      <section class="panel" data-testid="student-classes">
        <h2>Próximas clases</h2>
        ${upcoming.length ? `<ul class="plain-list">${upcoming.slice(0, 8).map((c) => `<li><span>${fmtDayLong(c.date)} · ${c.start}</span><span class="muted">${c.status === "cancelled" ? "cancelada" : c.moved_from ? "movida" : fmtDuration(c.minutes)}</span></li>`).join("")}</ul>` : `<p class="muted">No hay clases en las próximas 4 semanas.</p>`}
        <h3 class="sub-h">Últimas clases</h3>
        ${recent.length ? `<ul class="plain-list">${recent.slice(0, 8).map((c) => `<li><span>${fmtDayLong(c.date)}</span><span>${c.status === "cancelled" ? (c.charge ? `cancelada · ${moneyIn(c.amount, c.currency)}` : "cancelada") : moneyIn(c.amount, c.currency)}</span></li>`).join("")}</ul>` : `<p class="muted">Todavía no tuvo clases.</p>`}
      </section>
    </div>`;

  $("[data-act=archive]").addEventListener("click", () => act(() => reg.setArchived(s.id, !s.archived), s.archived ? `${s.name} volvió a la lista.` : `${s.name} archivado. Sus clases futuras se quitaron; lo cobrado queda.`));
  const pay = $("#pay-form");
  pay.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = parseDM(pay.date.value);
    if (!date) { $(".form-msg", pay).innerHTML = `<div class="notice notice-error" role="alert">No entendí el día.</div>`; return; }
    actInForm(pay, () => reg.addPayment(s.id, { amount: pay.amount.value, date }), (p) => `Pago registrado: ${moneyIn(p.amount, p.currency)}.`);
  });
  $$("[data-unpay]").forEach((b) => b.addEventListener("click", () => act(() => reg.removePayment(b.dataset.unpay), "Pago borrado.")));
  $$("[data-edit-slot]").forEach((b) => b.addEventListener("click", () => { const f = $(`[data-slot-form="${b.dataset.editSlot}"]`); f.hidden = !f.hidden; }));
  $$("[data-slot-form]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const from = parseDM(f.from.value);
    if (!from) { $(".form-msg", f).innerHTML = `<div class="notice notice-error" role="alert">No entendí desde cuándo.</div>`; return; }
    actInForm(f, () => reg.changeSlot(f.dataset.slotForm, { weekday: f.weekday.value, start: f.start.value, minutes: f.minutes.value, from }), "Horario cambiado.");
  }));
  $$("[data-end-slot]").forEach((b) => b.addEventListener("click", () => act(() => reg.endSlot(b.dataset.endSlot), "Quitado ese día. Las clases que ya pasaron quedan.")));
  $("#slot-add")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    actInForm(f, () => reg.addSlot(s.id, { weekday: f.weekday.value, start: f.start.value, minutes: f.minutes.value }), "Día agregado.");
  });
  $("#rate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const from = parseDM(f.from.value);
    if (!from) { $(".form-msg", f).innerHTML = `<div class="notice notice-error" role="alert">No entendí desde cuándo.</div>`; return; }
    actInForm(f, () => reg.setRate(s.id, f.rate.value, from), `Nueva tarifa desde el ${fmtDM(from)}.`);
  });
  $("#edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    actInForm(e.target, () => reg.updateStudent(s.id, { name: e.target.name.value, notes: e.target.notes.value }), "Guardado.");
  });
}

// ══ GANANCIAS ══════════════════════════════════════════════════════════
const C_EARNED = "#2347b5";   // dado (validated pair, dataviz)
const C_EXPECTED = "#6d8cf0"; // previsto

/** A clean axis: four steps of 1, 2 or 5 × a power of ten, covering v. */
function niceAxis(v) {
  if (v <= 0) return { max: 4, step: 1 };
  const raw = v / 4, p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((m) => m >= raw);
  return { max: step * Math.ceil(v / step), step };
}
const compact = (v) => {
  const c = cur() === "USD" ? "US$" : "$";
  if (v >= 1_000_000) return `${c} ${fmt(cur(), 1).format(v / 1_000_000)} M`;
  if (v >= 10_000) return `${c} ${fmt(cur(), 0).format(v / 1000)} mil`;
  return moneyIn(v, cur());
};

/** Stacked columns (dado + previsto) as SVG, sized to its container, with a hover/focus tooltip. */
function columnChart(box, items) {
  const W = Math.max(280, box.clientWidth), H = 260, padL = 64, padR = 8, padT = 24, padB = 34;
  const { max, step } = niceAxis(Math.max(...items.map((i) => i.earned + i.expected), 0));
  const band = (W - padL - padR) / items.length;
  const bw = Math.min(24, band * 0.5);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const bar = (x, y1, y2, color, roundTop) => {
    const h = Math.max(0, y2 - y1);
    if (h <= 0) return "";
    const r = roundTop ? Math.min(4, h) : 0;
    return `<path d="M${x},${y2} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y2} Z" fill="${color}"/>`;
  };
  const labelAt = items.findIndex((i) => i.current);
  box.innerHTML = `<svg width="${W}" height="${H}" style="width:${W}px;height:${H}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(box.dataset.label || "")}">
    ${ticks.map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${padL - 8}" y="${y(t) + 4}" class="tick" text-anchor="end">${esc(compact(t))}</text>`).join("")}
    ${items.map((it, i) => {
      const x = padL + band * i + (band - bw) / 2;
      const yE = y(it.earned), yT = y(it.earned + it.expected);
      const gap = it.earned > 0 && it.expected > 0 ? 2 : 0;
      return `<g class="col ${it.current ? "is-current" : ""}" data-i="${i}" tabindex="0" aria-label="${esc(`${it.long}: ganado ${money(it.earned)}${it.expected ? `, previsto ${money(it.expected)}` : ""}`)}">
        <rect x="${padL + band * i}" y="${padT}" width="${band}" height="${H - padT - padB}" class="hit"/>
        ${bar(x, yE, y(0), C_EARNED, !it.expected)}
        ${it.expected ? bar(x, yT, yE - gap, C_EXPECTED, true) : ""}
        <text x="${x + bw / 2}" y="${H - 12}" class="xlabel ${it.current ? "is-current" : ""}" text-anchor="middle">${esc(it.label)}</text>
        ${i === labelAt && it.earned + it.expected > 0 ? `<text x="${x + bw / 2}" y="${yT - 8}" class="vlabel" text-anchor="middle">${esc(compact(it.earned + it.expected))}</text>` : ""}
      </g>`;
    }).join("")}
    <line x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}" class="axis"/>
  </svg><div class="tip" role="tooltip" hidden></div>`;
  const tip = $(".tip", box);
  const show = (g) => {
    const it = items[g.dataset.i];
    tip.innerHTML = "";
    const strong = document.createElement("strong"); strong.textContent = money(it.earned + it.expected);
    const title = document.createElement("span"); title.textContent = it.long;
    tip.append(title, strong);
    for (const [label, v, c] of [["Ganado", it.earned, C_EARNED], ["Previsto", it.expected, C_EXPECTED]]) {
      if (!v && label === "Previsto") continue;
      const row = document.createElement("span"); row.className = "tip-row";
      const key = document.createElement("i"); key.style.background = c;
      row.append(key, document.createTextNode(`${label} ${money(v)}`));
      tip.append(row);
    }
    tip.hidden = false;
    const r = g.querySelector(".hit").getBBox();
    tip.style.left = `${Math.min(Math.max(r.x + r.width / 2, 90), W - 90)}px`;
    tip.style.top = `${Math.max(0, y(it.earned + it.expected) - 8)}px`;
    $$(".col", box).forEach((c) => c.classList.toggle("is-hover", c === g));
  };
  $$(".col", box).forEach((g) => {
    g.addEventListener("pointerenter", () => show(g));
    g.addEventListener("focus", () => show(g));
  });
  box.addEventListener("pointerleave", () => { tip.hidden = true; $$(".col", box).forEach((c) => c.classList.remove("is-hover")); });
}

function viewGanancias(params) {
  const mode = params.get("ver") === "semanas" ? "semanas" : "meses";
  const today = reg.today();
  const months = reg.months(5, 1);
  const weeks = reg.weeks(8, 1);
  const thisMonth = months.find((m) => m.month === today.slice(0, 7));
  const thisWeek = reg.week();
  const full = months.filter((m) => m.month < today.slice(0, 7)).slice(-3);
  const avg = full.length ? full.reduce((n, m) => n + m.earned, 0) / full.length : 0;
  const owing = reg.owing().reduce((n, o) => n + o.owes_display, 0);
  const items = mode === "meses"
    ? months.map((m) => ({ label: MONTHS_SHORT[Number(m.month.slice(5)) - 1], long: `${MONTHS[Number(m.month.slice(5)) - 1]} ${m.month.slice(0, 4)}`, earned: m.earned, expected: m.expected, current: m.month === today.slice(0, 7) }))
    : weeks.map((w) => ({ label: fmtDM(w.from), long: `Semana del ${fmtDM(w.from)}`, earned: w.earned, expected: w.expected, current: w.from === weekStart(today) }));
  const byStudent = reg.monthByStudent();
  const maxS = Math.max(...byStudent.map((s) => s.amount), 1);

  main.innerHTML = `
    <div class="page-head"><div><h1>Ganancias</h1><p>Todo en ${cur() === "USD" ? `dólares (1 US$ = ${moneyIn(reg.state.settings.usd_rate, "UYU")})` : "pesos"}. Una clase cuenta como ganada cuando ya pasó; las canceladas solo si se cobran.</p></div></div>
    <div class="tiles-stats" data-testid="money-tiles">
      <div class="stat-tile"><span class="stat-label">Este mes</span><span class="stat-value" data-testid="month-total">${money(thisMonth.earned)}</span><span class="stat-sub">ganados · ${money(thisMonth.expected)} más agendados</span></div>
      <div class="stat-tile"><span class="stat-label">Esta semana</span><span class="stat-value">${money(thisWeek.earned)}</span><span class="stat-sub">de ${money(thisWeek.total)} de la semana</span></div>
      <div class="stat-tile"><span class="stat-label">Promedio por mes</span><span class="stat-value">${money(avg)}</span><span class="stat-sub">${full.length ? `últimos ${plural(full.length, "mes", "meses")} completos` : "todavía no hay un mes completo"}</span></div>
      <div class="stat-tile"><span class="stat-label">Te deben</span><span class="stat-value">${money(owing)}</span><span class="stat-sub">${owing ? `<a href="#/agenda">ver quiénes</a>` : "todos al día"}</span></div>
    </div>
    <section class="panel chart-panel" aria-labelledby="chart-h">
      <div class="chart-head">
        <h2 id="chart-h">${mode === "meses" ? "Por mes" : "Por semana"}</h2>
        <div class="seg seg-links" role="group" aria-label="Ver por">
          <a href="#/ganancias" aria-current="${mode === "meses" ? "true" : "false"}">Meses</a>
          <a href="#/ganancias?ver=semanas" aria-current="${mode === "semanas" ? "true" : "false"}" data-testid="by-week">Semanas</a>
        </div>
      </div>
      <ul class="legend" aria-label="Referencias"><li><i style="background:${C_EARNED}"></i>Ganado</li><li><i style="background:${C_EXPECTED}"></i>Agendado (todavía no pasó)</li></ul>
      <div class="chart" id="col-chart" data-label="${mode === "meses" ? "Ganancias por mes" : "Ganancias por semana"}" data-testid="chart"></div>
      <details class="table-view"><summary>Ver como tabla</summary>
        <table><thead><tr><th>${mode === "meses" ? "Mes" : "Semana"}</th><th class="num">Ganado</th><th class="num">Agendado</th><th class="num">Total</th><th class="num">Horas</th></tr></thead>
        <tbody>${items.map((it, i) => { const p = mode === "meses" ? months[i] : weeks[i]; return `<tr><td>${esc(it.long)}</td><td class="num">${money(p.earned)}</td><td class="num">${money(p.expected)}</td><td class="num">${money(p.total)}</td><td class="num">${fmtHours(p.hours)}</td></tr>`; }).join("")}</tbody></table>
      </details>
    </section>
    <section class="panel chart-panel" aria-labelledby="by-h">
      <h2 id="by-h">${MONTHS[Number(today.slice(5, 7)) - 1][0].toUpperCase() + MONTHS[Number(today.slice(5, 7)) - 1].slice(1)}, por alumno</h2>
      <p class="muted">Lo ganado y lo agendado de este mes.</p>
      ${byStudent.length ? `<ul class="hbars" data-testid="by-student">${byStudent.map((s) => `<li>
          <span class="hbar-name"><span class="swatch-dot" style="--c:${ink(s.id)}" aria-hidden="true"></span>${esc(s.name)}</span>
          <span class="hbar-track"><span class="hbar" style="width:${(s.amount / maxS) * 100}%"></span></span>
          <span class="hbar-value">${money(s.amount)}</span></li>`).join("")}</ul>` : `<p class="muted">Todavía no hay clases este mes.</p>`}
    </section>`;
  const box = $("#col-chart");
  columnChart(box, items);
  chartResize = () => columnChart(box, items);
}
let chartResize = null;
let resizeT;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => chartResize?.(), 150); });

// ══ ¿Y SI…? ════════════════════════════════════════════════════════════
const proj = { students: 2, per_week: 1, minutes: 60, rate: null };

function viewProyeccion() {
  const base = reg.baseline();
  const step = cur() === "USD" ? 1 : 50;
  if (proj.rate == null || proj.currency !== cur()) {
    proj.rate = Math.round((base.avg_rate || (cur() === "USD" ? 20 : 800)) / step) * step;
    proj.currency = cur();
  }
  const maxRate = Math.max(cur() === "USD" ? 100 : 3000, Math.ceil((base.avg_rate * 2) / step) * step);
  main.innerHTML = `
    <div class="page-head"><div><h1>¿Y si sumo alumnos?</h1><p>Jugá con los números y mirá cuánto cambia tu mes. Parte de tus clases fijas de hoy: ${plural(base.students, "alumno", "alumnos")}, ${fmtHours(base.hours_per_week)} por semana.</p></div></div>
    <div class="proj">
      <section class="panel proj-controls" aria-label="Alumnos nuevos">
        <div class="stepper-field">
          <span class="stepper-label" id="l-students">Alumnos nuevos</span>
          <div class="stepper" role="group" aria-labelledby="l-students">
            <button type="button" class="btn btn-line btn-icon" data-step="students:-1" aria-label="Uno menos">−</button>
            <output class="stepper-value hand" data-testid="proj-students">${proj.students}</output>
            <button type="button" class="btn btn-line btn-icon" data-step="students:1" aria-label="Uno más">+</button>
          </div>
        </div>
        <div class="stepper-field">
          <span class="stepper-label" id="l-perweek">Clases por semana, cada uno</span>
          <div class="stepper" role="group" aria-labelledby="l-perweek">
            <button type="button" class="btn btn-line btn-icon" data-step="per_week:-1" aria-label="Una menos">−</button>
            <output class="stepper-value hand" data-testid="proj-perweek">${proj.per_week}</output>
            <button type="button" class="btn btn-line btn-icon" data-step="per_week:1" aria-label="Una más">+</button>
          </div>
        </div>
        <div class="field"><span>Duración de cada clase</span>
          <div class="chips" role="group" aria-label="Duración">${[45, 60, 90, 120].map((m) => `<button type="button" class="chip" data-min="${m}" aria-pressed="${proj.minutes === m}">${fmtDuration(m)}</button>`).join("")}</div>
        </div>
        <label class="field"><span>Tarifa por hora <strong class="rate-out" data-testid="proj-rate-out">${money(proj.rate)}</strong></span>
          <input type="range" class="range" name="rate" min="0" max="${maxRate}" step="${step}" value="${proj.rate}" data-testid="proj-rate">
          <small class="muted">${base.avg_rate ? `Hoy cobrás en promedio ${money(base.avg_rate)} la hora.` : "Todavía no hay clases fijas para comparar."}</small>
        </label>
      </section>
      <section class="panel proj-result" aria-live="polite" data-testid="proj-result"></section>
    </div>`;
  const paint = () => {
    const p = reg.projection({ students: proj.students, per_week: proj.per_week, hours: proj.minutes / 60, rate: proj.rate });
    const max = Math.max(p.total.per_month, 1);
    $("[data-testid=proj-students]").textContent = proj.students;
    $("[data-testid=proj-perweek]").textContent = proj.per_week;
    $("[data-testid=proj-rate-out]").textContent = money(proj.rate);
    $$("[data-min]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.min) === proj.minutes)));
    $("[data-testid=proj-result]").innerHTML = `
      <p class="proj-lead">Con ${plural(p.extra.students, "alumno nuevo", "alumnos nuevos")} ganarías</p>
      <p class="hero-figure proj-hero" data-testid="proj-extra-month">+ ${money(p.extra.per_month)}</p>
      <p class="proj-lead">más por mes${p.growth != null && p.extra.per_month ? ` <span class="growth">(+${fmt("UYU", 0).format(p.growth)}%)</span>` : ""}</p>
      <div class="proj-bars" role="img" aria-label="${esc(`Hoy ${money(p.base.per_month)} por mes; con ${p.extra.students} más, ${money(p.total.per_month)} por mes`)}">
        <div class="pbar-row"><span class="pbar-label">Hoy</span><span class="pbar-track"><span class="pbar seg-base" style="width:${(p.base.per_month / max) * 100}%"></span></span><span class="pbar-value">${money(p.base.per_month)}</span></div>
        <div class="pbar-row"><span class="pbar-label">Con ${p.extra.students} más</span><span class="pbar-track"><span class="pbar seg-base" style="width:${(p.base.per_month / max) * 100}%"></span><span class="pbar seg-new" style="width:${(p.extra.per_month / max) * 100}%"></span></span><span class="pbar-value" data-testid="proj-total-month">${money(p.total.per_month)}</span></div>
      </div>
      <ul class="legend"><li><i style="background:${C_EARNED}"></i>Tus clases de hoy</li><li><i style="background:#21804a"></i>Alumnos nuevos</li></ul>
      <dl class="stats proj-stats">
        <div><dt>Por semana</dt><dd>+ ${money(p.extra.per_week)}</dd></div>
        <div><dt>Por año</dt><dd data-testid="proj-extra-year">+ ${money(p.extra.per_year)}</dd></div>
        <div><dt>Horas por semana</dt><dd>${fmtHours(p.total.hours_per_week)} <span class="muted">(hoy ${fmtHours(p.base.hours_per_week)})</span></dd></div>
      </dl>`;
  };
  paint();
  $$("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const [k, d] = b.dataset.step.split(":");
    const limits = { students: [0, 20], per_week: [1, 7] };
    proj[k] = Math.min(limits[k][1], Math.max(limits[k][0], proj[k] + Number(d)));
    paint();
  }));
  $$("[data-min]").forEach((b) => b.addEventListener("click", () => { proj.minutes = Number(b.dataset.min); paint(); }));
  $("[name=rate]").addEventListener("input", (e) => { proj.rate = Number(e.target.value); paint(); });
}

// ══ AJUSTES ════════════════════════════════════════════════════════════
function viewAjustes() {
  const s = reg.summary();
  main.innerHTML = `
    <div class="page-head"><div><h1>Ajustes</h1><p>Moneda, copias de seguridad y planillas.</p></div></div>
    <div class="settings">
      <form class="panel" id="settings-form" novalidate>
        <h2>Moneda</h2>
        <p class="muted">Arriba a la derecha cambiás entre pesos y dólares. Para pasar de una moneda a la otra uso esta cotización:</p>
        <label class="field"><span>1 dólar son</span>
          <span class="input-affix"><span>$</span><input class="input" name="usd_rate" inputmode="decimal" value="${fmt("UYU", 2).format(s.settings.usd_rate).replace(/,00$/, "")}" data-testid="usd-rate"><span>pesos</span></span></label>
        <label class="field"><span>Nombre de la app</span><input class="input" name="title" value="${esc(s.settings.title)}"></label>
        <div class="form-msg"></div>
        <div><button class="btn btn-go" type="submit" data-testid="settings-save">${icon("check")}Guardar</button></div>
      </form>
      <div class="panel">
        <h2>Copia de seguridad</h2>
        <p>Todo se guarda <strong>solo en este iPad</strong>. Guardá una copia una vez por semana: queda en la app Archivos y desde ahí la podés mandar por mail o a Drive.</p>
        <p data-testid="last-backup">${s.last_backup ? `Última copia: <strong>${s.last_backup === s.today ? "hoy" : `el ${fmtDM(s.last_backup)}`}</strong>.` : "<strong>Todavía no guardaste ninguna copia.</strong>"}</p>
        <div class="btn-col"><button type="button" class="btn btn-go" data-download="backup" data-testid="backup">${icon("download")}Guardar copia de seguridad</button></div>
        <form id="restore" class="file-drop">
          <span class="field-label">Recuperar una copia</span>
          <input type="file" name="file" accept=".json,application/json" data-testid="restore-file">
          <small class="muted">Reemplaza todo lo que hay ahora por lo que tenía la copia.</small>
          <div class="form-msg"></div>
          <div><button class="btn btn-line" type="submit">${icon("upload")}Recuperar</button></div>
        </form>
      </div>
      <div class="panel">
        <h2>Planillas para Excel</h2>
        <p>Tus clases, pagos y alumnos en Excel (.xlsx).</p>
        <div class="btn-col">
          <button type="button" class="btn btn-line" data-download="classes">${icon("download")}Clases</button>
          <button type="button" class="btn btn-line" data-download="payments">${icon("download")}Pagos</button>
          <button type="button" class="btn btn-line" data-download="students">${icon("download")}Alumnos</button>
        </div>
      </div>
      <div class="panel">
        <h2>Datos de ejemplo</h2>
        ${s.has_demo
          ? `<p>Hay datos de ejemplo cargados. Al borrarlos se van solo los alumnos inventados con sus clases y pagos; lo que cargaste vos queda.</p><div><button type="button" class="btn btn-line btn-danger" data-action="clear-demo">Borrar datos de ejemplo</button></div>`
          : `<p>Para probar sin miedo: alumnos, clases y pagos inventados que después podés borrar.</p><div><button type="button" class="btn btn-line" data-action="load-demo">${icon("sparkles")}Cargar datos de ejemplo</button></div>`}
      </div>
    </div>`;
  const form = $("#settings-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    actInForm(form, () => reg.updateSettings({ usd_rate: parseNumber(form.usd_rate.value), title: form.title.value }), "Guardado.");
  });
  $$("[data-download]").forEach((b) => b.addEventListener("click", async () => {
    try {
      const name = download(b.dataset.download);
      await flushed();
      toast(`Listo: ${name} quedó en Descargas (app Archivos).`);
      if (b.dataset.download === "backup") viewAjustes();
    } catch (err) { toast(err.message, { error: true }); }
  }));
  $("#restore").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    const box = $(".form-msg", e.target);
    if (!file) { box.innerHTML = `<div class="notice notice-error" role="alert">Elegí el archivo de la copia primero.</div>`; return; }
    try {
      reg.restore(await file.text());
      toast("Copia recuperada.");
      location.hash = "#/agenda";
    } catch (err) { box.innerHTML = `<div class="notice notice-error" role="alert">${esc(err.message)}</div>`; }
  });
  wireFirstRun();
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-action=clear-demo]")) return;
  act(() => reg.clearDemo(), "Borré los datos de ejemplo. Lo que cargaste vos sigue ahí.", { undo: false });
});

// ── router ────────────────────────────────────────────────────────────
let DEMO = null;
function route() {
  const [path, query = ""] = (location.hash.slice(1) || "/agenda").split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  const section = parts[0] || "agenda";
  $$(".tabs a").forEach((a) => { if (a.dataset.tab === section) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  chartResize = null;
  refreshChrome();
  try {
    if (section === "alumnos" && parts[1]) viewAlumno(parts[1]);
    else if (section === "alumnos") viewAlumnos(params);
    else if (section === "ganancias") viewGanancias(params);
    else if (section === "proyeccion") viewProyeccion();
    else if (section === "ajustes") viewAjustes();
    else viewAgenda(params);
  } catch (err) {
    if (!(err instanceof RegistryError)) console.error(err);
    main.innerHTML = `<div class="empty-state"><h3>No pude abrir esta página</h3><p>${esc(err.message)}</p><a class="btn btn-line" href="#/agenda">Volver a la agenda</a></div>`;
  }
}

let lastSection = null;
window.addEventListener("hashchange", () => {
  const section = (location.hash.slice(2) || "agenda").split(/[/?]/)[0];
  if (section !== lastSection) { window.scrollTo(0, 0); selected = null; extraOpen = false; }
  lastSection = section;
  route();
});

start({ saveError: () => toast("No pude guardar en este iPad. Guardá una copia de seguridad desde Ajustes.", { error: true, ms: 15000 }) })
  .then(async () => { DEMO = await import("./demo-data.js"); route(); })
  .catch(() => {
    main.innerHTML = `<div class="empty-state"><h3>No pude abrir Mis clases</h3><p>Safari no deja guardar datos. Revisá que no estés en navegación privada.</p></div>`;
  });

// After a night with the app open, "today" moves on: refresh when she comes back.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && reg) setTimeout(route, 80); });

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
