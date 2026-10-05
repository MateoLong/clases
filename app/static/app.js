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
const DURATIONS = [30, 45, 50, 60, 75, 90, 120, 150, 180];
/** Her usual class: new classes and days start on it. */
const DEFAULT_MINUTES = 50;

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
/** A date as she chose in Ajustes: "7 de octubre", "7 oct" or "7/10"; the year only when it isn't this one. */
function fmtDM(iso, style = reg.state.settings.date_style) {
  const d = dayNum(iso), m = monNum(iso), y = iso.slice(0, 4);
  const other = y !== reg.today().slice(0, 4);
  if (style === "numeric") return `${d}/${m}${other ? `/${y}` : ""}`;
  if (style === "short") return `${d} ${MONTHS_SHORT[m - 1]}${other ? ` ${y}` : ""}`;
  return `${d} de ${MONTHS[m - 1]}${other ? ` de ${y}` : ""}`;
}
/** A week's title in her date style: "5 – 11 de octubre", "5 – 11 oct" or "5/10 – 11/10" (with the year when it isn't this one). */
function weekRange(from, to) {
  const style = reg.state.settings.date_style;
  const y = to.slice(0, 4) !== reg.today().slice(0, 4) ? to.slice(0, 4) : "";
  if (style === "numeric" || monNum(from) !== monNum(to)) return `${fmtDM(from)} – ${fmtDM(to)}`;
  if (style === "short") return `${dayNum(from)} – ${dayNum(to)} ${MONTHS_SHORT[monNum(to) - 1]}${y ? ` ${y}` : ""}`;
  return `${dayNum(from)} – ${dayNum(to)} de ${MONTHS[monNum(to) - 1]}${y ? ` de ${y}` : ""}`;
}
/** A date inside a form: always typed as day/month, whatever the display style. */
const fmtTyped = (iso) => `${dayNum(iso)}/${monNum(iso)}${iso.slice(0, 4) !== reg.today().slice(0, 4) ? `/${iso.slice(0, 4)}` : ""}`;
const fmtDayLong = (iso) => `${DAYS[weekday(iso) - 1]} ${fmtDM(iso)}`;
const fmtDayShort = (iso) => `${DAYS_SHORT[weekday(iso) - 1].toLowerCase()} ${fmtDM(iso)}`;
function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  if (m === 30) return `${h}½ h`;
  return m ? `${h} h ${m}` : `${h} h`;
}
const fmtHours = (hours) => fmtDuration(Math.round(hours * 60));
/** Hours per day, rounded to 5 minutes so it reads naturally ("2 h 10", not "2 h 12"). */
const fmtDayHours = (hours) => (hours > 0 ? fmtDuration(Math.max(5, Math.round((hours * 60) / 5) * 5)) : "0 h");
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
  if (!m[3]) { // no year typed: the closest one (28/12 typed in January is last December)
    const gap = (yy) => Math.abs(Date.parse(`${iso(yy)}T12:00:00`) - Date.parse(`${today}T12:00:00`));
    y = [y - 1, y, y + 1].reduce((a, b) => (gap(b) < gap(a) ? b : a));
  }
  return iso(y);
}

// Each student keeps the forro colour stored with them; initials are ink on the two light ones.
const inkName = (id) => reg.state.students.find((x) => x.id === Number(id))?.ink || "cobalto";
const ink = (id) => `var(--f-${inkName(id)})`;
const lightInk = (id) => ["girasol", "naranja"].includes(inkName(id));
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const avatar = (s, size = 34) => `<span class="avatar" style="--c:${ink(s.id)};${lightInk(s.id) ? "color:var(--ink);" : ""}width:${size}px;height:${size}px;font-size:${size * 0.38}px" aria-hidden="true">${esc(initials(s.name))}</span>`;

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
    b.dataset.undo = "";
    b.addEventListener("click", () => { el.remove(); action(); });
    el.append(b);
  }
  const stack = $(".toasts");
  stack.append(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => el.remove(), ms);
}

// Deshacer puts back the state from before a change, so only the latest change may offer it:
// undoing an older one would also undo everything done after it.
let undoTicket = 0;
function undoable(snapshot) {
  const ticket = ++undoTicket;
  const after = reg.state; // the state this change produced
  $$(".toast [data-undo]").forEach((b) => b.remove());
  return {
    action: () => {
      // Any later change at all (even one with no Deshacer of its own) makes this one final.
      if (ticket !== undoTicket || reg.state !== after) { toast("Ya hiciste otro cambio después; este ya no se puede deshacer."); return; }
      reg.replaceState(snapshot);
      undoTicket++;
      toast("Listo, quedó como antes.");
      route();
    },
  };
}

/** Run a change; on error show it; offer Deshacer that puts the previous state back. */
function act(fn, message, { undo = true, after = route } = {}) {
  const snapshot = reg.state;
  try {
    const out = fn();
    if (message) toast(typeof message === "function" ? message(out) : message, undo ? undoable(snapshot) : {});
    else undoTicket++;
    after?.();
    return out ?? true;
  } catch (err) {
    toast(err.message, { error: true });
    return null;
  }
}

/** Same, but shows the error inside a form instead of a toast. */
function actInForm(form, fn, message, { undo = true } = {}) {
  const box = $(".form-msg", form);
  const snapshot = reg.state;
  try {
    const out = reg.atomic(fn);
    if (box) box.innerHTML = "";
    if (message) toast(typeof message === "function" ? message(out) : message, undo ? undoable(snapshot) : {});
    else undoTicket++;
    route();
    return out;
  } catch (err) {
    if (box) box.innerHTML = `<div class="notice notice-error" role="alert">${esc(err.message)}</div>`;
    else toast(err.message, { error: true });
    return null;
  }
}

