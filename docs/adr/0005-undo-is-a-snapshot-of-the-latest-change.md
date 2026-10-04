# Deshacer restores the state from before the latest change, and only while nothing else has changed

Every change makes a new immutable state, so undo just puts the previous one back. That is simple and exact, but it is only safe for the latest change: undoing an older one would also undo everything after it. So a Deshacer works only while the state is still the one its action produced. The verifier found an older button able to undo "Borrar datos de ejemplo"; the e2e check for this fails on the old code.
