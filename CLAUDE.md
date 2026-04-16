# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Full setup (install deps, copy .env files, run Prisma setup)
yarn setup

# Run all three services concurrently
yarn dev:all

# Run individually
yarn dev:server      # Node.js API server (port 3001)
yarn dev:frontend    # Vite React SPA (port 3000)
yarn dev:collector   # Document processing service (port 3002)

# Linting (all packages)
yarn lint

# Tests
yarn test

# Prisma
yarn prisma:generate   # Regenerate client after schema changes
yarn prisma:migrate    # Create and apply migrations
yarn prisma:seed       # Seed database
```

## Architecture

AnythingLLM is a monorepo with three independently-running services that work together:

- **server/** — Express.js API, handles all business logic, LLM calls, vector DB interactions, and auth
- **frontend/** — Vite + React SPA, communicates only with the server API
- **collector/** — Standalone Express service for document parsing; the server calls it internally when documents are uploaded

The server is the central hub. Frontend and collector never talk to each other directly.

### Database

- **Primary DB**: SQLite at `server/storage/anythingllm.db` (PostgreSQL supported via env)
- **ORM**: Prisma — schema at `server/prisma/schema.prisma`
- **Custom migrations**: Run automatically at startup via `server/utils/boot/index.js`. New migrations go in `server/utils/migrations/` and must be manually registered in the boot sequence.
- **Vector DB**: LanceDB by default; 10+ alternatives configurable via `VECTOR_DB` env var

### LLM / Embedding / Vector Provider Pattern

Each category has a provider-per-file pattern:
- `server/utils/AiProviders/` — LLM chat completion providers (38+)
- `server/utils/EmbeddingEngines/` — Embedding providers
- `server/utils/vectorDbProviders/` — Vector DB adapters

The active provider is selected at runtime from `process.env`. No provider is hardcoded in business logic.

### Chat Pipeline

Four chat modes handled in `server/utils/chats/`:
- `chat` — RAG (retrieval-augmented generation)
- `query` — Vector search only, no generation
- `agent` — Routes through agent pipeline (always-on agent mode is a custom feature)
- `automatic` — Switches to agent if the active LLM supports native tool calling

### Agent System

`server/utils/agents/aibitat/` — Core agent engine ("AIbitat"):
- `index.js` — Main orchestrator with tool-calling loop
- `providers/` — Per-LLM-provider adapters wrapping tool calling
- `plugins/` — Available agent tools (web browsing, file creation, SQL, memory, etc.)

`server/utils/agents/index.js` — High-level `AgentHandler` used for persistent sessions
`server/utils/agents/ephemeral.js` — `EphemeralAgentHandler` for stateless one-off runs

### MCP Integration

`server/utils/MCP/` manages Model Context Protocol servers. MCP servers are initialized at boot and can be toggled per-workspace. Configuration stored in `server/storage/plugins/anythingllm_mcp_servers.json` (gitignored, runtime-only).

## Custom Features

This fork tracks local modifications in `CUSTOM_FEATURES.md`. Key additions over upstream:

1. **Always-on agent mode** — `workspace.chatMode = "agent"` routes all messages through the agent pipeline regardless of LLM tool-calling support
2. **Per-workspace agent skill overrides** — `workspace.overrideGlobalAgentSettings` enables workspace-level enable/disable of individual agent plugins
3. **Per-workspace LLM API key** — `workspace.chatApiKey` (encrypted at rest) overrides the global LLM key for that workspace
4. **Saved prompt templates** — Reusable prompt templates stored per workspace
5. **Per-workspace MCP server toggles** — Individual MCP servers can be suppressed per workspace
6. **Custom branding** — Banner text, theme colors, custom logo assets
7. **Usage statistics dashboard** — Admin analytics via `server/endpoints/admin.js`

When pulling upstream changes, check `CUSTOM_FEATURES.md` to ensure these are preserved.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add a new LLM provider | `server/utils/AiProviders/<name>/index.js` + `server/utils/agents/aibitat/providers/<name>.js` |
| Add a new agent tool/plugin | `server/utils/agents/aibitat/plugins/<name>.js` |
| Add a new vector DB | `server/utils/vectorDbProviders/<name>/index.js` |
| Modify chat behavior | `server/utils/chats/index.js` |
| Add a new API endpoint | `server/endpoints/<name>.js` + register in `server/index.js` |
| Database schema change | Edit `server/prisma/schema.prisma` → `yarn prisma:migrate` → update `server/models/` CRUD file |
| Add workspace setting | Schema migration + `server/models/workspace.js` + frontend settings panel |
| Frontend API calls | `frontend/src/models/` — one file per resource type |

## Environment

Server reads from `server/.env`. Run `yarn setup` once to copy `.env.example` → `.env`. Minimum required vars:
- `JWT_SECRET`, `SIG_KEY`, `SIG_SALT` — random 32-char strings
- `LLM_PROVIDER` — which LLM backend to use
- `VECTOR_DB` — which vector store (default: `lancedb`)
- `EMBEDDING_ENGINE` — embedding provider (default: `native`)

The collector and frontend also have their own `.env` files generated by `yarn setup`.

## Module Systems

- **server/** and **collector/**: CommonJS (`require`/`module.exports`)
- **frontend/**: ES modules (`import`/`export`)
