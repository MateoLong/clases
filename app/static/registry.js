// Mis clases: students, their weekly slots and hourly rates, the classes that come out of
// them, payments, and the money maths. Pure logic: runs in the browser (saved on the iPad)
// and in Node for the tests. The whole state is one plain object, so a backup is its JSON.

export const DEFAULT_SETTINGS = { currency: "UYU", usd_rate: 40, title: "Mis clases", date_style: "long" };
export const CURRENCIES = ["UYU", "USD"];
/** Why a Clase didn't happen: the student missed it (Faltó, charged) or she suspended it. */
export const CANCEL_REASONS = ["missed", "suspended"];
/** How dates are shown: "7 de octubre", "7 oct" or "7/10". */
export const DATE_STYLES = ["long", "short", "numeric"];
/** The eight forro colours; each student gets one for good (least used first). */
export const INKS = ["cobalto", "tomate", "pasto", "violeta", "turquesa", "rosa", "naranja", "girasol"];
function nextInk(students) {
  const used = new Map(INKS.map((k) => [k, 0]));
  for (const s of students) if (!s.archived && used.has(s.ink)) used.set(s.ink, used.get(s.ink) + 1);
  return INKS.reduce((best, k) => (used.get(k) < used.get(best) ? k : best), INKS[0]);
}
const WEEKS_PER_MONTH = 52 / 12;
/** Hours per day are spread over a five-day week (all her classes, whatever day they fall on). */
const WORKDAYS = 5;

export class RegistryError extends Error {
  constructor(code, message, info = {}) {
    super(message);
    this.code = code;
    this.info = info;
  }
}

export function emptyState() {
  return {
    version: 1,
    seq: { student: 0, rate: 0, slot: 0, change: 0, extra: 0, payment: 0 },
    students: [], rates: [], slots: [], changes: [], extras: [], payments: [],
    plans: [], // { key, text }: the Planificación of one Clase, by its class key
    settings: { ...DEFAULT_SETTINGS },
    last_backup: null,
  };
}

