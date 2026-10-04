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

## Open items

- **Not yet tried on her real iPad.** Check: Add to Home Screen, the agenda in portrait and landscape, Cobrar, the backup file landing in Files.
- **Verifier nits left as they are:**
  - a slot ended after today's class cannot be taken by someone else until tomorrow;
  - changing a slot today to a time that has already passed counts as a class given;
  - extra and moved classes are not checked for overlaps;
  - a moved class keeps its original date's Tarifa (by design, see GLOSSARY.md).
- **Design ceiling, not done:** a deeper rework of Ganancias and ¿Y si…? in the forro/etiqueta language; debtor labels show both a colour dot and a colour frame.
