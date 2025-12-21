# PydanticAI agent framework rules

This project uses **PydanticAI**, a Python agent framework designed to support structured, type-safe interactions with large language models (LLMs) and reliable agent workflows.

---

## Agent design

1. **Agents must be defined as classes or functions using PydanticAI constructs**:

   - Use typed schemas for inputs and outputs.
   - Do not mix raw strings or dicts as I/O — always use Pydantic models for structured data.

2. **All LLM interactions must go through the PydanticAI API**:

   - Do not call raw LLM APIs outside the PydanticAI abstraction.
   - This ensures consistent validation of outputs and reduces schema handling code.
   - Use dependencies and custom tools as guided in official documentation, that you can fetch through connected context7 MCP server.

3. **Schema enforcement:**

   - Define explicit output schemas for each agent interaction.
   - Validate responses against these schemas and handle validation errors gracefully.

4. **Logging & observability:**
   - Use Langfuse server as a observation tool (not ready yet)

---

## Prohibitions

- Do **not** use raw JSON or string parsing for agent responses.
- Do **not** implement Telegram or DB side effects inside agent modules.
- Do **not** bypass schema validation for performance reasons.

---

## Summary

PydanticAI is powerful and type-safe, but its guarantees are only as good as the schemas and usage patterns you enforce. By keeping agent logic pure, structured, and validated, you ensure that the bot behaves predictably and robustly in production.