// ── dates & times (all local, as plain strings) ───────────────────────
const pad = (n) => String(n).padStart(2, "0");
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (iso) => new Date(`${iso}T12:00:00`);
export const addDays = (iso, n) => { const d = at(iso); d.setDate(d.getDate() + n); return isoDate(d); };
/** 1 = Monday … 7 = Sunday */
export const weekday = (iso) => ((at(iso).getDay() + 6) % 7) + 1;
export const weekStart = (iso) => addDays(iso, 1 - weekday(iso));
export const monthStart = (iso) => `${iso.slice(0, 7)}-01`;
export const nextMonth = (iso) => { const d = at(monthStart(iso)); d.setMonth(d.getMonth() + 1); return isoDate(d); };
export const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const fromMinutes = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
export function localNow() { const d = new Date(); return { date: isoDate(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; }

function validDate(value, label = "la fecha") {
  const s = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isoDate(at(s)) !== s) throw new RegistryError("invalid", `No entendí ${label}.`);
  return s;
}
function validTime(value) {
  const m = String(value || "").trim().match(/^(\d{1,2})[:.h]?(\d{2})?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2] || 0) > 59) throw new RegistryError("invalid", "No entendí la hora. Escribila como 17:30.");
  return `${pad(Number(m[1]))}:${pad(Number(m[2] || 0))}`;
}
function validMinutes(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 15 || n > 600) throw new RegistryError("invalid", "La duración tiene que estar entre 15 minutos y 10 horas.");
  return n;
}
/** "1.200" -> 1200, "800,50" -> 800.5, "40.5" -> 40.5, "1.234,5" -> 1234.5 */
export function parseNumber(value) {
  let t = String(value ?? "").replace(/[\s$]|US/g, "").trim();
  if (!t) return NaN;
  if (t.includes(",") && t.includes(".")) {
    // both: whichever comes last is the decimal mark
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // 1.200 (dots group thousands here)
  else t = t.replace(",", "."); // 1,5 (the comma is the decimal mark)
  return Number(t);
}
function validAmount(value, label) {
  const n = typeof value === "number" ? value : parseNumber(value);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new RegistryError("invalid", `${label} tiene que ser un número.`);
  return Math.round(n * 100) / 100;
}
function validCurrency(c) {
  if (!CURRENCIES.includes(c)) throw new RegistryError("invalid", "La moneda tiene que ser UYU o USD.");
  return c;
}
/** School details are optional: Año is 1º to 6º, the maestra/o's mail only needs to look like one. */
function schoolFields({ school, grade, teacher, teacher_email } = {}) {
  const out = {};
  if (school !== undefined) out.school = String(school ?? "").trim();
  if (teacher !== undefined) out.teacher = String(teacher ?? "").trim();
  if (grade !== undefined) {
    const g = grade === null || String(grade).trim() === "" ? null : Number(grade);
    if (g !== null && !(Number.isInteger(g) && g >= 1 && g <= 6)) throw new RegistryError("invalid", "El año tiene que ser de 1º a 6º.");
    out.grade = g;
  }
  if (teacher_email !== undefined) {
    const e = String(teacher_email ?? "").trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new RegistryError("invalid", "Ese mail no parece bien escrito. Revisalo (por ejemplo, maestra@escuela.edu.uy).");
    out.teacher_email = e;
  }
  return out;
}
const NO_SCHOOL = { school: "", grade: null, teacher: "", teacher_email: "" };
const nowStamp = () => new Date().toISOString().slice(0, 19);
const norm = (t) => String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const round2 = (n) => Math.round(n * 100) / 100;

export class Registry {
  /**
   * @param state  plain object from emptyState() or a backup
   * @param opts.now   () => ({date: 'YYYY-MM-DD', time: 'HH:MM'})
   * @param opts.save  (state) => void, called after every change
   */
  constructor(state, { now = localNow, save = () => {} } = {}) {
    this.state = migrate(state || emptyState());
    this._now = now;
    this._save = save;
  }

  now() { return this._now(); }
  today() { return this._now().date; }

  // Every change works on a copy and is swapped in only if nothing threw.
  _write(fn) {
    const before = this.state;
    this.state = structuredClone(before);
    try {
      const out = fn(this.state);
      this._save(this.state);
      return out;
    } catch (err) {
      this.state = before;
      throw err;
    }
  }
  _id(kind) { return ++this.state.seq[kind]; }

  /** Several changes as one: if any step fails, everything goes back as it was. */
  atomic(fn) {
    const before = this.state;
    try {
      return fn();
    } catch (err) {
      if (this.state !== before) { this.state = before; this._save(this.state); }
      throw err;
    }
  }

  /** Put back an earlier state (used by "Deshacer"). */
  replaceState(state) {
    this.state = state;
    this._save(this.state);
  }

  // ── settings & money ─────────────────────────────────────────────────
  settings() { return { ...this.state.settings }; }

  updateSettings({ currency, usd_rate, title, date_style } = {}) {
    const ch = {};
    if (currency != null) ch.currency = validCurrency(currency);
    if (date_style != null) {
      if (!DATE_STYLES.includes(date_style)) throw new RegistryError("invalid", "Elegí cómo se ven las fechas.");
      ch.date_style = date_style;
    }
    if (usd_rate != null) {
      // A rate like "39,875" or "40.125" is always decimals: nobody pays 39.875 pesos for a dollar.
      const t = String(usd_rate).trim().replace(/\s|\$/g, "");
      const r = typeof usd_rate === "number" ? usd_rate : /^\d+[.,]\d+$/.test(t) ? Number(t.replace(",", ".")) : parseNumber(t);
      if (!Number.isFinite(r)) throw new RegistryError("invalid", "La cotización tiene que ser un número, por ejemplo 40,5.");
      if (r < 1 || r > 1000) throw new RegistryError("invalid", "La cotización son los pesos que vale 1 dólar: un número entre 1 y 1000, por ejemplo 40,5.");
      ch.usd_rate = Math.round(r * 10000) / 10000;
    }
    if (title != null) {
      if (!String(title).trim()) throw new RegistryError("invalid", "El nombre no puede quedar vacío.");
      ch.title = String(title).trim();
    }
    this._write((s) => Object.assign(s.settings, ch));
    return this.settings();
  }

  /** Convert an amount between UYU and USD with her exchange rate. */
  convert(amount, from, to = this.state.settings.currency) {
    if (from === to) return amount;
    const r = this.state.settings.usd_rate;
    return from === "USD" ? amount * r : amount / r;
  }

  // ── students & rates ─────────────────────────────────────────────────
  addStudent({ name, rate, currency = "UYU", notes = "", from = null, demo = false, ...more } = {}) {
    name = String(name || "").trim();
    if (!name) throw new RegistryError("invalid", "Falta el nombre.");
    const amount = validAmount(rate, "La tarifa por hora");
    currency = validCurrency(currency);
    const school = { ...NO_SCHOOL, ...schoolFields(more) };
    const since = from ? validDate(from) : "2000-01-01";
    const id = this._write((s) => {
      const sid = this._id("student");
      s.students.push({ id: sid, name, currency, ink: nextInk(s.students), notes: String(notes || "").trim(), ...school, archived: false, is_demo: demo, created_at: nowStamp() });
      s.rates.push({ id: this._id("rate"), student_id: sid, amount, from: since });
      return sid;
    });
    return this.student(id);
  }

  _requireStudent(id) {
    const st = this.state.students.find((x) => x.id === Number(id));
    if (!st) throw new RegistryError("not_found", "No encontré a esa alumna o alumno.");
    return st;
  }

  updateStudent(id, { name, notes, currency, ...more } = {}) {
    const st = this._requireStudent(id);
    const ch = schoolFields(more);
    if (name != null) { if (!String(name).trim()) throw new RegistryError("invalid", "Falta el nombre."); ch.name = String(name).trim(); }
    if (notes != null) ch.notes = String(notes).trim();
    if (currency != null && currency !== st.currency) {
      // Changing currency changes what past amounts mean: only allowed before any class or payment.
      if (this.state.payments.some((p) => p.student_id === st.id) || this._hasPastClasses(st.id)) {
        throw new RegistryError("invalid", "No se puede cambiar la moneda de alguien que ya tiene clases o pagos. Archivalo y crealo de nuevo.");
      }
      ch.currency = validCurrency(currency);
    }
    this._write((s) => Object.assign(s.students.find((x) => x.id === st.id), ch));
    return this.student(id);
  }

  /** New hourly rate from a date on; classes before that date keep the old rate. */
  setRate(id, amount, from = this.today()) {
    const st = this._requireStudent(id);
    amount = validAmount(amount, "La tarifa por hora");
    from = validDate(from, "desde cuándo rige la tarifa");
    this._write((s) => {
      s.rates = s.rates.filter((r) => !(r.student_id === st.id && r.from === from));
      s.rates.push({ id: this._id("rate"), student_id: st.id, amount, from });
    });
    return this.student(id);
  }

  rateOn(studentId, date) {
    const rates = this.state.rates.filter((r) => r.student_id === Number(studentId) && r.from <= date).sort((a, b) => (a.from < b.from ? 1 : -1));
    return rates[0]?.amount ?? 0;
  }

  /**
   * Archive: every class from this moment on stops (weekly, moved or extra); everything
   * that already happened, today included, stays in the history and the account.
   */
  setArchived(id, archived) {
    const st = this._requireStudent(id);
    if (archived) {
      const now = this.now();
      this._write((s) => {
        Object.assign(s.students.find((x) => x.id === st.id), { archived: true, archived_at: `${now.date} ${now.time}` });
        for (const sl of s.slots.filter((x) => x.student_id === st.id && (!x.to || x.to >= now.date))) {
          const { oldTo } = this._cut(sl, now.date);
          if (sl.from > oldTo) s.slots = s.slots.filter((x) => x.id !== sl.id);
          else sl.to = oldTo;
        }
      });
    } else {
      this._write((s) => Object.assign(s.students.find((x) => x.id === st.id), { archived: false, archived_at: null }));
    }
    return this.student(id);
  }

  students(includeArchived = false) {
    return this.state.students.filter((s) => includeArchived || !s.archived)
      .map((s) => this.student(s.id))
      .sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
  }

  student(id) {
    const st = { ...this._requireStudent(id) };
    const today = this.today();
    st.rate = this.rateOn(st.id, today);
    st.rates = this.state.rates.filter((r) => r.student_id === st.id).sort((a, b) => (a.from < b.from ? 1 : -1));
    // current and upcoming slots (a change "from next Monday" shows both, with their dates)
    st.slots = this.state.slots.filter((s) => s.student_id === st.id && (!s.to || s.to >= today))
      .sort((a, b) => a.weekday - b.weekday || toMinutes(a.start) - toMinutes(b.start) || (a.from < b.from ? -1 : 1));
    st.weekly_minutes = this.activeSlots().filter((s) => s.student_id === st.id).reduce((n, s) => n + s.minutes, 0);
    const bal = this.balance(st.id);
    Object.assign(st, bal);
    return st;
  }

  _hasPastClasses(studentId) {
    const first = this.state.slots.filter((s) => s.student_id === studentId).map((s) => s.from).sort()[0];
    const extra = this.state.extras.some((e) => e.student_id === studentId && e.date <= this.today());
    return extra || (first && first <= this.today() && this.classesBetween(first, this.today()).some((c) => c.student_id === studentId && c.billable));
  }

  // ── weekly slots ─────────────────────────────────────────────────────
  addSlot(studentId, { weekday: wd, start, minutes, from = this.today() } = {}) {
    const st = this._requireStudent(studentId);
    if (st.archived) throw new RegistryError("invalid", `${st.name} está archivado/a.`);
    wd = Number(wd);
    if (!(wd >= 1 && wd <= 7)) throw new RegistryError("invalid", "Elegí el día de la semana.");
    start = validTime(start);
    minutes = validMinutes(minutes);
    from = validDate(from);
    this._checkOverlap({ weekday: wd, start, minutes, from });
    const id = this._write((s) => {
      const sid = this._id("slot");
      s.slots.push({ id: sid, student_id: st.id, weekday: wd, start, minutes, from, to: null });
      return sid;
    });
    return this.slot(id);
  }

  /** Two weekly slots clash when they share a weekday, their times overlap and their date ranges meet. */
  _checkOverlap({ weekday: wd, start, minutes, from, to = null }, ignoreId = null) {
    const a = toMinutes(start), b = a + minutes, END = "9999-12-31";
    const clash = this.state.slots.find((s) => s.id !== ignoreId && s.weekday === wd
      && toMinutes(s.start) < b && a < toMinutes(s.start) + s.minutes
      && s.from <= (to || END) && from <= (s.to || END));
    if (clash) {
      const who = this._requireStudent(clash.student_id).name;
      throw new RegistryError("overlap", `Ese horario se superpone con ${who} (${clash.start}).`, { slot: clash });
    }
  }

  slot(id) {
    const s = this.state.slots.find((x) => x.id === Number(id));
    if (!s) throw new RegistryError("not_found", "No encontré ese horario.");
    return { ...s };
  }

  /** The weekly slots in force on a date (today by default). */
  activeSlots(date = this.today()) {
    return this.state.slots.filter((s) => s.from <= date && (!s.to || s.to >= date))
      .sort((a, b) => a.weekday - b.weekday || toMinutes(a.start) - toMinutes(b.start));
  }

  /**
   * Where a change "from" a date really cuts a slot. From today, if today's class of that
   * slot has already started, it stays with the old slot and the change starts tomorrow:
   * money already made never moves.
   */
  _cut(slot, from) {
    const now = this.now();
    const runsToday = from === now.date && weekday(from) === slot.weekday && slot.from <= from && (!slot.to || slot.to >= from);
    if (runsToday && slot.start <= now.time) return { oldTo: from, newFrom: addDays(from, 1) };
    return { oldTo: addDays(from, -1), newFrom: from };
  }

  /** Change day/time/length from a date on; classes before that keep the old slot. */
  changeSlot(id, { weekday: wd, start, minutes, from = this.today() } = {}) {
    const old = this.slot(id);
    const next = { weekday: wd == null ? old.weekday : Number(wd), start: start == null ? old.start : validTime(start), minutes: minutes == null ? old.minutes : validMinutes(minutes) };
    if (!(next.weekday >= 1 && next.weekday <= 7)) throw new RegistryError("invalid", "Elegí el día de la semana.");
    const { oldTo, newFrom } = this._cut(old, validDate(from));
    this._checkOverlap({ ...next, from: newFrom }, old.id);
    const id2 = this._write((s) => {
      const o = s.slots.find((x) => x.id === old.id);
      if (o.from >= newFrom) { Object.assign(o, next); return o.id; }
      o.to = oldTo;
      const nid = this._id("slot");
      s.slots.push({ id: nid, student_id: o.student_id, ...next, from: newFrom, to: null });
      return nid;
    });
    return this.slot(id2);
  }

  /** Stop a weekly slot from a date on (history stays, today's class too if it already started). */
  endSlot(id, from = this.today()) {
    const old = this.slot(id);
    const { oldTo, newFrom } = this._cut(old, validDate(from));
    this._write((s) => {
      if (old.from >= newFrom) s.slots = s.slots.filter((x) => x.id !== old.id);
      else s.slots.find((x) => x.id === old.id).to = oldTo;
    });
  }

  // ── single classes: cancel, move, extra ──────────────────────────────
  /** key: "s<slotId>-<date>" for a weekly class, "e<extraId>" for an extra one */
  _parseKey(key) {
    const m = String(key).match(/^s(\d+)-(\d{4}-\d{2}-\d{2})$/);
    if (m) return { slot_id: Number(m[1]), date: m[2] };
    const e = String(key).match(/^e(\d+)$/);
    if (e) return { extra_id: Number(e[1]) };
    throw new RegistryError("not_found", "No encontré esa clase.");
  }

  /**
   * A Clase that won't happen. reason "missed" (Faltó: the student didn't come) is charged;
   * "suspended" (she called it off) is not, unless she says to charge it anyway. The charge
   * flag is what money follows; the reason is what she sees.
   */
  cancelClass(key, { reason = null, charge = null } = {}) {
    if (reason != null && !CANCEL_REASONS.includes(reason)) throw new RegistryError("invalid", "¿Faltó o la suspendés vos?");
    reason ??= charge ? "missed" : "suspended";
    charge = charge == null ? reason === "missed" : Boolean(charge);
    const k = this._parseKey(key);
    if (k.extra_id) {
      const ex = this.state.extras.find((e) => e.id === k.extra_id);
      if (!ex) throw new RegistryError("not_found", "No encontré esa clase.");
      this._write((s) => Object.assign(s.extras.find((e) => e.id === ex.id), { cancelled: true, charge, reason }));
      return;
    }
    this._requireOccurrence(k);
    this._write((s) => {
      s.changes = s.changes.filter((c) => !(c.slot_id === k.slot_id && c.date === k.date));
      s.changes.push({ id: this._id("change"), slot_id: k.slot_id, date: k.date, kind: "cancel", charge, reason });
    });
  }

  /** Undo a cancel or a move: the class goes back to its normal day and time. */
  restoreClass(key) {
    const k = this._parseKey(key);
    if (k.extra_id) {
      this._write((s) => { const ex = s.extras.find((e) => e.id === k.extra_id); if (ex) Object.assign(ex, { cancelled: false, charge: false, reason: null }); });
      return;
    }
    this._write((s) => { s.changes = s.changes.filter((c) => !(c.slot_id === k.slot_id && c.date === k.date)); });
  }

  moveClass(key, { date, start, minutes } = {}) {
    const k = this._parseKey(key);
    date = validDate(date, "el nuevo día");
    start = validTime(start);
    if (k.extra_id) {
      const ex = this.state.extras.find((e) => e.id === k.extra_id);
      if (!ex) throw new RegistryError("not_found", "No encontré esa clase.");
      const m = minutes == null ? ex.minutes : validMinutes(minutes);
      this._write((s) => Object.assign(s.extras.find((e) => e.id === ex.id), { date, start, minutes: m, cancelled: false }));
      return;
    }
    const slot = this._requireOccurrence(k);
    const m = minutes == null ? slot.minutes : validMinutes(minutes);
    this._write((s) => {
      s.changes = s.changes.filter((c) => !(c.slot_id === k.slot_id && c.date === k.date));
      s.changes.push({ id: this._id("change"), slot_id: k.slot_id, date: k.date, kind: "move", new_date: date, new_start: start, new_minutes: m });
    });
  }

  addExtra(studentId, { date, start, minutes } = {}) {
    const st = this._requireStudent(studentId);
    date = validDate(date);
    start = validTime(start);
    minutes = validMinutes(minutes);
    const id = this._write((s) => {
      const eid = this._id("extra");
      s.extras.push({ id: eid, student_id: st.id, date, start, minutes, cancelled: false, charge: false });
      return eid;
    });
    return `e${id}`;
  }

  /**
   * The Planificación of one Clase: what she plans to work on. Kept by class key, so it
   * follows the Clase when it is moved, cancelled or put back. Empty text removes it.
   */
  setPlan(key, text) {
    const k = this._parseKey(key);
    if (k.extra_id) { if (!this.state.extras.some((e) => e.id === k.extra_id)) throw new RegistryError("not_found", "No encontré esa clase."); }
    else this._requireOccurrence(k);
    const t = String(text ?? "").trim();
    if (t.length > 4000) throw new RegistryError("invalid", "La planificación es demasiado larga.");
    const id = String(key);
    this._write((s) => {
      s.plans = s.plans.filter((p) => p.key !== id);
      if (t) s.plans.push({ key: id, text: t });
    });
    return t;
  }

  _requireOccurrence({ slot_id, date }) {
    const slot = this.state.slots.find((s) => s.id === slot_id);
    if (!slot || weekday(date) !== slot.weekday || date < slot.from || (slot.to && date > slot.to)) {
      throw new RegistryError("not_found", "No encontré esa clase.");
    }
    return slot;
  }

  /**
   * Every class between two dates (inclusive), sorted by date and time.
   * status: 'given' (time passed), 'scheduled', or 'cancelled'. billable: counts as money
   * (given, or cancelled with "se cobra"; future ones are expected money).
   */
  classesBetween(from, to) {
    const now = this.now();
    const nowKey = `${now.date} ${now.time}`;
    const out = [];
    const changes = new Map(this.state.changes.map((c) => [`${c.slot_id}-${c.date}`, c]));
    const plans = new Map(this.state.plans.map((p) => [p.key, p.text]));
    const stopped = new Map(this.state.students.filter((x) => x.archived && x.archived_at).map((x) => [x.id, x.archived_at]));
    const push = (o) => {
      if (stopped.has(o.student_id) && `${o.date} ${o.start}` >= stopped.get(o.student_id)) return; // after archiving
      const end = fromMinutes(Math.min(toMinutes(o.start) + o.minutes, 24 * 60 - 1));
      const done = `${o.date} ${end}` <= nowKey;
      const status = o.cancelled ? "cancelled" : done ? "given" : "scheduled";
      const st = this.state.students.find((x) => x.id === o.student_id);
      const amount = round2((o.minutes / 60) * this.rateOn(o.student_id, o.rate_date || o.date));
      // cancels saved before reasons existed: a charged one was a Faltó, an uncharged one a suspension
      const reason = o.cancelled ? o.reason || (o.charge ? "missed" : "suspended") : null;
      out.push({ ...o, reason, end, status, past: done, billable: o.cancelled ? Boolean(o.charge) : true, amount, currency: st.currency, student: st.name, plan: plans.get(o.key) || "" });
    };
    for (const slot of this.state.slots) {
      let d = addDays(from, (slot.weekday - weekday(from) + 7) % 7);
      for (; d <= to; d = addDays(d, 7)) {
        if (d < slot.from || (slot.to && d > slot.to)) continue;
        const ch = changes.get(`${slot.id}-${d}`);
        if (ch?.kind === "move") continue; // shown on its new day (below)
        push({ key: `s${slot.id}-${d}`, kind: "slot", slot_id: slot.id, student_id: slot.student_id, date: d, start: slot.start, minutes: slot.minutes,
          cancelled: ch?.kind === "cancel", charge: ch?.charge || false, reason: ch?.reason || null });
      }
    }
    for (const ch of this.state.changes) {
      if (ch.kind !== "move" || ch.new_date < from || ch.new_date > to) continue;
      const slot = this.state.slots.find((s) => s.id === ch.slot_id);
      if (!slot) continue;
      push({ key: `s${slot.id}-${ch.date}`, kind: "slot", slot_id: slot.id, student_id: slot.student_id, date: ch.new_date, start: ch.new_start,
        minutes: ch.new_minutes, moved_from: ch.date, rate_date: ch.date, cancelled: false, charge: false });
    }
    for (const ex of this.state.extras) {
      if (ex.date < from || ex.date > to) continue;
      push({ key: `e${ex.id}`, kind: "extra", extra_id: ex.id, student_id: ex.student_id, date: ex.date, start: ex.start, minutes: ex.minutes,
        cancelled: ex.cancelled, charge: ex.charge, reason: ex.reason || null });
    }
    return out.sort((a, b) => (a.date === b.date ? toMinutes(a.start) - toMinutes(b.start) : a.date < b.date ? -1 : 1));
  }

  // ── payments & balances ──────────────────────────────────────────────
  addPayment(studentId, { amount, date = this.today(), note = "" } = {}) {
    const st = this._requireStudent(studentId);
    amount = validAmount(amount, "El monto");
    if (amount <= 0) throw new RegistryError("invalid", "El monto tiene que ser mayor que cero.");
    date = validDate(date);
    const id = this._write((s) => {
      const pid = this._id("payment");
      s.payments.push({ id: pid, student_id: st.id, amount, currency: st.currency, date, note: String(note || "").trim() });
      return pid;
    });
    return { ...this.state.payments.find((p) => p.id === id) };
  }

  removePayment(id) {
    if (!this.state.payments.some((p) => p.id === Number(id))) throw new RegistryError("not_found", "No encontré ese pago.");
    this._write((s) => { s.payments = s.payments.filter((p) => p.id !== Number(id)); });
  }

  payments(studentId = null) {
    return this.state.payments.filter((p) => studentId == null || p.student_id === Number(studentId))
      .map((p) => ({ ...p, student: this._requireStudent(p.student_id).name }))
      .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  }

  _firstDate() {
    const dates = [...this.state.slots.map((s) => s.from), ...this.state.extras.map((e) => e.date), ...this.state.changes.filter((c) => c.new_date).map((c) => c.new_date)];
    return dates.sort()[0] || this.today();
  }

  /** What the student has been charged so far (past billable classes) and paid, in their currency. */
  balance(studentId) {
    const id = Number(studentId);
    const earned = round2(this.classesBetween(this._firstDate(), this.today())
      .filter((c) => c.student_id === id && c.past && c.billable).reduce((n, c) => n + c.amount, 0));
    const paid = round2(this.state.payments.filter((p) => p.student_id === id).reduce((n, p) => n + p.amount, 0));
    return { earned_total: earned, paid_total: paid, owes: round2(earned - paid) };
  }

  /** Students who owe money, most first. Amounts in each student's currency and in hers. */
  owing() {
    return this.students(true).filter((s) => s.owes > 0.004)
      .map((s) => ({ id: s.id, name: s.name, owes: s.owes, currency: s.currency, owes_display: round2(this.convert(s.owes, s.currency)) }))
      .sort((a, b) => b.owes_display - a.owes_display);
  }

  // ── money summaries (in her chosen currency) ─────────────────────────
  _sum(classes, pick) { return round2(classes.filter(pick).reduce((n, c) => n + this.convert(c.amount, c.currency), 0)); }

  /** One period: earned (billable classes already given), expected (billable still to come). */
  period(from, to) {
    const cs = this.classesBetween(from, to);
    const earned = this._sum(cs, (c) => c.billable && c.past);
    const expected = this._sum(cs, (c) => c.billable && !c.past);
    const paid = round2(this.state.payments.filter((p) => p.date >= from && p.date <= to).reduce((n, p) => n + this.convert(p.amount, p.currency), 0));
    const hours = round2(cs.filter((c) => !c.cancelled).reduce((n, c) => n + c.minutes, 0) / 60);
    return { from, to, earned, expected, total: round2(earned + expected), paid, hours, classes: cs.filter((c) => !c.cancelled).length };
  }

  week(date = this.today()) {
    const from = weekStart(date);
    return { ...this.period(from, addDays(from, 6)), classes_list: this.classesBetween(from, addDays(from, 6)) };
  }

  /** Last `back` weeks up to `ahead` weeks after this one. */
  weeks(back = 8, ahead = 0) {
    const thisWeek = weekStart(this.today());
    const out = [];
    for (let i = -back; i <= ahead; i++) { const from = addDays(thisWeek, i * 7); out.push(this.period(from, addDays(from, 6))); }
    return out;
  }

  months(back = 5, ahead = 1) {
    let m = monthStart(this.today());
    for (let i = 0; i < back; i++) { const d = at(m); d.setMonth(d.getMonth() - 1); m = isoDate(d); }
    const out = [];
    for (let i = 0; i <= back + ahead; i++) { const next = nextMonth(m); out.push({ ...this.period(m, addDays(next, -1)), month: m.slice(0, 7) }); m = next; }
    return out;
  }

  /** This month per student (earned + expected), biggest first. */
  monthByStudent(date = this.today()) {
    const from = monthStart(date), to = addDays(nextMonth(date), -1);
    const cs = this.classesBetween(from, to).filter((c) => c.billable);
    const by = new Map();
    for (const c of cs) by.set(c.student_id, (by.get(c.student_id) || 0) + this.convert(c.amount, c.currency));
    return [...by].map(([id, v]) => ({ id, name: this._requireStudent(id).name, amount: round2(v) })).sort((a, b) => b.amount - a.amount);
  }

  // ── projection ───────────────────────────────────────────────────────
  /** What her current weekly slots bring in, per week and per month (her currency). */
  baseline() {
    const today = this.today();
    let perWeek = 0, minutes = 0;
    for (const s of this.activeSlots()) {
      const st = this._requireStudent(s.student_id);
      perWeek += this.convert((s.minutes / 60) * this.rateOn(st.id, today), st.currency);
      minutes += s.minutes;
    }
    const students = new Set(this.activeSlots().map((s) => s.student_id)).size;
    const hours = minutes / 60;
    return { students, per_week: round2(perWeek), per_month: round2(perWeek * WEEKS_PER_MONTH), hours_per_week: round2(hours),
      hours_per_day: round2(hours / WORKDAYS), avg_rate: hours ? round2(perWeek / hours) : 0 };
  }

  /**
   * "¿Y si sumo alumnos?": n new students, each `perWeek` classes of `hours` at `rate`
   * (rate in her current currency). Returns the baseline, the extra and the new total.
   */
  projection({ students = 0, per_week = 1, hours = 1, rate = 0 } = {}) {
    const base = this.baseline();
    const n = Math.max(0, Math.round(Number(students) || 0));
    const extraHours = n * Math.max(0, Number(per_week) || 0) * Math.max(0, Number(hours) || 0);
    const extraWeek = round2(extraHours * Math.max(0, Number(rate) || 0));
    return {
      base,
      extra: { students: n, hours_per_week: round2(extraHours), per_week: extraWeek, per_month: round2(extraWeek * WEEKS_PER_MONTH), per_year: round2(extraWeek * 52) },
      total: { students: base.students + n, hours_per_week: round2(base.hours_per_week + extraHours),
        hours_per_day: round2((base.hours_per_week + extraHours) / WORKDAYS), per_week: round2(base.per_week + extraWeek),
        per_month: round2((base.per_week + extraWeek) * WEEKS_PER_MONTH), per_year: round2((base.per_week + extraWeek) * 52) },
      growth: base.per_month ? round2((extraWeek / base.per_week) * 100) : null,
    };
  }

  summary() {
    return {
      today: this.today(), now: this.now(), settings: this.settings(),
      students: this.state.students.filter((s) => !s.archived).length,
      has_demo: this.state.students.some((s) => s.is_demo),
      last_backup: this.state.last_backup,
    };
  }

  // ── exports & backup ─────────────────────────────────────────────────
  exportTable(kind) {
    const cur = this.state.settings.currency;
    if (kind === "classes") {
      const cs = this.classesBetween(this._firstDate(), addDays(this.today(), 28));
      return {
        name: "Clases",
        columns: [["Fecha", 12, "date"], ["Hora", 8], ["Alumno", 26], ["Minutos", 9], ["Estado", 12], ["Monto", 11], ["Moneda", 8]],
        rows: cs.map((c) => [c.date, c.start, c.student, c.minutes, c.cancelled ? (c.reason === "missed" ? "Faltó (se cobra)" : c.charge ? "Suspendida (se cobra)" : "Suspendida") : c.past ? "Dada" : "Agendada",
          c.billable ? c.amount : 0, c.currency]),
      };
    }
    if (kind === "payments") {
      return { name: "Pagos", columns: [["Fecha", 12, "date"], ["Alumno", 26], ["Monto", 11], ["Moneda", 8], ["Nota", 30]],
        rows: this.payments().map((p) => [p.date, p.student, p.amount, p.currency, p.note]) };
    }
    if (kind === "students") {
      return { name: "Alumnos", columns: [["Nombre", 26], ["Tarifa por hora", 15], ["Moneda", 8], ["Horas por semana", 16], ["Debe", 11], [`Debe (${cur})`, 13],
        ["Colegio", 24], ["Año", 6], ["Maestra/o", 22], ["Mail de la maestra/o", 28]],
        rows: this.students(true).map((s) => [s.name, s.rate, s.currency, round2(s.weekly_minutes / 60), s.owes, round2(this.convert(s.owes, s.currency)),
          s.school, s.grade ? `${s.grade}º` : "", s.teacher, s.teacher_email]) };
    }
    throw new RegistryError("invalid", "Tipo de planilla desconocido.");
  }

  backup() {
    this._write((s) => { s.last_backup = this.today(); });
    return JSON.stringify({ app: "mis-clases", saved_at: nowStamp(), ...this.state }, null, 1);
  }

  restore(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new RegistryError("invalid", "Ese archivo no es una copia de Mis clases."); }
    const lists = ["students", "rates", "slots", "changes", "extras", "payments"];
    if (!data || data.app !== "mis-clases" || lists.some((k) => !Array.isArray(data[k])) || typeof data.settings !== "object" || !data.settings) {
      throw new RegistryError("invalid", "Ese archivo no es una copia de Mis clases.");
    }
    const { app, saved_at, ...state } = data;
    this._write((s) => { for (const k of Object.keys(s)) delete s[k]; Object.assign(s, migrate(state)); });
    return this.summary();
  }

  // ── example data ─────────────────────────────────────────────────────
  loadDemo(demo) {
    if (this.summary().has_demo) throw new RegistryError("invalid", "Los datos de ejemplo ya están cargados.");
    const today = this.today();
    const start = addDays(weekStart(today), -7 * demo.WEEKS_BACK);
    const ids = demo.STUDENTS.map(([name, rate, currency, slots, ratesBefore]) => {
      const st = this.addStudent({ name, rate: ratesBefore ?? rate, currency, demo: true });
      if (ratesBefore != null) this.setRate(st.id, rate, addDays(weekStart(today), -7 * 6));
      for (const [wd, time, minutes] of slots) this.addSlot(st.id, { weekday: wd, start: time, minutes, from: start });
      return st.id;
    });
    // a cancellation, a charged cancellation, a moved class and an extra class, all recent
    const lastWeek = addDays(weekStart(today), -7);
    const cs = this.classesBetween(lastWeek, addDays(lastWeek, 6));
    if (cs[0]) this.cancelClass(cs[0].key, { reason: "suspended" });
    if (cs[2]) this.cancelClass(cs[2].key, { reason: "missed" });
    if (cs[3]) this.moveClass(cs[3].key, { date: addDays(cs[3].date, 1), start: "19:00" });
    this.addExtra(ids[0], { date: addDays(lastWeek, 5), start: "10:00", minutes: 90 });
    // payments: each month paid in its first days; two students have not paid last month yet
    const thisMonth = monthStart(today);
    for (const [i, id] of ids.entries()) {
      for (let m = monthStart(start); m < thisMonth; m = nextMonth(m)) {
        const late = (i === 1 || i === 3) && nextMonth(m) === thisMonth;
        if (late) continue;
        const due = this.classesBetween(m, addDays(nextMonth(m), -1)).filter((c) => c.student_id === id && c.billable).reduce((n, c) => n + c.amount, 0);
        const paidOn = addDays(nextMonth(m), i); // first days of the next month
        if (due > 0 && paidOn <= today) this.addPayment(id, { amount: round2(due), date: paidOn });
      }
    }
    return this.summary();
  }

  clearDemo() {
    this._write((s) => {
      const demo = new Set(s.students.filter((x) => x.is_demo).map((x) => x.id));
      const demoSlots = new Set(s.slots.filter((x) => demo.has(x.student_id)).map((x) => x.id));
      s.students = s.students.filter((x) => !demo.has(x.id));
      s.rates = s.rates.filter((x) => !demo.has(x.student_id));
      s.slots = s.slots.filter((x) => !demoSlots.has(x.id));
      s.changes = s.changes.filter((x) => !demoSlots.has(x.slot_id));
      const demoExtras = new Set(s.extras.filter((x) => demo.has(x.student_id)).map((x) => x.id));
      s.plans = s.plans.filter((p) => { const m = p.key.match(/^s(\d+)-|^e(\d+)$/); return !(m && (m[1] ? demoSlots.has(Number(m[1])) : demoExtras.has(Number(m[2])))); });
      s.extras = s.extras.filter((x) => !demo.has(x.student_id));
      s.payments = s.payments.filter((x) => !demo.has(x.student_id));
    });
    return this.summary();
  }
}

function migrate(state) {
  const base = emptyState();
  const out = { ...base, ...state, seq: { ...base.seq, ...(state.seq || {}) }, settings: { ...base.settings, ...(state.settings || {}) } };
  // students saved before colours were stored get one now, in the order they were added
  const done = [];
  out.students = (out.students || []).map((st) => { const s2 = { ...NO_SCHOOL, ...(st.ink ? st : { ...st, ink: nextInk(done) }) }; done.push(s2); return s2; });
  return out;
}