/** A length picker; a length not in the list (a class saved as 40 min) is kept as an option, so nothing changes by accident. */
const durationSelect = (name, value = DEFAULT_MINUTES, testid = "") => {
  const list = DURATIONS.includes(Number(value)) ? DURATIONS : [...DURATIONS, Number(value)].sort((x, y) => x - y);
  return `<select class="input" name="${name}" ${testid ? `data-testid="${testid}"` : ""}>${list.map((m) => `<option value="${m}" ${m === Number(value) ? "selected" : ""}>${fmtDuration(m)}</option>`).join("")}</select>`;
};
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
  const asked = params.get("semana");
  // a week from the address is trusted only if it is a real date (a bad one would loop forever)
  const from = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && !Number.isNaN(Date.parse(`${asked}T12:00:00`)) ? weekStart(asked) : weekStart(today);
  const week = reg.week(from);
  const classes = week.classes_list;
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter((d, i) => i < 6 || classes.some((c) => c.date === d));
  const to = addDays(from, 6);
  const thisWeek = from === weekStart(today);
  const past = to < today;
  const sel = classes.find((c) => c.key === selected) || null;
  const range = weekRange(from, to);
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
          <button type="button" class="btn btn-go btn-extra" data-act="open-extra" data-testid="extra-toggle" aria-expanded="${extraOpen}" ${students.length ? "" : "disabled"}>${icon("calendar-plus")}Clase extra</button>
        </div>
        <p class="week-strip" data-testid="week-strip"><span><strong>${money(week.earned)}</strong> ganados</span>${past ? "" : `<span>faltan <strong>${money(week.expected)}</strong></span>`}<span>total <strong>${money(week.total)}</strong></span>${reg.owing().length ? `<a href="#owing">te deben <strong>${money(reg.owing().reduce((n, o) => n + o.owes_display, 0))}</strong></a>` : ""}</p>
        ${extraOpen ? `<section class="panel extra-panel">${extraForm(students, thisWeek ? today : from)}</section>` : ""}
        <div class="board" style="--days:${days.length}" data-testid="board">
          ${days.map((d) => {
            const cs = classes.filter((c) => c.date === d);
            return `<section class="day ${d === today ? "is-today" : ""}" data-date="${d}" aria-label="${fmtDayLong(d)}">
              <h2 class="day-head"><span>${DAYS_SHORT[weekday(d) - 1]}</span> <strong>${dayNum(d)}</strong>${d === today ? `<em>hoy</em>` : ""}</h2>
              <div class="day-classes">${cs.length ? cs.map(classLabel).join("") : `<p class="free hand">libre</p>`}</div>
            </section>`;
          }).join("")}
        </div>
      </section>
      <aside class="rail" aria-label="Resumen">
        <section class="panel rail-week" data-testid="week-money">
          <h2>${thisWeek ? "Esta semana" : "Esa semana"}</h2>
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
      </aside>
    </div>`;

  $$(".clase").forEach((b) => b.addEventListener("click", () => {
    selected = selected === b.dataset.key ? null : b.dataset.key;
    viewAgenda(params);
    $(`.clase[data-key="${CSS.escape(b.dataset.key)}"]`)?.focus({ preventScroll: true });
  }));
  // In portrait the rail sits under the week: show the chosen class's actions right under its day.
  if (sel && matchMedia("(max-width: 1080px)").matches) {
    const panel = $("[data-testid=selected-class]");
    const day = $(`.day[data-date="${sel.date}"]`);
    if (panel && day) { day.after(panel); panel.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  }
  wireSelected(sel, params);
  wireOwing();
  $("[data-act=open-extra]")?.addEventListener("click", () => { extraOpen = !extraOpen; viewAgenda(params); $("#extra-form [name=student]")?.focus(); });
  wireExtra(params);
  wireFirstRun();
}

/** How a cancelled Clase reads: "faltó", "suspendida" or "suspendida · se cobra". */
const cancelText = (c) => (c.reason === "missed" ? "faltó" : c.charge ? "suspendida · se cobra" : "suspendida");

function classLabel(c) {
  const state = c.status === "cancelled"
    ? `<span class="state">${icon(c.reason === "missed" ? "user-x" : "calendar-x")}${cancelText(c)}</span>`
    : c.status === "given" ? `<span class="state">${icon("check")}dada</span>`
    : c.moved_from ? `<span class="state">${icon("calendar-clock")}movida</span>`
    : c.kind === "extra" ? `<span class="state">${icon("plus")}extra</span>` : "";
  const label = `${c.student}, ${fmtDayLong(c.date)} ${c.start}, ${fmtDuration(c.minutes)}, ${shown(c.amount, c.currency)}, ${c.status === "given" ? "dada" : c.status === "cancelled" ? cancelText(c) : "agendada"}${c.plan ? ", con planificación" : ""}`;
  return `<button type="button" class="clase is-${c.status} ${c.charge ? "is-charged" : ""} ${c.reason === "missed" ? "is-missed" : ""}" style="--c:${ink(c.student_id)}" data-key="${c.key}" aria-pressed="${c.key === selected}" aria-label="${esc(label)}" data-testid="clase">
    <span class="clase-top"><span class="clase-time">${c.start}</span>${c.plan ? `<span class="plan-mark" data-testid="plan-mark">${icon("pencil")}</span>` : ""}<span class="clase-dur">${fmtDuration(c.minutes)}</span></span>
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
    <p class="selected-money">${c.status === "cancelled" ? (c.charge ? `${c.reason === "missed" ? "Faltó" : "Suspendida"}, <strong>se cobra ${shown(c.amount, c.currency)}</strong>` : "Suspendida, no se cobra") : `${c.status === "given" ? "Dada" : "Agendada"} · <strong>${shown(c.amount, c.currency)}</strong>`}
      ${c.moved_from ? `<br><span class="muted">Movida desde el ${fmtDayLong(c.moved_from)}</span>` : ""}</p>
    <div class="btn-col">
      ${c.status !== "cancelled" ? `<button type="button" class="btn btn-line btn-sm" data-act="missed" data-testid="cancel-missed">${icon("user-x")}Faltó <span class="btn-note">se cobra</span></button>
        <button type="button" class="btn btn-line btn-sm" data-act="suspend" data-testid="cancel-suspend">${icon("calendar-x")}La suspendo yo <span class="btn-note">no se cobra</span></button>` : ""}
      ${c.status === "cancelled" && !c.charge ? `<button type="button" class="btn btn-line btn-sm" data-act="charge-anyway">Cobrarla igual</button>` : ""}
      ${canRestore ? `<button type="button" class="btn btn-line btn-sm" data-act="restore" data-testid="restore-class">${icon("undo-2")}${c.status === "cancelled" && c.moved_from ? "Volver a agendarla (ese día)" : "Volver a su día y hora"}</button>` : ""}
      <button type="button" class="btn btn-quiet btn-sm" data-act="move-open" data-testid="move-open">${icon("calendar-clock")}Mover</button>
    </div>
    <form class="move-form" hidden novalidate data-testid="move-form">
      <div class="row-2">
        <label class="field"><span>Día</span><input class="input" name="date" value="${fmtTyped(c.date)}" inputmode="numeric" placeholder="17/10"></label>
        <label class="field"><span>Hora</span><input class="input" name="start" value="${c.start}" inputmode="numeric" placeholder="17:30"></label>
      </div>
      <label class="field"><span>Duración</span>${durationSelect("minutes", c.minutes, "move-minutes")}</label>
      <div class="form-msg"></div>
      <button class="btn btn-go btn-sm" type="submit">Mover la clase</button>
    </form>
    <form class="plan-form" novalidate data-testid="plan-form">
      <label class="field"><span>Planificación</span><textarea class="input paste" name="plan" rows="3" placeholder="Qué van a trabajar: tema, ejercicios, qué repasar…" data-testid="plan-text">${esc(c.plan)}</textarea></label>
      <div class="form-msg"></div>
      <button class="btn btn-line btn-sm" type="submit" data-testid="plan-save">${icon("check")}Guardar planificación</button>
    </form>
    <a class="link-small" href="#/alumnos/${c.student_id}">Ver la ficha de ${esc(c.student.split(" ")[0])}${icon("chevron-right")}</a>
  </section>`;
}

function wireSelected(c, params) {
  if (!c) return;
  const panel = $("[data-testid=selected-class]");
  const when = `${c.student.split(" ")[0]}, ${fmtDayShort(c.date)}`;
  $("[data-act=missed]", panel)?.addEventListener("click", () => act(() => reg.cancelClass(c.key, { reason: "missed" }), `Faltó: ${when}. Se cobra igual.`));
  $("[data-act=suspend]", panel)?.addEventListener("click", () => act(() => reg.cancelClass(c.key, { reason: "suspended" }), `Suspendida: ${when}. No se cobra.`));
  $("[data-act=charge-anyway]", panel)?.addEventListener("click", () => act(() => reg.cancelClass(c.key, { reason: c.reason, charge: true }), `Suspendida, se cobra igual: ${when}.`));
  $("[data-act=restore]", panel)?.addEventListener("click", () => act(() => reg.restoreClass(c.key), `La clase volvió a su día: ${when}.`));
  const plan = $(".plan-form", panel);
  plan.addEventListener("submit", (e) => {
    e.preventDefault();
    if (plan.plan.value.trim() === c.plan) return;
    actInForm(plan, () => reg.setPlan(c.key, plan.plan.value), (t) => (t ? `Planificación guardada: ${when}.` : `Planificación borrada: ${when}.`));
  });
  const form = $(".move-form", panel);
  $("[data-act=move-open]", panel).addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) form.date.focus(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = parseDM(form.date.value);
    if (!date) { $(".form-msg", form).innerHTML = `<div class="notice notice-error" role="alert">No entendí el día. Escribilo como 17/10.</div>`; return; }
    actInForm(form, () => reg.moveClass(c.key, { date, start: form.start.value, minutes: form.minutes.value }), `Movida al ${fmtDayLong(date)} a las ${form.start.value.trim()}.`);
    if (date < weekStart(reg.today()) || date > addDays(weekStart(params.get("semana") || reg.today()), 6)) location.hash = `#/agenda?semana=${weekStart(date)}`;
  });
}

