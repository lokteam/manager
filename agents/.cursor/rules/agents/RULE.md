---
globs: **/*.py
alwaysApply: false
---

# PydanticAI agent framework rules

This project uses **PydanticAI**, a Python agent framework designed to support structured, type-safe interactions with large language models (LLMs) and reliable agent workflows.

---

## Agent design and boundaries

1. **Agents must be defined as classes or functions using PydanticAI constructs**:

   - Use typed schemas for inputs and outputs.
   - Do not mix raw strings or dicts as I/O — always use Pydantic models for structured data.

2. **Agent logic must be pure**:

   - Side effects (DB updates, sending messages, logging) must not happen inside the agent’s core decision logic.
   - The agent should return a structured decision object; side effects are applied in service layers.

3. **All LLM interactions must go through the PydanticAI API**:
   - Do not call raw LLM APIs outside the PydanticAI abstraction.
   - This ensures consistent validation of outputs and reduces schema handling code.

---

## Prompting and schema validation

4. **Schema enforcement:**

   - Define explicit output schemas for each agent interaction.
   - Validate responses against these schemas and handle validation errors gracefully.

5. **Structured decisions:**
   - Agent outputs must map to one of the defined decision types (Reply / Ignore / Action).
   - Avoid unstructured interpretation — use typed enums or objects.

---

## Observability and error handling

6. **Logging & observability:**

   - Log both the request inputs and the validated structured outputs.
   - On validation failure, record the raw output for debugging and schema improvement.

7. **Error resilience:**
   - Timeouts, malformed responses and unexpected tokens must be caught and turned into safe fallback decisions (e.g., retry, default reply).

---

## Prohibitions

- Do **not** use raw JSON or string parsing for agent responses.
- Do **not** implement Telegram or DB side effects inside agent modules.
- Do **not** bypass schema validation for performance reasons.

---

## Summary

PydanticAI is powerful and type-safe, but its guarantees are only as good as the schemas and usage patterns you enforce. By keeping agent logic pure, structured, and validated, you ensure that the bot behaves predictably and robustly in production.
