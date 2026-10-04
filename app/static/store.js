// Loads and saves the registry on this device (IndexedDB), and makes the downloadable files.
import { Registry, emptyState, localNow } from "./registry.js";
import { writeXlsx } from "./xlsx.js";

const DB_NAME = "mis-clases";
const STORE = "kv";
const KEY = "state";

const openDb = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const readState = (db) => new Promise((resolve, reject) => {
  const req = db.transaction(STORE).objectStore(STORE).get(KEY);
  req.onsuccess = () => resolve(req.result || null);
  req.onerror = () => reject(req.error);
});
const writeState = (db, state) => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(state, KEY);
  tx.oncomplete = () => resolve();
  tx.onerror = tx.onabort = () => reject(tx.error);
});

let db = null;
let latest = null;   // newest state not yet written
let writing = null;  // the running write loop, if any
export let reg = null;

// Tests pin the clock with window.CLASES_NOW = {date, time}; she always gets the iPad's own.
const now = () => globalThis.CLASES_NOW || localNow();

export async function start({ saveError = () => {} } = {}) {
  db = await openDb();
  const saved = await readState(db);
  // Saves are coalesced: while one write runs, later changes only mark the newest state,
  // which is written next. Hundreds of quick changes cost a couple of writes, not hundreds.
  const flush = async () => {
    while (latest) {
      const snapshot = structuredClone(latest);
      latest = null;
      try { await writeState(db, snapshot); } catch (err) { saveError(err); }
    }
    writing = null;
  };
  reg = new Registry(saved || emptyState(), {
    now,
    save: (state) => {
      state.rev = (state.rev || 0) + 1;
      latest = state;
      writing ??= flush();
    },
  });
  navigator.storage?.persist?.().catch(() => {});
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    const stored = await readState(db).catch(() => null);
    if (stored && (stored.rev || 0) > (reg.state.rev || 0)) reg.state = stored;
  });
  globalThis.__clases = { state: () => reg.state, saved: () => flushed().then(() => readState(db)) };
  return reg;
}

/** Resolves once every change so far is written to the device. */
export const flushed = async () => { while (writing) await writing; };

export function download(kind) {
  const day = reg.today();
  let data, name, type;
  if (kind === "backup") {
    data = reg.backup();
    name = `mis-clases-copia-${day}.json`;
    type = "application/json";
  } else {
    const names = { classes: "clases", payments: "pagos", students: "alumnos" };
    data = writeXlsx(reg.exportTable(kind));
    name = `${names[kind]}-${day}.xlsx`;
    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return name;
}
