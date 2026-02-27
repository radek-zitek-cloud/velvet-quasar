# Project Memory

## MCP Servers Available

### heroui-react
- **What**: HeroUI v3 (Beta) component documentation, source code, styles, and theme tokens
- **Key tools**: `list_components`, `get_component_docs`, `get_component_source_code`, `get_component_source_styles`, `get_theme_variables`, `get_docs`
- **Workflow**: `list_components` → `get_component_docs` → optionally `get_component_source_code`/`get_component_source_styles`
- **Caveats**: v3 Beta ONLY — not v2. No migration tooling yet. Requires Tailwind CSS v4. Uses compound component pattern (e.g. `Card.Header`). Built on React Aria Components.
- **When to use**: Building or modifying any UI component — check here first for correct API, props, and examples.

### context7
- **What**: Fetches up-to-date documentation and code examples for any library/framework
- **Key tools**: `resolve-library-id` (name → ID), `query-docs` (ID + query → docs)
- **Workflow**: Always call `resolve-library-id` first to get the Context7 library ID, then `query-docs`
- **Caveats**: Max 3 calls per question. Library ID format: `/org/project`.
- **When to use**: Need current docs for Next.js, FastAPI, React, Tailwind, or any other dependency. Especially useful when unsure about API changes between versions.

### serena
- **What**: Semantic code analysis and editing — works at the symbol level (classes, functions, methods)
- **Key tools**: `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `rename_symbol`, `search_for_pattern`, `list_dir`, `find_file`
- **Workflow**: `get_symbols_overview` → `find_symbol` (with depth/include_body) → edit with `replace_symbol_body` or `insert_*`
- **Also has**: Its own memory system (`read_memory`, `write_memory`, `list_memories`) — separate from project tasks/memory.md
- **When to use**: Navigating unfamiliar code, tracing references across the codebase, performing precise symbol-level refactors. Prefer over reading entire files when you only need specific symbols.

### exa
- **What**: Web search and code-focused search (GitHub, Stack Overflow, official docs)
- **Key tools**: `web_search_exa` (general web), `get_code_context_exa` (programming-focused)
- **When to use**: Finding current info, debugging obscure errors, looking up patterns not covered by context7 docs.

## Architecture Notes

- **Frontend**: Next.js 16 + React 19 + HeroUI v3 Beta + Tailwind CSS v4 (port 3000)
- **Backend**: FastAPI + Python (port 8000)
- **CORS**: Backend allows GET from `http://localhost:3000`
- **StatusBar**: Polls `GET /health` every 30s via `useHealthCheck` hook; reads FE version from package.json
