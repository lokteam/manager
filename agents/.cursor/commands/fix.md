# fix

Apply fixes for the issues identified in the previous review.

Rules:

- Fix only reported problems.
- Preserve existing architecture and file structure.
- Prefer minimal, local changes.
- Do not refactor unless required to fix a bug.
- Keep async semantics correct.

If an issue cannot be fixed safely, explain why instead of guessing.
