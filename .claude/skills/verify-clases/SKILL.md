---
name: verify-clases
description: Prove a change to Mis clases works by driving the real app in WebKit at iPad sizes and reading every write back from IndexedDB. Use before calling any UI or registry change done.
---

# verify-clases

1. **Launch + Doctor + Drive + Evidence + Cleanup** in one command:
   ```bash
   cd tests/e2e && npm install && npx playwright install webkit && npm run verify
   ```
   It serves `app/static/` on port 8812 and pins the clock with `window.CLASES_NOW` (Wed 7/10/2026 12:00). It drives every flow in `features/` in WebKit at iPad landscape (1180) with touch, then every screen at portrait 820 and 744. Each write is read back from IndexedDB and compared with an independent `Registry` over the saved state. It also covers reload persistence, backup → restore on an empty iPad, the Excel download, and opening with the host unreachable.
2. Every output line is PASS or FAIL with what it saw, and the exit code is non-zero on any failure. Evidence goes to `.verify/evidence/<stamp>/` (screenshots + `results.json`). Open the screenshots for anything visual: a passing check is not a design review.
3. For a logic change, also run `npm test` from the repo root, and plant a bug to watch the new test go red before trusting it.
4. To add a flow, add a `features/<flow>.md` (path + end state) and a block in `tests/e2e/drive.mjs` that drives the real UI and reads back with `saved()`.

Node: on this Mac `nvm use` does not stick; prefix `PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH`.
