// Behaviour of the class registry through its public interface (the code the iPad runs).
// The clock is pinned: Wednesday 7 Oct 2026, 12:00.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Registry, RegistryError, emptyState, weekday, weekStart, parseNumber } from "../app/static/registry.js";
import * as DEMO from "../app/static/demo-data.js";

let r, clock, martina, joaquin, emma;
const MON = "2026-10-05", TUE = "2026-10-06", WED = "2026-10-07", THU = "2026-10-08";

beforeEach(() => {
  clock = { date: WED, time: "12:00" };
  r = new Registry(emptyState(), { now: () => ({ ...clock }) });
  martina = r.addStudent({ name: "Martina López", rate: 800 });
  joaquin = r.addStudent({ name: "Joaquín Pereira", rate: "1.200" });
  emma = r.addStudent({ name: "Emma Acosta", rate: 25, currency: "USD" });
  r.addSlot(martina.id, { weekday: 1, start: "17:00", minutes: 60, from: "2026-09-01" }); // Mondays
  r.addSlot(joaquin.id, { weekday: 3, start: "18:30", minutes: 90, from: "2026-09-01" }); // Wednesdays, later today
  r.addSlot(emma.id, { weekday: 2, start: "16:00", minutes: 60, from: "2026-09-01" }); // Tuesdays
});

