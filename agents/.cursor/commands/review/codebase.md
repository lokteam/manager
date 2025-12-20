# review/codebase

You are reviewing this codebase as a production async Python service.

Tasks:

1. Run the following checks:
   - formatter (ruff format / black equivalent)
   - linter (ruff)
   - type checker (mypy or pyright)
   - tests (pytest)
2. Based on the code AND checks results:
   - identify correctness issues
   - async issues (blocking, lifecycle, leaks)
   - typing / pydantic / sqlmodel issues
   - architectural violations (telegram / agent / db boundaries)
3. Highlight only real problems, not style preferences.

Output:

- Short summary
- List of issues grouped by severity: critical / medium / low
- For each issue: file, reason, suggested fix

Be concise. Do not rewrite code yet.