function owingPanel() {
  const owing = reg.owing();
  const total = owing.reduce((n, o) => n + o.owes_display, 0);
  return `<section class="panel rail-owing" id="owing" data-testid="owing">
    <h2>Te deben ${owing.length ? `<span class="owing-total">${money(total)}</span>` : ""}</h2>
    <p class="muted small-note">El mes entero se cobra desde el 1º.</p>
    ${owing.length ? `<ul class="owing-list">${owing.map((o) => `<li data-student="${o.id}" style="--c:${ink(o.id)}">
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
    toast(`Cobrado: ${moneyIn(amount, st.currency)} de ${st.name}.`, undoable(snapshot));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(route, reduce ? 300 : 1100);
  }));
}

function extraForm(students, day) {
  return `<form id="extra-form" class="extra-form" novalidate data-testid="extra-form">
    <h2>Clase extra</h2>
    <label class="field"><span>Con</span><select class="input" name="student" data-testid="extra-student">${students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
    <div class="row-2">
      <label class="field"><span>Día</span><input class="input" name="date" value="${fmtTyped(day)}" inputmode="numeric" placeholder="17/10" data-testid="extra-date"></label>
      <label class="field"><span>Hora</span><input class="input" name="start" value="" inputmode="numeric" placeholder="17:30" data-testid="extra-start"></label>
    </div>
    <label class="field"><span>Duración</span>${durationSelect("minutes", DEFAULT_MINUTES, "extra-minutes")}</label>
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
    <p>¿Primera vez? Mirá <a href="#/ayuda">cómo se usa</a>, paso por paso.</p>
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
const gradeText = (g) => (g ? `${g}º año` : "");
const gradeSelect = (value = null, testid = "") =>
  `<select class="input" name="grade" ${testid ? `data-testid="${testid}"` : ""}><option value="">—</option>${[1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${g === value ? "selected" : ""}>${g}º</option>`).join("")}</select>`;
/** Colegio, Año, Maestra/o and mail, as form fields (new student and edit). */
const schoolInputs = (s = {}, prefix = "") => `<div class="grid-school">
    <label class="field"><span>Colegio</span><input class="input" name="school" value="${esc(s.school)}" ${prefix ? `data-testid="${prefix}-school"` : ""}></label>
    <label class="field"><span>Año</span>${gradeSelect(s.grade ?? null, prefix ? `${prefix}-grade` : "")}</label>
    <label class="field"><span>Maestra/o</span><input class="input" name="teacher" value="${esc(s.teacher)}" ${prefix ? `data-testid="${prefix}-teacher"` : ""}></label>
    <label class="field"><span>Mail de la maestra/o</span><input class="input" type="email" name="teacher_email" value="${esc(s.teacher_email)}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="maestra@escuela.edu.uy" ${prefix ? `data-testid="${prefix}-email"` : ""}></label>
  </div>`;
const schoolValues = (f) => ({ school: f.school.value, grade: f.grade.value, teacher: f.teacher.value, teacher_email: f.teacher_email.value });
const slotDates = (s) => {
  const today = reg.today();
  return `${s.from > today ? ` desde el ${fmtDM(s.from)}` : ""}${s.to ? ` hasta el ${fmtDM(s.to)}` : ""}`;
};
const slotText = (s) => `${DAYS_SHORT[s.weekday - 1]} ${s.start}${slotDates(s)}`;

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
      <details class="form-more" data-testid="new-school-toggle"><summary>Datos del colegio <span class="muted">(opcional)</span></summary>${schoolInputs({}, "new")}</details>
      <p class="form-sub">Su clase de todas las semanas <span class="muted">(o dejá <strong>Sin día fijo</strong> si viene cuando puede: sus clases las agendás de a una)</span></p>
      <div class="grid-slot">
        <label class="field"><span>Día</span><select class="input" name="weekday" data-testid="new-weekday"><option value="">Sin día fijo</option>${DAYS.map((d, i) => `<option value="${i + 1}">${d[0].toUpperCase() + d.slice(1)}</option>`).join("")}</select></label>
        <label class="field"><span>Hora</span><input class="input" name="start" inputmode="numeric" placeholder="17:00" data-testid="new-start"></label>
        <label class="field"><span>Duración</span>${durationSelect("minutes", DEFAULT_MINUTES, "new-minutes")}</label>
      </div>
      <div class="form-msg"></div>
      <div class="row"><button class="btn btn-go" type="submit" data-testid="new-save">${icon("check")}Guardar</button><button class="btn btn-quiet" type="button" id="add-cancel">Cancelar</button></div>
    </form>
    ${students.length ? `<ul class="student-list" data-testid="student-list">${students.map((s) => `<li>
        <a href="#/alumnos/${s.id}" class="student-row">
          ${avatar(s, 44)}
          <span class="student-main"><strong>${esc(s.name)}</strong>${s.archived ? ' <span class="pill pill-off">Archivado</span>' : ""}
            <span class="muted">${s.grade ? `${s.grade}º · ` : ""}${s.slots.length ? s.slots.map(slotText).join(" · ") : "Sin día fijo"}</span></span>
          <span class="student-rate">${moneyIn(s.rate, s.currency)}<small>por hora</small></span>
          <span class="student-owes">${s.owes > 0.004 ? `<span class="pill pill-late">Debe ${moneyIn(s.owes, s.currency)}</span>` : s.credit > 0.004 ? `<span class="pill pill-ok">A favor ${moneyIn(s.credit, s.currency)}</span>` : `<span class="pill pill-ok">Al día</span>`}</span>
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
    if (!f.weekday.value && f.start.value.trim()) {
      $(".form-msg", f).innerHTML = `<div class="notice notice-error" role="alert">Elegí el día de su clase, o borrá la hora si no tiene día fijo.</div>`;
      return;
    }
    const s = actInForm(f, () => {
      const st = reg.addStudent({ name: f.name.value, rate: f.rate.value, currency: f.currency.value, from: "2000-01-01", ...schoolValues(f) });
      if (f.weekday.value) reg.addSlot(st.id, { weekday: f.weekday.value, start: f.start.value, minutes: f.minutes.value });
      return st;
    }, (st) => `Agregado: ${st.name}.`);
    if (s) location.hash = `#/alumnos/${s.id}`;
  });
}

/** The first day from today (Sundays aside) on which this student has no Clase yet. */
function nextFreeDay(studentId) {
  let d = reg.today();
  const taken = new Set(reg.classesBetween(d, addDays(d, 27)).filter((c) => c.student_id === studentId && !c.cancelled).map((c) => c.date));
  while (taken.has(d) || weekday(d) === 7) d = addDays(d, 1);
  return d;
}

/** A Clase's Planificación under its line in the student's lists. */
const planLine = (c) => (c.plan ? `<p class="plan-line" data-testid="plan-line">${icon("pencil")}<span>${esc(c.plan)}</span></p>` : "");

function viewAlumno(id) {
  const s = reg.student(id);
  const today = reg.today();
  const upcoming = reg.classesBetween(today, addDays(today, 27)).filter((c) => c.student_id === s.id && c.status !== "given");
  const recent = reg.classesBetween(addDays(today, -56), today).filter((c) => c.student_id === s.id && c.status !== "scheduled").reverse();
  const pays = reg.payments(s.id);
  const cuota = reg.cuota(s.id);
  const rateHist = s.rates.length > 1 ? s.rates.map((r) => `${moneyIn(r.amount, s.currency)} ${r.from <= "2000-01-01" ? "al principio" : `desde el ${fmtDM(r.from)}`}`).join(" · ") : "";
  main.innerHTML = `
    <a class="back" href="#/alumnos">${icon("chevron-left")}Alumnos</a>
    <div class="detail-head">
      ${avatar(s, 84)}
      <div><h1>${esc(s.name)}</h1>
        <div class="stat-line"><span><strong>${moneyIn(s.rate, s.currency)}</strong> por hora</span><span>${s.slots.length ? s.slots.map((sl) => `${slotText(sl)} (${fmtDuration(sl.minutes)})`).join(" · ") : "Sin día fijo"}</span>${s.archived ? '<span class="pill pill-off">Archivado</span>' : ""}</div>
        ${s.school || s.grade || s.teacher || s.teacher_email ? `<p class="school-line" data-testid="school-line">${[s.school && esc(s.school), gradeText(s.grade)].filter(Boolean).join(" · ")}${s.teacher || s.teacher_email ? `${s.school || s.grade ? "<br>" : ""}Maestra/o: ${esc(s.teacher || "")}${s.teacher_email ? ` <a href="mailto:${esc(s.teacher_email)}" data-testid="teacher-mail">${icon("mail")}${esc(s.teacher_email)}</a>` : ""}` : ""}</p>` : ""}</div>
      <div class="btn-col">
        <button type="button" class="btn btn-quiet ${s.archived ? "" : "btn-danger"}" data-act="archive">${icon("archive")}${s.archived ? "Reactivar" : "Archivar"}</button>
      </div>
    </div>

    <div class="detail-grid">
      <section class="panel account" data-testid="account">
        <h2>Cuenta</h2>
        <p class="hero-figure ${s.owes > 0.004 ? "is-owed" : s.credit > 0.004 ? "is-credit" : ""}" data-testid="student-owes">${s.owes > 0.004 ? moneyIn(s.owes, s.currency) : s.credit > 0.004 ? moneyIn(s.credit, s.currency) : "Al día"}</p>
        <p class="muted">${s.owes > 0.004 ? "te debe" : s.credit > 0.004 ? "tiene a favor (va para el mes que viene)" : "no te debe nada"}${s.currency !== cur() && (s.owes > 0.004 || s.credit > 0.004) ? ` · ${shown(Math.abs(s.owes), s.currency)}` : ""}</p>
        <dl class="stats" data-testid="this-month">
          <div><dt>Cuota de ${MONTHS[monNum(today) - 1]} <span class="muted">(${plural(cuota.classes.filter((c) => c.billable).length, "clase", "clases")})</span></dt><dd data-testid="cuota-total">${moneyIn(cuota.total, s.currency)}</dd></div>
          <div><dt>Pagado de este mes</dt><dd data-testid="cuota-paid">${moneyIn(cuota.paid, s.currency)}</dd></div>
          <div><dt>${cuota.credit > 0.004 ? "A favor" : "Falta de este mes"}</dt><dd data-testid="cuota-left">${moneyIn(cuota.credit > 0.004 ? cuota.credit : cuota.left, s.currency)}</dd></div>
          ${s.owes - cuota.left > 0.004 ? `<div><dt>De meses anteriores</dt><dd data-testid="cuota-before">${moneyIn(s.owes - cuota.left, s.currency)}</dd></div>` : ""}
        </dl>
        <p class="muted small-note">Cada mes se debe entero desde el 1º. Si faltó, se cobra igual; si la suspendiste vos, no.</p>
        <form id="pay-form" class="inline-form" novalidate>
          <div class="row-2">
            <label class="field"><span>Pagó</span><input class="input" name="amount" inputmode="decimal" value="${s.owes > 0.004 ? s.owes : ""}" placeholder="${s.currency === "USD" ? "25" : "800"}" data-testid="pay-amount"></label>
            <label class="field"><span>Día</span><input class="input" name="date" inputmode="numeric" value="${fmtTyped(today)}" data-testid="pay-date"></label>
          </div>
          <div class="form-msg"></div>
          <button class="btn btn-go" type="submit" data-testid="pay-save">${icon("hand-coins")}Registrar pago</button>
        </form>
        ${pays.length ? `<h3 class="sub-h">Pagos</h3><ul class="plain-list" data-testid="payments">${pays.slice(0, 12).map((p) => `<li class="pay-row"><span>${fmtDayLong(p.date)}</span><strong>${moneyIn(p.amount, p.currency)}</strong>
            <button type="button" class="btn btn-quiet btn-sm" data-unpay="${p.id}" aria-label="Borrar el pago de ${moneyIn(p.amount, p.currency)} del ${fmtDM(p.date)}">${icon("x")}</button></li>`).join("")}</ul>` : ""}
      </section>

      <section class="panel" data-testid="slots">
        <h2>Días de clase</h2>
        ${s.slots.length ? `<ul class="plain-list">${s.slots.map((sl) => `<li class="slot-row" data-slot="${sl.id}">
            <span><strong>${DAYS[sl.weekday - 1][0].toUpperCase() + DAYS[sl.weekday - 1].slice(1)}</strong> ${sl.start} · ${fmtDuration(sl.minutes)}${slotDates(sl) ? `<span class="muted">${slotDates(sl)}</span>` : ""}</span>
            <span class="row"><button type="button" class="btn btn-quiet btn-sm" data-edit-slot="${sl.id}">${icon("pencil")}Cambiar</button>
            <button type="button" class="btn btn-quiet btn-sm btn-danger" data-end-slot="${sl.id}">${icon("x")}Quitar</button></span>
            <form class="slot-form inline-form" data-slot-form="${sl.id}" hidden novalidate>
              <div class="grid-slot">
                <label class="field"><span>Día</span>${weekdaySelect("weekday", sl.weekday)}</label>
                <label class="field"><span>Hora</span><input class="input" name="start" value="${sl.start}" inputmode="numeric"></label>
                <label class="field"><span>Duración</span>${durationSelect("minutes", sl.minutes)}</label>
              </div>
              <label class="field"><span>Desde</span><input class="input" name="from" value="${fmtTyped(today)}" inputmode="numeric"><small>Las clases de antes quedan como estaban.</small></label>
              <div class="form-msg"></div>
              <button class="btn btn-go btn-sm" type="submit">Guardar el cambio</button>
            </form></li>`).join("")}</ul>` : `<p class="muted" data-testid="no-fixed-day">Sin día fijo: viene cuando puede. Agendá cada clase con <strong>Agendar clase</strong>, o agregale un día si empieza a venir siempre el mismo.</p>`}
        ${s.archived ? "" : `<form id="slot-add" class="inline-form" novalidate>
          <h3 class="sub-h">Agregar un día</h3>
          <div class="grid-slot">
            <label class="field"><span>Día</span>${weekdaySelect("weekday", 1, "slot-weekday")}</label>
            <label class="field"><span>Hora</span><input class="input" name="start" inputmode="numeric" placeholder="17:00" data-testid="slot-start"></label>
            <label class="field"><span>Duración</span>${durationSelect("minutes", DEFAULT_MINUTES, "slot-minutes")}</label>
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
            <label class="field"><span>Desde</span><input class="input" name="from" inputmode="numeric" value="${fmtTyped(today)}" data-testid="rate-from"></label>
          </div>
          <small class="muted">Las clases de antes de esa fecha se siguen cobrando a la tarifa vieja.</small>
          <div class="form-msg"></div>
          <button class="btn btn-line btn-sm" type="submit" data-testid="rate-save">Cambiar tarifa</button>
        </form>
        <form id="edit-form" class="inline-form" novalidate>
          <h3 class="sub-h">Datos</h3>
          <label class="field"><span>Nombre</span><input class="input" name="name" value="${esc(s.name)}"></label>
          ${schoolInputs(s, "edit")}
          <label class="field"><span>Notas</span><textarea class="input paste" name="notes" rows="2" placeholder="Materia, teléfono de la mamá…">${esc(s.notes)}</textarea></label>
          <div class="form-msg"></div>
          <button class="btn btn-line btn-sm" type="submit">Guardar</button>
        </form>
      </section>

      <section class="panel" data-testid="student-classes">
        <div class="panel-head"><h2>Próximas clases</h2>
          ${s.archived ? "" : `<button type="button" class="btn ${s.slots.length ? "btn-line" : "btn-go"} btn-sm" data-act="book-open" aria-expanded="false" data-testid="book-open">${icon("calendar-plus")}Agendar clase</button>`}</div>
        ${s.archived ? "" : `<form id="book-form" class="inline-form" hidden novalidate data-testid="book-form">
          <div class="grid-slot">
            <label class="field"><span>Día</span><input class="input" name="date" value="${fmtTyped(nextFreeDay(s.id))}" inputmode="numeric" placeholder="17/10" data-testid="book-date"></label>
            <label class="field"><span>Hora</span><input class="input" name="start" inputmode="numeric" placeholder="17:30" data-testid="book-start"></label>
            <label class="field"><span>Duración</span>${durationSelect("minutes", DEFAULT_MINUTES, "book-minutes")}</label>
          </div>
          <div class="form-msg"></div>
          <button class="btn btn-go btn-sm" type="submit" data-testid="book-save">${icon("check")}Agendar</button>
        </form>`}
        ${upcoming.length ? `<ul class="plain-list">${upcoming.slice(0, 8).map((c) => `<li class="${c.plan ? "has-plan" : ""}"><span>${fmtDayLong(c.date)} · ${c.start}</span><span class="muted">${c.status === "cancelled" ? cancelText(c) : c.moved_from ? "movida" : fmtDuration(c.minutes)}</span>${planLine(c)}</li>`).join("")}</ul>` : `<p class="muted" data-testid="upcoming-empty">No hay clases en las próximas 4 semanas.${s.archived ? "" : s.slots.length ? "" : " Agendale una con <strong>Agendar clase</strong>."}</p>`}
        <h3 class="sub-h">Últimas clases</h3>
        ${recent.length ? `<ul class="plain-list">${recent.slice(0, 8).map((c) => `<li class="${c.plan ? "has-plan" : ""}"><span>${fmtDayLong(c.date)}</span><span>${c.status === "cancelled" ? (c.charge ? `${c.reason === "missed" ? "faltó" : "suspendida"} · ${moneyIn(c.amount, c.currency)}` : "suspendida") : moneyIn(c.amount, c.currency)}</span>${planLine(c)}</li>`).join("")}</ul>` : `<p class="muted">Todavía no tuvo clases.</p>`}
      </section>
    </div>`;

  const book = $("#book-form");
  $("[data-act=book-open]")?.addEventListener("click", (e) => {
    book.hidden = !book.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!book.hidden));
    if (!book.hidden) book.start.focus();
  });
  book?.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = parseDM(book.date.value);
    if (!date) { $(".form-msg", book).innerHTML = `<div class="notice notice-error" role="alert">No entendí el día. Escribilo como 17/10.</div>`; return; }
    actInForm(book, () => reg.addExtra(s.id, { date, start: book.start.value, minutes: book.minutes.value }), `Clase agendada: ${fmtDayLong(date)} a las ${book.start.value.trim()}.`);
  });
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
    actInForm(e.target, () => reg.updateStudent(s.id, { name: e.target.name.value, notes: e.target.notes.value, ...schoolValues(e.target) }), "Guardado.");
  });
}

// ══ GANANCIAS ══════════════════════════════════════════════════════════
const C_EARNED = "#2347b5";   // dado (validated pair, dataviz)
const C_EXPECTED = "#6d8cf0"; // agendado

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
      return `<g class="col ${it.current ? "is-current" : ""}" data-i="${i}" tabindex="0" aria-label="${esc(`${it.long}: ganado ${money(it.earned)}${it.expected ? `, agendado ${money(it.expected)}` : ""}`)}">
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
    for (const [label, v, c] of [["Ganado", it.earned, C_EARNED], ["Agendado", it.expected, C_EXPECTED]]) {
      if (!v && label === "Agendado") continue;
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
    : weeks.map((w) => ({ label: fmtDM(w.from, reg.state.settings.date_style === "numeric" ? "numeric" : "short"), long: `Semana del ${fmtDM(w.from)}`, earned: w.earned, expected: w.expected, current: w.from === weekStart(today) }));
  const byStudent = reg.monthByStudent();
  const maxS = Math.max(...byStudent.map((s) => s.amount), 1);

  main.innerHTML = `
    <div class="page-head"><div><h1>Ganancias</h1><p>Todo en ${cur() === "USD" ? `dólares (1 US$ = ${moneyIn(reg.state.settings.usd_rate, "UYU")})` : "pesos"}. Una clase cuenta como ganada cuando ya pasó. Si el alumno faltó, cuenta igual; si la suspendiste vos, no.</p></div></div>
    <section class="panel month-lead" data-testid="money-tiles">
      <p class="muted">En ${MONTHS[Number(today.slice(5, 7)) - 1]} llevás ganados</p>
      <p class="hero-figure" data-testid="month-total">${money(thisMonth.earned)}</p>
      <p class="lead-sentence">y tenés <strong>${money(thisMonth.expected)}</strong> más agendados para lo que queda del mes. Esta semana van <strong>${money(thisWeek.earned)}</strong> de ${money(thisWeek.total)}${full.length ? `; tu promedio de los últimos ${plural(full.length, "mes", "meses")} completos es <strong>${money(avg)}</strong>` : ""}.${owing ? ` Te deben <a href="#/agenda">${money(owing)}</a>.` : " Nadie te debe nada."}</p>
    </section>
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
          <span class="hbar-value">${money(s.amount)}</span></li>`).join("")}</ul>` : `<p class="muted">Todavía no hay clases este mes.${reg.state.students.length ? "" : ` Cuando agregues alumnos con su día de clase en <a href="#/alumnos">Alumnos</a>, aparecen acá.`}</p>`}
    </section>`;
  const box = $("#col-chart");
  columnChart(box, items);
  chartResize = () => columnChart(box, items);
}
let chartResize = null;
let resizeT;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => chartResize?.(), 150); });

