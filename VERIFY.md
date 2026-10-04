# Verification

Same rules as Biblioteca (poteto's [pstack](https://github.com/cursor/plugins/tree/main/pstack)): prove it on the real thing, label claims **measured / inferred / guess**, and remember that inconclusive is not a pass.

| Change | Check |
|---|---|
| Money, agenda or projection logic (`registry.js`) | `npm test`. The clock is pinned (Wed 7/10/2026 12:00). Plant a bug and watch a test go red before trusting a new test. |
| UI or a flow | `npm run verify` in `tests/e2e`. It drives WebKit at iPad landscape 1180 and portrait 820/744 with touch, reads every write back from IndexedDB, and compares the screen against an independent `Registry` over the saved state. It also covers reload persistence, backup → restore on an empty iPad, and offline start. |

Done means unit tests green, drive green, and an independent agent's PASS / PASS+NOTES.

Always pause for a human before: publishing or changing the address, anything that could wipe data on her iPad (the storage key, the backup format), and deleting non-demo data. Money figures are hers: never put real ones in files, commits or fixtures.
