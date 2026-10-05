# Verification

Same rules as Biblioteca (poteto's [pstack](https://github.com/cursor/plugins/tree/main/pstack)): prove it on the real thing, label claims **measured / inferred / guess**, and remember that inconclusive is not a pass.

| Change | Check |
|---|---|
| Money, agenda or projection logic (`registry.js`) | `npm test`. The clock is pinned (Wed 7/10/2026 12:00). Plant a bug and watch a test go red before trusting a new test. |
| UI or a flow | `npm run verify` in `tests/e2e`. It drives WebKit at iPad landscape 1180 and portrait 820/744 with touch, reads every write back from IndexedDB, and compares the screen against an independent `Registry` over the saved state. It also covers reload persistence, backup → restore on an empty iPad, and offline start. |

Done means unit tests green, drive green, and an independent agent's PASS / PASS+NOTES.

Always pause for a human before: publishing or changing the address, anything that could wipe data on her iPad (the storage key, the backup format), and deleting non-demo data. Money figures are hers: never put real ones in files, commits or fixtures.

## Verification log

There are no PRs (solo project committed to `main`), so verdicts are recorded here. Evidence folders are local (`.verify/evidence/`, gitignored).

| Date | Change | Checks | Independent verdict |
|---|---|---|---|
| 2026-10-04 | First version | unit 23 (10 planted bugs caught), e2e 65/65 | Verifier **FAIL**: a class already given today was lost when a slot was ended, changed or archived from today, plus 4 should-fixes. All were reproduced as failing tests, then fixed. Re-verify **PASS+NOTES**: a rate typed "39,875" was read ×1000, and a stale Deshacer survived; both fixed and tested. Impeccable finish review: fix (8 items) → **ship**. |
| 2026-10-04 | Hours per day in ¿Y si…? | unit 30, e2e 72/72 | Small change; no fresh independent run. Live-checked on an emulated iPad. |
| 2026-10-04 | "Cómo se usa" help screen (`#/ayuda`, "?" in the band after UYU/USD), next-step hints in two empty lists | unit 30, e2e 80/80 (new checks mutated red, then reverted) | Verifier **PASS+NOTES**: four help steps were not fully true (portrait has no "Esta semana" panel; backup nudge also shows when no copy exists; a moved extra class has no "Volver a su día"; ¿Y si…? rate is for new students) → reworded. The two empty-list hints have no e2e check yet. |

| 2026-10-04 | v2: 50 min, month-name dates, school details, Planificación, Faltó / La suspendo yo, single-Clase clashes, flexible students, monthly Cuota (#2–#10) | unit 49, e2e 131/131 (each ticket's new checks mutated red, then reverted) | Verifier **PASS+NOTES**. Cuota held through about 1,500 randomized states, and a backup made by `main` restored with only the intended Te deben change. Should-fixes reproduced as failing tests, then fixed: a plan was lost when a slot changed; Faltó on a moved Clase sent it back to its original week (past money moved); "Volver", the restore of a cancelled extra, and a new weekly day could double-book. Also fixed: reactivating an archived student brought back extras booked after archiving as given (also on `main`); `owing()` took about 0.6 s with two years of 25 students (cached per state, now about 40 ms); a student whose day had just ended counted as flexible; the week title ignored Fechas. |

## Open items

- **Not yet tried on her real iPad.** Check: Add to Home Screen, the agenda in portrait and landscape, Cobrar, the backup file landing in Files.
- **Verifier nits left as they are:**
  - Agendar clase suggests the first day without a Clase of *that student*, even if she is fully booked that day or it is late in the evening;
  - Ganancias week columns use the short "5 oct" even with "7 de octubre", for space;
  - a slot ended after today's class cannot be taken by someone else until tomorrow;
  - changing a slot today to a time that has already passed counts as a class given;
  - a moved class keeps its original date's Tarifa (by design, see GLOSSARY.md).
- **Design ceiling, not done:** a deeper rework of Ganancias and ¿Y si…? in the forro/etiqueta language; debtor labels show both a colour dot and a colour frame.