const rejects = (fn, code) => assert.throws(fn, (e) => e instanceof RegistryError && (!code || e.code === code));
const week = () => r.classesBetween(MON, addDaysLocal(MON, 6));
function addDaysLocal(iso, n) { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// ── dates & numbers ──
test("weeks start on Monday", () => {
  assert.equal(weekday(MON), 1);
  assert.equal(weekday("2026-10-11"), 7);
  assert.equal(weekStart(THU), MON);
});

test("amounts typed the Uruguayan way", () => {
  assert.equal(parseNumber("1.200"), 1200);
  assert.equal(parseNumber("800,50"), 800.5);
  assert.equal(parseNumber("40.5"), 40.5);
  assert.equal(parseNumber("$ 1.234,5"), 1234.5);
  assert.equal(joaquin.rate, 1200);
});

// ── the agenda ──
test("weekly slots fill the week; passed classes are given, the rest scheduled", () => {
  const cs = week();
  assert.deepEqual(cs.map((c) => [c.date, c.start, c.student, c.status]), [
    [MON, "17:00", "Martina López", "given"],
    [TUE, "16:00", "Emma Acosta", "given"],
    [WED, "18:30", "Joaquín Pereira", "scheduled"],
  ]);
  assert.deepEqual(cs.map((c) => [c.amount, c.currency]), [[800, "UYU"], [25, "USD"], [1800, "UYU"]]);
});

test("a class becomes 'given' once it ends, not when it starts", () => {
  clock.time = "19:00";
  assert.equal(week()[2].status, "scheduled");
  clock.time = "20:00";
  assert.equal(week()[2].status, "given");
});

test("two classes cannot overlap on the same day", () => {
  rejects(() => r.addSlot(emma.id, { weekday: 1, start: "17:30", minutes: 60 }), "overlap");
  assert.ok(r.addSlot(emma.id, { weekday: 1, start: "18:00", minutes: 60 }));
});

test("cancel, charge anyway, restore", () => {
  const key = week()[0].key;
  r.cancelClass(key);
  assert.deepEqual([week()[0].status, week()[0].billable], ["cancelled", false]);
  assert.equal(r.balance(martina.id).owes, 800 * 5 - 800); // five Mondays since 1/9 minus this one
  r.cancelClass(key, { charge: true });
  assert.deepEqual([week()[0].status, week()[0].billable], ["cancelled", true]);
  r.restoreClass(key);
  assert.equal(week()[0].status, "given");
});

test("a moved class shows on its new day and keeps its original rate", () => {
  const key = week()[2].key; // Joaquín, Wednesday
  r.setRate(joaquin.id, 1500, THU);
  r.moveClass(key, { date: THU, start: "10:00" });
  const cs = week();
  const moved = cs.find((c) => c.key === key);
  assert.deepEqual([moved.date, moved.start, moved.moved_from, moved.amount], [THU, "10:00", WED, 1800]);
  assert.equal(cs.filter((c) => c.student_id === joaquin.id).length, 1);
});

test("a class moved into next week appears there, not here", () => {
  r.moveClass(week()[2].key, { date: "2026-10-13", start: "18:30" });
  assert.equal(week().some((c) => c.student_id === joaquin.id), false);
  assert.equal(r.classesBetween("2026-10-12", "2026-10-18").filter((c) => c.student_id === joaquin.id).length, 2);
});

test("an extra class counts like any other", () => {
  const key = r.addExtra(martina.id, { date: TUE, start: "10:00", minutes: 90 });
  const ex = week().find((c) => c.key === key);
  assert.deepEqual([ex.status, ex.amount], ["given", 1200]);
});

test("a 50-minute class is charged 50/60 of the hourly rate", () => {
  const key = r.addExtra(joaquin.id, { date: THU, start: "10:00", minutes: 50 }); // $ 1.200 an hour
  const c = r.classesBetween(THU, THU).find((x) => x.key === key);
  assert.deepEqual([c.minutes, c.amount], [50, 1000]);
  const odd = r.addStudent({ name: "Odd", rate: 800 });
  const k2 = r.addExtra(odd.id, { date: THU, start: "12:00", minutes: 50 });
  assert.equal(r.classesBetween(THU, THU).find((x) => x.key === k2).amount, 666.67); // rounded to cents
});

test("school details: optional, checked, editable, exported", () => {
  const ana = r.addStudent({ name: "Ana", rate: 800, school: " Escuela 12 ", grade: "4", teacher: "Maestra Uno", teacher_email: "uno@escuela.edu.uy" });
  assert.deepEqual([ana.school, ana.grade, ana.teacher, ana.teacher_email], ["Escuela 12", 4, "Maestra Uno", "uno@escuela.edu.uy"]);
  assert.deepEqual([martina.school, martina.grade, martina.teacher, martina.teacher_email], ["", null, "", ""]);
  const before = JSON.stringify(r.state);
  rejects(() => r.addStudent({ name: "X", rate: 800, grade: 7 }), "invalid");
  rejects(() => r.addStudent({ name: "X", rate: 800, grade: "0" }), "invalid");
  rejects(() => r.updateStudent(ana.id, { teacher_email: "uno@escuela" }), "invalid");
  rejects(() => r.updateStudent(ana.id, { teacher_email: "uno escuela.edu.uy" }), "invalid");
  assert.equal(JSON.stringify(r.state), before);
  const upd = r.updateStudent(ana.id, { grade: "", teacher_email: "", school: "Colegio Dos" });
  assert.deepEqual([upd.school, upd.grade, upd.teacher, upd.teacher_email], ["Colegio Dos", null, "Maestra Uno", ""]);
  assert.equal(r.updateStudent(ana.id, { name: "Ana B" }).school, "Colegio Dos"); // other edits leave them alone
  const t = r.exportTable("students");
  const row = t.rows.find((x) => x[0] === "Ana B");
  assert.deepEqual(t.columns.slice(-4).map((c) => c[0]), ["Colegio", "Año", "Maestra/o", "Mail de la maestra/o"]);
  assert.deepEqual(row.slice(-4), ["Colegio Dos", "", "Maestra Uno", ""]);
  // a student saved before these fields existed
  const old = structuredClone(r.state);
  for (const st of old.students) { delete st.school; delete st.grade; delete st.teacher; delete st.teacher_email; }
  const r2 = new Registry(old, { now: () => clock });
  assert.deepEqual([r2.student(martina.id).school, r2.student(martina.id).grade], ["", null]);
});

// ── rates & slots over time ──
test("a raise applies from its date; past classes keep the old rate", () => {
  r.setRate(martina.id, 1000, THU);
  assert.equal(week()[0].amount, 800);
  assert.equal(r.classesBetween("2026-10-12", "2026-10-12")[0].amount, 1000);
  assert.equal(r.student(martina.id).rate, 800); // still 800 today
  clock.date = THU;
  assert.equal(r.student(martina.id).rate, 1000);
});

test("changing a slot from a date keeps the past on the old day", () => {
  const slot = r.student(martina.id).slots[0];
  r.changeSlot(slot.id, { weekday: 4, start: "17:00", from: WED });
  const cs = week().filter((c) => c.student_id === martina.id);
  assert.deepEqual(cs.map((c) => c.date), [MON, THU]);
});

test("archiving stops future classes and keeps the history and the debt", () => {
  const before = r.balance(martina.id).owes;
  r.setArchived(martina.id, true);
  assert.equal(r.classesBetween("2026-10-12", "2026-10-18").some((c) => c.student_id === martina.id), false);
  assert.equal(r.balance(martina.id).owes, before);
});

// ── found by the independent verifier: past money must never change ──
test("removing, changing or archiving from today keeps a class already given today", () => {
  clock.time = "20:00"; // Joaquín's Wednesday 18:30–20:00 class has just ended
  const slot = r.student(joaquin.id).slots[0];
  const owes = r.balance(joaquin.id).owes;
  const earned = r.week().earned;
  const snap = r.state;
  r.endSlot(slot.id);
  assert.deepEqual([r.balance(joaquin.id).owes, r.week().earned], [owes, earned]);
  r.replaceState(snap);
  r.changeSlot(slot.id, { start: "21:00" });
  assert.deepEqual([r.balance(joaquin.id).owes, r.week().earned], [owes, earned]);
  assert.equal(week().filter((c) => c.student_id === joaquin.id).length, 1); // not a second class tonight
  r.replaceState(snap);
  r.setArchived(joaquin.id, true);
  assert.deepEqual([r.balance(joaquin.id).owes, r.week().earned], [owes, earned]);
});

test("archiving also stops extra and moved classes still to come", () => {
  r.addExtra(martina.id, { date: "2026-10-09", start: "10:00", minutes: 60 });
  r.moveClass(`s1-2026-10-12`, { date: "2026-10-13", start: "10:00" });
  r.setArchived(martina.id, true);
  assert.equal(r.classesBetween(THU, "2026-10-31").some((c) => c.student_id === martina.id), false);
});

test("a slot changed from a future date counts once, and frees its old time only from then", () => {
  const slot = r.student(joaquin.id).slots[0];
  r.changeSlot(slot.id, { weekday: 4, start: "18:30", from: "2026-10-12" });
  assert.equal(r.baseline().per_week, 3600); // not doubled
  assert.equal(r.baseline().hours_per_week, 3.5);
  // Wednesday 18:30 is still Joaquín's until then, free after
  rejects(() => r.addSlot(emma.id, { weekday: 3, start: "18:30", minutes: 60, from: WED }), "overlap");
  assert.ok(r.addSlot(emma.id, { weekday: 3, start: "18:30", minutes: 60, from: "2026-10-14" }));
});

test("each student keeps one colour; the eight are used before any repeats", () => {
  const more = ["A", "B", "C", "D", "E"].map((n) => r.addStudent({ name: n, rate: 500 }));
  const inks = [martina, joaquin, emma, ...more].map((x) => r.student(x.id).ink);
  assert.equal(new Set(inks).size, 8);
  const ninth = r.addStudent({ name: "F", rate: 500 });
  assert.ok(inks.includes(ninth.ink));
  r.setArchived(more[0].id, true); // a freed colour is reused first
  assert.equal(r.addStudent({ name: "G", rate: 500 }).ink, r.student(more[0].id).ink);
  assert.equal(r.student(martina.id).ink, inks[0]); // never changes
});

test("restore refuses a damaged backup", () => {
  rejects(() => r.restore('{"app":"mis-clases","students":[],"slots":[],"rates":"x"}'), "invalid");
});

test("the exchange rate always reads its comma or dot as decimals, and a silly rate is refused", () => {
  assert.equal(r.updateSettings({ usd_rate: "39,875" }).usd_rate, 39.875);
  assert.equal(r.updateSettings({ usd_rate: "40.125" }).usd_rate, 40.125);
  rejects(() => r.updateSettings({ usd_rate: "39875" }), "invalid");
});

test("more number formats", () => {
  assert.equal(parseNumber("1,234.50"), 1234.5);
  assert.equal(parseNumber("1,000"), 1); // comma = decimal mark in Uruguay
  assert.equal(parseNumber("10.000,50"), 10000.5);
  assert.equal(parseNumber("1,5"), 1.5);
});

// ── money ──
test("payments lower what is owed; owing list in her currency", () => {
  assert.equal(r.balance(martina.id).owes, 4000); // Mondays 7/9 … 5/10
  r.addPayment(martina.id, { amount: "3.200" });
  assert.equal(r.balance(martina.id).owes, 800);
  const owing = r.owing();
  assert.deepEqual(owing.map((o) => o.name), ["Joaquín Pereira", "Emma Acosta", "Martina López"]); // $ 9.000, $ 6.000, $ 800
  const e = owing.find((o) => o.name === "Emma Acosta");
  assert.deepEqual([e.owes, e.currency, e.owes_display], [150, "USD", 150 * 40]); // six Tuesdays × US$ 25
});

test("the week: earned so far, still to come, total, hours", () => {
  const w = r.week();
  assert.deepEqual([w.earned, w.expected, w.total, w.hours, w.classes], [800 + 25 * 40, 1800, 3600, 3.5, 3]);
  r.updateSettings({ currency: "USD" });
  assert.deepEqual([r.week().earned, r.week().expected], [45, 45]);
});

test("months add up to the classes in them", () => {
  const ms = r.months(1, 0); // September and October
  assert.deepEqual(ms.map((m) => m.month), ["2026-09", "2026-10"]);
  // September: Mondays 7,14,21,28 · Tuesdays 1,8,15,22,29 · Wednesdays 2,9,16,23,30
  assert.equal(ms[0].earned, 4 * 800 + 5 * 25 * 40 + 5 * 1800);
  assert.equal(ms[0].expected, 0);
  // October: given = Mon 5 + Tue 6; expected = Wed 7 … end of month
  assert.equal(ms[1].earned, 800 + 1000);
  assert.ok(ms[1].expected > 0);
});

test("per-student month ranking", () => {
  assert.equal(r.monthByStudent()[0].name, "Joaquín Pereira");
});

test("projection: today's weekly slots plus N new students", () => {
  const base = r.baseline();
  assert.deepEqual([base.students, base.per_week, base.hours_per_week], [3, 800 + 1000 + 1800, 3.5]);
  const p = r.projection({ students: 2, per_week: 2, hours: 1, rate: 900 });
  assert.deepEqual([p.extra.hours_per_week, p.extra.per_week, p.total.hours_per_week, p.total.students], [4, 3600, 7.5, 5]);
  assert.equal(p.extra.per_month, Math.round(3600 * 52 / 12 * 100) / 100);
  assert.equal(p.growth, 100);
  // hours per day over a 5-day week, counting every student: today 3.5 h / 5, with them 7.5 h / 5
  assert.deepEqual([base.hours_per_day, p.total.hours_per_day], [0.7, 1.5]);
  assert.equal(r.projection({ students: 0, rate: 900 }).extra.per_week, 0);
});

test("dates show with the month's name unless she picks another style", () => {
  assert.equal(r.settings().date_style, "long");
  assert.equal(r.updateSettings({ date_style: "numeric" }).date_style, "numeric");
  assert.equal(r.updateSettings({ date_style: "short" }).date_style, "short");
  rejects(() => r.updateSettings({ date_style: "american" }), "invalid");
  const { date_style, ...oldSettings } = emptyState().settings; // a state saved before the setting existed
  const old = new Registry({ ...emptyState(), settings: oldSettings }, { now: () => clock });
  assert.equal(old.settings().date_style, "long");
});

test("USD switch uses her rate and refuses nonsense", () => {
  r.updateSettings({ currency: "USD", usd_rate: "42,5" });
  assert.equal(r.convert(850, "UYU"), 20);
  rejects(() => r.updateSettings({ usd_rate: "0,5" }), "invalid");
  rejects(() => r.updateSettings({ currency: "EUR" }), "invalid");
});

test("a student's currency cannot change once they have classes", () => {
  rejects(() => r.updateStudent(emma.id, { currency: "UYU" }), "invalid");
  const nueva = r.addStudent({ name: "Nueva", rate: 30, currency: "USD" });
  assert.equal(r.updateStudent(nueva.id, { currency: "UYU" }).currency, "UYU");
});

// ── safety ──
test("bad input is refused and changes nothing", () => {
  const before = JSON.stringify(r.state);
  rejects(() => r.addStudent({ name: "", rate: 800 }));
  rejects(() => r.addStudent({ name: "X", rate: "mucho" }));
  rejects(() => r.addSlot(martina.id, { weekday: 9, start: "17:00", minutes: 60 }));
  rejects(() => r.addSlot(martina.id, { weekday: 2, start: "25:00", minutes: 60 }));
  rejects(() => r.addSlot(martina.id, { weekday: 2, start: "17:00", minutes: 5 }));
  rejects(() => r.cancelClass(`s1-${TUE}`), "not_found"); // Martina has no Tuesday class
  rejects(() => r.addPayment(martina.id, { amount: 0 }));
  assert.equal(JSON.stringify(r.state), before);
});

test("if saving fails, the change is undone in memory too", () => {
  let fail = false;
  const fragile = new Registry(emptyState(), { now: () => clock, save: () => { if (fail) throw new Error("disk full"); } });
  const s = fragile.addStudent({ name: "Ana", rate: 800 });
  fail = true;
  assert.throws(() => fragile.addPayment(s.id, { amount: 100 }), /disk full/);
  assert.equal(fragile.payments().length, 0);
});

test("backup restores exactly; a wrong file is refused", () => {
  r.addPayment(martina.id, { amount: 800 });
  const other = new Registry(emptyState(), { now: () => clock });
  other.restore(r.backup());
  assert.deepEqual(other.week(), r.week());
  assert.deepEqual(other.owing(), r.owing());
  rejects(() => other.restore('{"app":"biblioteca","books":[]}'), "invalid");
});

test("demo data loads with history, a raise, cancellations and debts, and clears cleanly", () => {
  r = new Registry(emptyState(), { now: () => ({ ...clock }) });
  r.addStudent({ name: "Real", rate: 700 });
  r.loadDemo(DEMO);
  assert.ok(r.summary().has_demo);
  assert.ok(r.months(5, 0).every((m) => m.earned > 0));
  assert.ok(r.owing().length >= 2);
  assert.ok(r.state.changes.some((c) => c.kind === "cancel" && c.charge));
  r.clearDemo();
  assert.equal(r.summary().has_demo, false);
  assert.deepEqual(r.students().map((s) => s.name), ["Real"]);
});