// ══ ¿Y SI…? ════════════════════════════════════════════════════════════
const proj = { students: 2, per_week: 1, minutes: DEFAULT_MINUTES, rate: null };

function viewProyeccion() {
  const base = reg.baseline();
  const step = cur() === "USD" ? 1 : 50;
  if (proj.rate == null || proj.currency !== cur()) {
    proj.rate = Math.round((base.avg_rate || (cur() === "USD" ? 20 : 800)) / step) * step;
    proj.currency = cur();
  }
  const maxRate = Math.max(cur() === "USD" ? 100 : 3000, Math.ceil((base.avg_rate * 2) / step) * step);
  main.innerHTML = `
    <div class="page-head"><div><h1>¿Y si sumo alumnos?</h1><p>Jugá con los números y mirá cuánto cambia tu mes. Parte de tu semana de hoy: ${plural(base.students, "alumno", "alumnos")}, ${fmtHours(base.hours_per_week)} por semana${base.flexible ? ` <span data-testid="proj-flexible">(${base.flexible === 1 ? "uno sin día fijo cuenta" : `${base.flexible} sin día fijo cuentan`} con su promedio de las últimas 4 semanas)</span>` : ""}.</p></div></div>
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
          <div class="chips" role="group" aria-label="Duración">${[45, 50, 60, 90, 120].map((m) => `<button type="button" class="chip" data-min="${m}" aria-pressed="${proj.minutes === m}">${fmtDuration(m)}</button>`).join("")}</div>
        </div>
        <label class="field"><span>Tarifa por hora <strong class="rate-out" data-testid="proj-rate-out">${money(proj.rate)}</strong></span>
          <input type="range" class="range" name="rate" min="0" max="${maxRate}" step="${step}" value="${proj.rate}" data-testid="proj-rate">
          <small class="muted">${base.avg_rate ? `Hoy cobrás en promedio ${money(base.avg_rate)} la hora.` : "Todavía no hay clases para comparar."}</small>
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
    const range = $("[name=rate]");
    range.style.setProperty("--p", `${(proj.rate / Number(range.max)) * 100}%`);
    $$("[data-min]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.min) === proj.minutes)));
    $("[data-testid=proj-result]").innerHTML = `
      <div class="blank-labels" aria-hidden="true">${Array.from({ length: Math.min(p.extra.students, 12) }, () => `<span class="blank-label"><span class="hand">nuevo</span></span>`).join("")}${p.extra.students > 12 ? `<span class="blank-more">+${p.extra.students - 12}</span>` : ""}</div>
      <p class="proj-lead">Con ${plural(p.extra.students, "alumno nuevo", "alumnos nuevos")} ganarías</p>
      <p class="hero-figure proj-hero" data-testid="proj-extra-month">+ ${money(p.extra.per_month)}</p>
      <p class="proj-lead">más por mes${p.growth != null && p.extra.per_month ? ` <span class="growth">(+${fmt("UYU", 0).format(p.growth)}%)</span>` : ""}</p>
      <div class="proj-bars" role="img" aria-label="${esc(`Hoy ${money(p.base.per_month)} por mes; con ${p.extra.students} más, ${money(p.total.per_month)} por mes`)}">
        <div class="pbar-row"><span class="pbar-label">Hoy</span><span class="pbar-track"><span class="pbar seg-base" style="width:${(p.base.per_month / max) * 100}%"></span></span><span class="pbar-value">${money(p.base.per_month)}</span></div>
        <div class="pbar-row"><span class="pbar-label">Con ${p.extra.students} más</span><span class="pbar-track"><span class="pbar seg-base" style="width:${(p.base.per_month / max) * 100}%"></span><span class="pbar seg-new" style="width:${(p.extra.per_month / max) * 100}%"></span></span><span class="pbar-value" data-testid="proj-total-month">${money(p.total.per_month)}</span></div>
      </div>
      <ul class="legend"><li><i style="background:${C_EARNED}"></i>Tus clases de hoy</li><li><i style="background:var(--f-pasto)"></i>Alumnos nuevos</li></ul>
      <p class="per-day" data-testid="proj-per-day">${icon("clock")}<span>Serían <strong>${fmtDayHours(p.total.hours_per_day)} por día</strong>, de lunes a viernes <span class="muted">(hoy ${fmtDayHours(p.base.hours_per_day)})</span></span></p>
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
    <div class="page-head"><div><h1>Ajustes</h1><p>Moneda, fechas, copias de seguridad y planillas.</p></div></div>
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
      <div class="panel" data-testid="date-style">
        <h2>Fechas</h2>
        <fieldset class="field seg-field"><legend>Mostrar las fechas como</legend><div class="seg seg-wrap">
          ${[["long", "date-long"], ["short", "date-short"], ["numeric", "date-numeric"]].map(([v, id]) => `<label><input type="radio" name="date_style" value="${v}" ${s.settings.date_style === v ? "checked" : ""} data-testid="${id}"><span>${fmtDM(s.today, v)}</span></label>`).join("")}
        </div></fieldset>
        <p class="muted">Para escribir una fecha, siempre día/mes: 17/10.</p>
      </div>
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
  $$("[name=date_style]").forEach((r) => r.addEventListener("change", () => act(() => reg.updateSettings({ date_style: r.value }), null, { undo: false })));
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

// ══ AYUDA ══════════════════════════════════════════════════════════════
// Plain cards she can come back to when she forgets a step. No data is touched here.
function viewAyuda() {
  const card = (id, ic, title, steps, link) => `<section class="panel help-card" aria-labelledby="h-${id}" data-testid="help-${id}">
    <h2 id="h-${id}"><span class="help-icon">${icon(ic)}</span>${title}</h2>
    <ol class="help-steps">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
    ${link ? `<a class="btn btn-line btn-sm" href="${link[0]}">${link[1]}</a>` : ""}
  </section>`;
  main.innerHTML = `
    <div class="page-head"><div><h1>Cómo se usa</h1><p>Lo de todos los días, paso por paso. Si algo no sale, volvé acá con el botón <strong>?</strong> de arriba.</p></div></div>
    <div class="help-grid">
      ${card("semana", "calendar-days", "Tu semana", [
        "La <strong>Agenda</strong> abre en esta semana, con hoy marcado. Con <strong>‹ ›</strong> pasás de semana; <strong>Hoy</strong> te trae de vuelta.",
        "Cada clase es una etiqueta en su día. Cuando termina su horario queda como <strong>dada</strong> y cuenta como ganada.",
        "Arriba de la semana (o en <strong>Esta semana</strong>, con el iPad acostado) ves lo ganado, lo que falta y el total.",
      ], ["#/agenda", "Ir a la Agenda"])}
      ${card("cambiar", "calendar-x", "Cancelar, mover o preparar una clase", [
        "En la <strong>Agenda</strong>, tocá la clase.",
        "Si el alumno no viene, tocá <strong>Faltó</strong>: la clase se cobra igual. Si la suspendés vos, tocá <strong>La suspendo yo</strong>: no se cobra (y si después querés cobrarla, <strong>Cobrarla igual</strong>).",
        "Para cambiarla de día: <strong>Mover</strong>, escribí el día y la hora nuevos y tocá <strong>Mover la clase</strong>.",
        "Si marcaste que faltó, la suspendiste o la moviste y querés dejarla como era, tocala y elegí <strong>Volver a su día y hora</strong>. (Una clase extra que moviste no tiene ese botón: movela de nuevo.)",
        "Para preparar una clase, tocala y escribí en <strong>Planificación</strong> qué van a trabajar; tocá <strong>Guardar planificación</strong>. La etiqueta queda con un lápiz, y la planificación se ve también en la ficha del alumno.",
        "¿Te equivocaste? Tocá <strong>Deshacer</strong> en el aviso que aparece abajo.",
      ], ["#/agenda", "Ir a la Agenda"])}
      ${card("extra", "calendar-plus", "Anotar una clase extra", [
        "En la <strong>Agenda</strong>, tocá el botón amarillo <strong>Clase extra</strong>.",
        "Elegí con quién, el día, la hora y cuánto dura, y tocá <strong>Agregar</strong>. (También podés hacerlo desde su ficha, con <strong>Agendar clase</strong>.)",
        "Si choca con otra clase de ese día, te avisa con quién.",
      ], ["#/agenda", "Ir a la Agenda"])}
      ${card("cobrar", "hand-coins", "Cobrar", [
        "Cada alumno te debe la <strong>cuota del mes</strong> desde el día 1º: todas sus clases de ese mes. Si falta a una, se cobra igual; si la suspendés vos, se descuenta.",
        "En la Agenda, <strong>Te deben</strong> muestra quién te debe y cuánto. A principio de mes, <strong>Cobrar</strong> anota que te pagó el mes entero.",
        "En su ficha, <strong>Cuenta</strong> muestra la cuota de este mes, cuánto pagó y cuánto falta. Si pagó de más (por ejemplo, le suspendiste una clase), queda <strong>a favor</strong> para el mes siguiente.",
        "Si te pagó una parte: entrá a su ficha en <strong>Alumnos</strong>, escribí lo que pagó y tocá <strong>Registrar pago</strong>.",
        "¿Anotaste mal un pago? Borralo con la <strong>✕</strong> en la lista de pagos de su ficha.",
      ])}
      ${card("alumnos", "user-plus", "Alumnos y tarifas", [
        "En <strong>Alumnos</strong>, tocá <strong>Agregar alumno</strong>: nombre, tarifa por hora (en pesos o dólares) y su día y hora de clase. Si viene cuando puede, dejá <strong>Sin día fijo</strong>.",
        "Para agendarle una clase a cualquiera (sobre todo a los que no tienen día fijo), en su ficha tocá <strong>Agendar clase</strong>: día, hora y cuánto dura.",
        "En <strong>Datos del colegio</strong> anotás su colegio, el año (1º a 6º) y su maestra o maestro con el mail. Tocando el mail se abre Mail para escribirle.",
        "En su ficha podés agregar otro día, cambiarlo o quitarlo.",
        "Para subirle la tarifa, usá <strong>Cambiar tarifa</strong> con la fecha desde cuándo. Las clases de antes se siguen cobrando a la tarifa vieja.",
        "Si deja de venir, <strong>Archivar</strong> quita sus clases que vienen. Lo que te debe y su historial quedan.",
      ], ["#/alumnos", "Ir a Alumnos"])}
      ${card("ganancias", "chart-column", "Ganancias, ¿Y si…? y dólares", [
        "<strong>Ganancias</strong> muestra lo ganado y lo agendado por mes o por semana. Una clase en la que el alumno faltó cuenta; una que suspendiste vos, no (salvo que la cobres igual).",
        "<strong>¿Y si…?</strong> sirve para jugar: elegí cuántos alumnos nuevos, cuántas clases y a qué tarifa, y mirá cuánto cambia tu mes.",
        "Arriba a la derecha, <strong>UYU / USD</strong> pasa todo a pesos o a dólares, con la cotización que pusiste en Ajustes.",
        "En <strong>Ajustes → Fechas</strong> elegís cómo se ven las fechas: 7 de octubre, 7 oct o 7/10. Para escribirlas, siempre día/mes.",
      ], ["#/ganancias", "Ver Ganancias"])}
      ${card("copia", "download", "Guardar una copia de seguridad", [
        "Todo está guardado solo en este iPad. Una vez por semana, tocá <strong>Ajustes → Guardar copia de seguridad</strong>. El archivo queda en la app Archivos: mandátelo por mail o a Drive, así no se pierde si le pasa algo al iPad.",
        "Si todavía no guardaste ninguna, o si pasó una semana desde la última, la app te avisa en la Agenda (mientras haya datos de ejemplo no avisa).",
        "Si un día cambiás de iPad: en el nuevo, <strong>Ajustes → Recuperar una copia</strong>.",
      ], ["#/ajustes", "Ir a Ajustes"])}
      ${card("probar", "sparkles", "Probar sin miedo", [
        "En <strong>Ajustes</strong> podés cargar <strong>datos de ejemplo</strong>: alumnos, clases y pagos inventados para practicar.",
        "Cuando termines, <strong>Borrar datos de ejemplo</strong> quita solo lo inventado. Lo que cargaste vos queda.",
      ])}
    </div>`;
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
  $$(".tabs a, .help-link").forEach((a) => { if (a.dataset.tab === section) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  chartResize = null;
  refreshChrome();
  try {
    if (section === "alumnos" && parts[1]) viewAlumno(parts[1]);
    else if (section === "alumnos") viewAlumnos(params);
    else if (section === "ganancias") viewGanancias(params);
    else if (section === "proyeccion") viewProyeccion();
    else if (section === "ajustes") viewAjustes();
    else if (section === "ayuda") viewAyuda();
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
