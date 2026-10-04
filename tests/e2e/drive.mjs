// verify-clases: Launch → Doctor → Drive → Evidence → Cleanup.
// Drives the real app in WebKit (Safari's engine) at iPad sizes with touch, and reads every
// change back from what the page saved on the device (IndexedDB). The clock is pinned to
// Wednesday 7 Oct 2026, 12:00.
// Usage: npm run verify   (from tests/e2e)   → evidence in .verify/evidence/<stamp>/
import { webkit } from "playwright";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { readXlsx } from "../../app/static/xlsx.js";
import { Registry } from "../../app/static/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATIC = join(ROOT, "app", "static");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const EVIDENCE = join(ROOT, ".verify", "evidence", STAMP);
const PORT = 8812;
const BASE = `http://localhost:${PORT}`;
const NOW = { date: "2026-10-07", time: "12:00" };
const LAND = { viewport: { width: 1180, height: 820 }, hasTouch: true, deviceScaleFactor: 1 };
const PORT_ = { viewport: { width: 820, height: 1180 }, hasTouch: true, deviceScaleFactor: 1 };
mkdirSync(EVIDENCE, { recursive: true });

const results = [];
const readback = {};
let failed = 0;
function check(flow, claim, ok, detail = "") {
  results.push({ flow, claim, ok: Boolean(ok), detail: String(detail) });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  [${flow}] ${claim}${detail ? ` — ${detail}` : ""}`);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, BASE).pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(STATIC, path === "/" ? "index.html" : path);
  if (!file.startsWith(STATIC) || !existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const browsers = [];
try {
  for (const f of ["index.html", "app.js", "store.js", "registry.js", "clases.css", "sw.js", "manifest.webmanifest", "apple-touch-icon.png", "xlsx.js", "demo-data.js"]) {
    const r = await fetch(`${BASE}/${f}`);
    check("doctor", `${f} is served`, r.ok, r.status);
  }

  const wk = await webkit.launch();
  browsers.push(wk);
  const consoleErrors = [];
  const newIpad = async (opts = LAND) => {
    const ctx = await wk.newContext({ ...opts, acceptDownloads: true });
    await ctx.addInitScript((n) => { globalThis.CLASES_NOW = n; }, NOW);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => consoleErrors.push(e.message));
    p.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    return { ctx, page: p };
  };
  const { ctx, page } = await newIpad();
  const shot = (name, full = true, p = page) => p.screenshot({ path: join(EVIDENCE, `${name}.png`), fullPage: full });
  const go = async (hash, p = page) => { await p.goto(`${BASE}/#/${hash}`); await p.waitForSelector("#main > *"); await p.waitForTimeout(120); };
  const saved = (p = page) => p.evaluate(() => globalThis.__clases.saved());
  // An independent copy of the maths over what was saved, to compare the screen against.
  const model = (state) => new Registry(structuredClone(state), { now: () => NOW });
  const student = (st, name) => st.students.find((s) => s.name === name);
  const text = async (sel, p = page) => (await p.textContent(sel)).replace(/\s+/g, " ").trim();
  const money = (n) => `$ ${new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
  const clase = (name, day) => page.locator(`[data-testid=clase][aria-label^="${name}, ${day}"]`);

  // ── F1 first run → demo ──
  await go("agenda");
  check("first-run", "empty app shows the welcome state", await page.isVisible("[data-testid=first-run]"));
  await shot("01-first-run");
  await page.tap("[data-action=load-demo]");
  await page.waitForSelector("[data-testid=clase]");
  let st = await saved();
  readback.demo = { students: st.students.length, slots: st.slots.length, payments: st.payments.length };
  check("first-run", "demo saved on the device (6 students, 8 weekly slots, months of payments)", st.students.length === 6 && st.slots.length === 8 && st.payments.length > 10, JSON.stringify(readback.demo));
  let m = model(st);
  check("agenda", "the board shows this week's 8 classes", (await page.$$("[data-testid=clase]")).length === m.week().classes_list.length && m.week().classes_list.length === 8);
  check("agenda", "rail shows what she already earned this week", (await text("[data-testid=week-earned]")) === money(m.week().earned), `${await text("[data-testid=week-earned]")} vs ${money(m.week().earned)}`);
  await page.reload();
  await page.waitForSelector("[data-testid=clase]");
  check("persistence", "after closing and reopening, everything is still there", (await page.$$("[data-testid=clase]")).length === 8);
  await shot("02-agenda");

  // ── F2 add a student with a weekly slot ──
  await go("alumnos");
  await page.tap("[data-testid=add-student-toggle]");
  await page.fill("[data-testid=new-name]", "Valentina Ríos");
  await page.fill("[data-testid=new-rate]", "1.000");
  await page.selectOption("[data-testid=new-weekday]", "2");
  await page.fill("[data-testid=new-start]", "10:00");
  await page.selectOption("[data-testid=new-minutes]", "90");
  await page.tap("[data-testid=new-save]");
  await page.waitForSelector("[data-testid=account]");
  st = await saved();
  const vale = student(st, "Valentina Ríos");
  const valeSlot = st.slots.find((s) => s.student_id === vale?.id);
  readback.newStudent = { rate: st.rates.find((r) => r.student_id === vale?.id)?.amount, slot: valeSlot && { weekday: valeSlot.weekday, start: valeSlot.start, minutes: valeSlot.minutes, from: valeSlot.from } };
  check("students", "new student saved with '1.000' as 1000 an hour and a Tuesday 10:00, 1½ h slot from today", vale && readback.newStudent.rate === 1000 && valeSlot?.weekday === 2 && valeSlot.start === "10:00" && valeSlot.minutes === 90 && valeSlot.from === NOW.date, JSON.stringify(readback.newStudent));
  await page.fill("[data-testid=slot-start]", "17:30");
  await page.selectOption("[data-testid=slot-weekday]", "4");
  await page.tap("[data-testid=slot-save]");
  await page.waitForSelector("[data-testid=slots] .notice-error");
  check("students", "an overlapping slot is refused with who it clashes with", (await text("[data-testid=slots] .notice-error")).includes("se superpone con Martina López"));
  check("students", "…and nothing was saved", (await saved()).slots.filter((s) => s.student_id === vale.id).length === 1);
  await shot("03-alumno-nuevo");

  // ── F3 cancel / charge / undo / move / extra on the agenda ──
  await go("agenda");
  await clase("Bruno Rodríguez", "miércoles 7/10").tap();
  await page.waitForSelector("[data-testid=selected-class]");
  await shot("04-clase-elegida", false);
  const before = model(await saved()).week();
  await page.tap("[data-testid=cancel-class]");
  await page.waitForSelector('[data-testid=clase].is-cancelled');
  st = await saved();
  const bruno = student(st, "Bruno Rodríguez");
  const brunoWedSlot = st.slots.find((s) => s.student_id === bruno.id && s.weekday === 3);
  const cancel = st.changes.find((c) => c.slot_id === brunoWedSlot.id && c.date === NOW.date);
  check("cancel", "cancelling saves it, not charged", cancel?.kind === "cancel" && cancel.charge === false, JSON.stringify(cancel));
  check("cancel", "the week's expected money drops by that class", model(st).week().expected === before.expected - 750, `${before.expected} → ${model(st).week().expected}`);
  await page.tap(".toast .btn");
  await page.waitForTimeout(200);
  check("cancel", "Deshacer brings the class back", !(await saved()).changes.some((c) => c.slot_id === brunoWedSlot.id && c.date === NOW.date));

  await clase("Martina López", "jueves 8/10").tap();
  await page.waitForSelector("[data-testid=selected-class]");
  await page.tap("[data-testid=cancel-charge]");
  await page.waitForTimeout(150);
  check("undo", "only the latest toast offers Deshacer (an older one would undo later changes too)", (await page.$$(".toast [data-undo]")).length === 1);
  await page.waitForTimeout(200);
  st = await saved();
  const martina = student(st, "Martina López");
  const ch = st.changes.find((c) => c.date === "2026-10-08" && st.slots.find((s) => s.id === c.slot_id)?.student_id === martina.id);
  check("cancel", "'Cancelar y cobrar igual' saves a charged cancellation that still counts", ch?.kind === "cancel" && ch.charge === true && model(st).week().total === before.total, JSON.stringify(ch));

  await clase("Lucía Fernández", "sábado 10/10").tap();
  await page.waitForSelector("[data-testid=selected-class]");
  await page.tap("[data-testid=move-open]");
  await page.fill("[data-testid=move-form] [name=date]", "9/10");
  await page.fill("[data-testid=move-form] [name=start]", "18:00");
  await page.tap("[data-testid=move-form] button[type=submit]");
  await page.waitForTimeout(250);
  st = await saved();
  const lucia = student(st, "Lucía Fernández");
  const mv = st.changes.find((c) => c.kind === "move" && st.slots.find((s) => s.id === c.slot_id)?.student_id === lucia.id);
  readback.move = mv;
  check("move", "moving saves the new day and time", mv?.date === "2026-10-10" && mv.new_date === "2026-10-09" && mv.new_start === "18:00", JSON.stringify(mv));
  check("move", "the label now sits on Friday", await clase("Lucía Fernández", "viernes 9/10").count() === 1 && await clase("Lucía Fernández", "sábado 10/10").count() === 0);
  check("move", "moving can be undone from its toast", (await page.$$(".toast [data-undo]")).length === 1);

  await page.tap("[data-testid=extra-toggle]");
  await page.selectOption("[data-testid=extra-student]", { label: "Sofía González" });
  await page.fill("[data-testid=extra-date]", "8/10");
  await page.fill("[data-testid=extra-start]", "11:00");
  await page.tap("[data-testid=extra-save]");
  await page.waitForTimeout(250);
  st = await saved();
  const sofia = student(st, "Sofía González");
  readback.extra = st.extras.filter((e) => e.student_id === sofia.id && e.date === "2026-10-08");
  check("extra", "an extra class is saved and shows on Thursday", readback.extra.length === 1 && readback.extra[0].start === "11:00" && await clase("Sofía González", "jueves 8/10").count() === 1, JSON.stringify(readback.extra));
  await shot("05-agenda-cambios");

  // ── F4 Cobrar with the stamp; then undo ──
  st = await saved();
  m = model(st);
  const top = m.owing()[0];
  const row = page.locator(`[data-testid=owing] li[data-student="${top.id}"]`);
  await row.locator("[data-pay]").tap();
  await page.waitForTimeout(250);
  check("pay", "Cobrar stamps the row PAGADO", await row.evaluate((li) => li.classList.contains("is-paid") && getComputedStyle(li.querySelector(".stamp")).opacity !== "0"));
  await shot("06-pagado", false);
  st = await saved();
  const pay = st.payments.at(-1);
  check("pay", "a payment for exactly what was owed is saved, dated today", pay.student_id === top.id && pay.amount === top.owes && pay.date === NOW.date, JSON.stringify(pay));
  check("pay", "…and that student no longer owes", model(st).balance(top.id).owes === 0);
  await page.waitForTimeout(1000);
  await page.tap(".toast .btn >> nth=-1");
  await page.waitForTimeout(250);
  check("pay", "Deshacer removes the payment again", (await saved()).payments.length === st.payments.length - 1);

  // ── F5 student page: partial payment, raise from a date ──
  await go(`alumnos/${martina.id}`);
  const owesBefore = model(await saved()).balance(martina.id).owes;
  await page.fill("[data-testid=pay-amount]", "1.600");
  await page.tap("[data-testid=pay-save]");
  await page.waitForTimeout(200);
  check("pay", "a partial payment of '1.600' lowers what she owes by 1600", model(await saved()).balance(martina.id).owes === owesBefore - 1600, `${owesBefore} → ${model(await saved()).balance(martina.id).owes}`);
  await page.fill("[data-testid=rate-new]", "950");
  await page.fill("[data-testid=rate-from]", "12/10");
  await page.tap("[data-testid=rate-save]");
  await page.waitForTimeout(200);
  st = await saved();
  m = model(st);
  check("rate", "a raise from 12/10 leaves this week at the old rate", m.rateOn(martina.id, "2026-10-08") === 800 && m.rateOn(martina.id, "2026-10-12") === 950);
  await shot("07-ficha");

  // ── F6 Ganancias ──
  await go("ganancias");
  await page.waitForSelector("[data-testid=chart] svg path");
  m = model(await saved());
  const months = m.months(5, 1);
  check("charts", "one column per month (6 back + next), drawn", (await page.$$("[data-testid=chart] .col")).length === 7 && (await page.$$("[data-testid=chart] path")).length >= 7);
  check("charts", "'Este mes' matches the maths", (await text("[data-testid=month-total]")) === money(months[5].earned), `${await text("[data-testid=month-total]")} vs ${money(months[5].earned)}`);
  await page.focus("[data-testid=chart] .col >> nth=5");
  check("charts", "focusing a month shows its tooltip with ganado + previsto", (await text("[data-testid=chart] .tip")).includes(money(months[5].earned)) && !(await page.$eval("[data-testid=chart] .tip", (t) => t.hidden)));
  await page.click("details.table-view summary");
  const firstRow = await text("details.table-view tbody tr");
  check("charts", "table view has the same numbers", firstRow.includes(money(months[0].earned)), firstRow);
  await shot("08-ganancias");
  await page.tap("[data-testid=by-week]");
  await page.waitForSelector("[data-testid=chart] .col");
  check("charts", "by week: 10 columns", (await page.$$("[data-testid=chart] .col")).length === 10);

  // ── F7 ¿Y si…? ──
  await go("proyeccion");
  await page.tap('[data-step="students:1"]');
  await page.tap('[data-step="per_week:1"]');
  await page.tap('[data-min="90"]');
  await page.$eval("[data-testid=proj-rate]", (el) => { el.value = "1000"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  m = model(await saved());
  const p3 = m.projection({ students: 3, per_week: 2, hours: 1.5, rate: 1000 });
  readback.projection = { screen: await text("[data-testid=proj-extra-month]"), expected: p3.extra.per_month };
  check("projection", "3 students × 2 classes × 1½ h at $ 1.000 → the screen shows the registry's monthly extra", readback.projection.screen === `+ ${money(p3.extra.per_month)}` && (await text("[data-testid=proj-total-month]")) === money(p3.total.per_month), JSON.stringify(readback.projection));
  check("projection", "the green 'nuevos' bar grows with it", await page.$eval(".seg-new", (el) => parseFloat(el.style.width) > 0));
  const perDay = await text("[data-testid=proj-per-day]");
  const fmt5 = (h) => { const m = Math.round((h * 60) / 5) * 5, hh = Math.floor(m / 60), mm = m % 60; return !hh ? `${mm} min` : mm === 30 ? `${hh}½ h` : mm ? `${hh} h ${mm}` : `${hh} h`; };
  readback.perDay = { screen: perDay, total: p3.total.hours_per_day, base: p3.base.hours_per_day };
  check("projection", "hours per day over a 5-day week, all students, today vs with the new ones", Math.abs(p3.total.hours_per_day - p3.total.hours_per_week / 5) < 0.01 && perDay.includes(`Serían ${fmt5(p3.total.hours_per_day)} por día`) && perDay.includes(`(hoy ${fmt5(p3.base.hours_per_day)})`), JSON.stringify(readback.perDay));
  await shot("09-proyeccion");

  // ── F8 currency switch and exchange rate ──
  await go("ajustes");
  await page.fill("[data-testid=usd-rate]", "42,5");
  await page.tap("[data-testid=settings-save]");
  await page.waitForTimeout(150);
  await page.tap('.currency-switch [data-currency="USD"]');
  await go("agenda");
  st = await saved();
  m = model(st);
  const usd = await text("[data-testid=week-earned]");
  check("currency", "USD switch: saved, and the week reads in US$ at 42,5", st.settings.currency === "USD" && st.settings.usd_rate === 42.5 && usd.startsWith("US$") && Math.abs(parseFloat(usd.replace(/[^\d,]/g, "").replace(",", ".")) - m.week().earned) < 0.01, `${usd} vs ${m.week().earned}`);
  await shot("10-usd", false);
  await page.tap('.currency-switch [data-currency="UYU"]');

  // ── F9 files: Excel downloads, backup → restore on a fresh iPad ──
  await go("ajustes");
  const [xl] = await Promise.all([page.waitForEvent("download"), page.tap('[data-download="payments"]')]);
  const xlRows = await readXlsx(readFileSync(await xl.path()));
  check("export", "Pagos downloads as a real .xlsx with every payment", xl.suggestedFilename() === `pagos-${NOW.date}.xlsx` && xlRows.length - 1 === (await saved()).payments.length, `${xl.suggestedFilename()} ${xlRows.length - 1} rows`);
  const [bk] = await Promise.all([page.waitForEvent("download"), page.tap("[data-testid=backup]")]);
  const bkPath = join(EVIDENCE, bk.suggestedFilename());
  await bk.saveAs(bkPath);
  const fresh = await newIpad();
  await go("ajustes", fresh.page);
  await fresh.page.setInputFiles("[data-testid=restore-file]", bkPath);
  await fresh.page.tap("#restore button[type=submit]");
  await fresh.page.waitForSelector("[data-testid=clase]");
  const [a, b] = [model(await saved()), model(await saved(fresh.page))];
  check("backup", "restoring the file on an empty iPad gives the same week, debts and months", JSON.stringify(a.week()) === JSON.stringify(b.week()) && JSON.stringify(a.owing()) === JSON.stringify(b.owing()) && JSON.stringify(a.months()) === JSON.stringify(b.months()));
  await fresh.ctx.close();

  // ── an older Deshacer must not undo a later change that had no undo of its own ──
  await go("alumnos");
  await page.tap("[data-testid=add-student-toggle]");
  await page.fill("[data-testid=new-name]", "Real Uno");
  await page.fill("[data-testid=new-rate]", "700");
  await page.tap("[data-testid=new-save]");
  await page.waitForSelector("[data-testid=account]");
  await page.tap("[data-testid=demo-strip] [data-action=clear-demo]"); // a change with no Deshacer of its own
  await page.waitForSelector("[data-testid=demo-strip][hidden]", { state: "attached" });
  const stale = page.locator(".toast [data-undo]");
  const hadStale = await stale.count();
  if (hadStale) await stale.first().tap();
  await page.waitForTimeout(200);
  st = await saved();
  check("undo", "an older Deshacer cannot undo a later change (demo stays cleared, Real Uno stays)", Boolean(student(st, "Real Uno")) && !st.students.some((x) => x.is_demo), `stale button present: ${hadStale}`);
  await go("ajustes");
  await page.fill("[data-testid=usd-rate]", "39,875");
  await page.tap("[data-testid=settings-save]");
  await page.waitForTimeout(150);
  check("currency", "typing the rate 39,875 saves 39.875, not 39875", (await saved()).settings.usd_rate === 39.875, (await saved()).settings.usd_rate);

  // ── F10 clear demo keeps real data ──
  st = await saved(); // the demo was cleared just above
  readback.afterClear = { students: st.students.map((s) => s.name), slots: st.slots.length, payments: st.payments.length };
  check("clear-demo", "only demo students go; Valentina (with her slot) and Real Uno stay", JSON.stringify(readback.afterClear) === JSON.stringify({ students: ["Valentina Ríos", "Real Uno"], slots: 1, payments: 0 }), JSON.stringify(readback.afterClear));

  // ── Offline ──
  await go("agenda");
  await page.reload();
  await page.waitForTimeout(800);
  const swReady = await page.evaluate(() => Promise.race([navigator.serviceWorker?.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 4000))]));
  await new Promise((r) => { server.close(r); server.closeAllConnections(); });
  let offlineOk = false;
  try { await page.reload(); await page.waitForSelector("#main > *", { timeout: 5000 }); offlineOk = (await page.$$("[data-testid=board]")).length === 1; } catch {}
  check("offline", "with the website unreachable, the app still opens", swReady && offlineOk, `sw ${swReady}, offline ${offlineOk}`);
  await new Promise((r) => server.listen(PORT, r));

  // ── Layout at iPad portrait (820) and the smallest iPad (744) ──
  const demoCtx = await newIpad(PORT_);
  await go("agenda", demoCtx.page);
  await demoCtx.page.tap("[data-action=load-demo]");
  await demoCtx.page.waitForSelector("[data-testid=clase]");
  const firstDayTop = await demoCtx.page.$eval(".day", (d) => d.getBoundingClientRect().top);
  check("layout", "portrait: the week starts on the first screen (money is one line above it)", firstDayTop < 600 && await demoCtx.page.isVisible("[data-testid=week-strip]"), `first day at ${Math.round(firstDayTop)}px`);
  await demoCtx.page.locator("[data-testid=clase]").nth(2).tap();
  await demoCtx.page.waitForSelector("[data-testid=selected-class]");
  check("layout", "portrait: a tapped class's actions open right under its day", await demoCtx.page.$eval("[data-testid=selected-class]", (p) => p.previousElementSibling?.classList.contains("day")));
  const routes = ["agenda", "alumnos", "alumnos/1", "ganancias", "ganancias?ver=semanas", "proyeccion", "ajustes"];
  for (const width of [820, 744]) {
    await demoCtx.page.setViewportSize({ width, height: 1180 });
    for (const r of routes) {
      await go(r, demoCtx.page);
      const sw = await demoCtx.page.evaluate(() => document.documentElement.scrollWidth);
      check("layout", `#/${r} fits ${width}px portrait`, sw <= width, `scrollWidth ${sw}`);
      if (width === 820) await shot(`p-${r.replace(/[/?=]/g, "-")}`, true, demoCtx.page);
    }
  }
  const valeId = student(await saved(), "Valentina Ríos").id;
  for (const r of routes.map((x) => (x === "alumnos/1" ? `alumnos/${valeId}` : x))) {
    await go(r);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check("layout", `#/${r} fits 1180px landscape`, sw <= 1180, `scrollWidth ${sw}`);
  }
  mkdirSync(join(ROOT, ".impeccable", "review"), { recursive: true });
  for (const [file, opts] of [["desktop.png", LAND], ["mobile.png", PORT_]]) {
    const p = await demoCtx.ctx.newPage();
    await p.setViewportSize(opts.viewport);
    await p.goto(`${BASE}/#/agenda`);
    await p.waitForFunction(() => document.querySelectorAll("[data-testid=clase]").length === 8 && !document.querySelector(".toast"));
    await p.waitForTimeout(300);
    await p.screenshot({ path: join(ROOT, ".impeccable", "review", file), fullPage: true });
    await p.close();
  }
  await demoCtx.ctx.close();

  check("console", "no JavaScript errors in any flow", consoleErrors.length === 0, consoleErrors.join(" | "));
} catch (err) {
  check("harness", "drive completed", false, err.stack || err.message);
} finally {
  writeFileSync(join(EVIDENCE, "results.json"), JSON.stringify({ stamp: STAMP, now: NOW, failed, results, readback }, null, 2));
  for (const b of browsers) await b.close().catch(() => {});
  server.close();
  console.log(`\n${results.length - failed}/${results.length} checks passed. Evidence: ${EVIDENCE}`);
  process.exit(failed ? 1 : 0);
}
