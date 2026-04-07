# Custom Features & Changes

This document tracks all custom features and modifications made to AnythingLLM. Use this during merge conflicts to identify which changes are custom and need to be preserved.

---

## Core Features

### 1. **Agent Mode (Always-On)**
Allows workspaces to always route messages through the agent pipeline regardless of provider support.

**Chat Mode:** `"agent"` (in addition to upstream's `"automatic"`, `"chat"`, `"query"`)
- **Always active:** Messages are routed through agent pipeline without `@agent` prefix requirement
- **Different from upstream `"automatic"`:** which only activates if provider supports native tool calling

**Files to Check:**
- `server/utils/chats/stream.js` — `VALID_CHAT_MODE` constant must include `"agent"`
- `server/models/workspace.js` — `VALID_CHAT_MODES` constant and validation
- `server/utils/agents/ephemeral.js` — `isAgentInvocation()` async function with `chatMode === "agent"` check
- `server/utils/chats/agents.js` — `shouldInvokeAgent` condition
- `server/utils/chats/apiChatHandler.js` — `resolveApiChatMode()` function
- `frontend/src/locales/en/common.js` — agent mode translation with `description` key

---

### 2. **Per-Workspace Agent Skills Configuration**
Workspaces can override global agent settings and select which skills are available.

**Features:**
- Toggle override: `workspace.overrideGlobalAgentSettings` (boolean)
- Enabled skills: stored per workspace in config
- Disabled skills: stored per workspace in config
- Custom imported plugins: shown in skill list with `@@hubId` naming

**Files:**
- `server/utils/agents/workspaceAgentConfig.js` — Core class for managing workspace agent config
- `server/endpoints/workspaceAgentConfig.js` — REST endpoints (GET config, toggle override, toggle MCP server, toggle skill, available servers, available skills)
- `frontend/src/pages/WorkspaceSettings/AgentConfig/` — UI for managing workspace agent config
- Database migration: `server/utils/migrations/migrateWorkspaceAgentConfig.js`
- Workspace model: `server/models/workspace.js` — `overrideGlobalAgentSettings` field

**API Endpoints:**
```
GET  /workspace/:slug/agent-config
POST /workspace/:slug/agent-config/toggle-override
POST /workspace/:slug/agent-config/toggle-mcp-server
POST /workspace/:slug/agent-config/toggle-skill
GET  /workspace/:slug/agent-config/available-mcp-servers
GET  /workspace/:slug/agent-config/available-skills
```

---

### 3. **Per-Workspace API Key Override**
Workspaces can specify a custom LLM API key instead of using the global environment variable.

**Field:** `workspace.chatApiKey` (encrypted in database)

**Files to Check:**
- `server/models/workspace.js` — `chatApiKey` field definition and encryption/decryption
- `server/utils/AiProviders/anthropic/index.js` — uses `apiKey` parameter from workspace
- `server/utils/agents/aibitat/providers/anthropic.js` — uses workspace API key
- `server/utils/agents/aibitat/providers/cohere.js` — uses workspace API key
- `server/utils/agents/aibitat/providers/openai.js` — uses workspace API key
- `server/utils/agents/aibitat/providers/azure.js` — uses workspace API key
- `frontend/src/pages/WorkspaceSettings/ChatSettings/` — UI to set workspace API key

---

### 4. **Save Prompts Feature**
Users can save prompts and LLM responses as templates for reuse.

**Files:**
- `server/models/savedPrompts.js` — Database model and CRUD operations
- `server/endpoints/savedPrompts.js` — REST endpoints
- `frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/SavedPromptsPanel/` — UI components
- Database migration: `server/utils/migrations/migrateWorkspaceSavedPrompts.js`
- `frontend/src/locales/en/common.js` — Translation keys for saved prompts

**API Endpoints:**
```
GET    /saved-prompts
POST   /saved-prompts
PUT    /saved-prompts/:id
DELETE /saved-prompts/:id
```

---

### 5. **Custom Branding**
System-wide customization of appearance: banner, theme colors, custom logo.

**Files:**
- `server/models/systemSettings.js` — Banner settings storage
- `server/endpoints/systemSettings.js` — Banner settings endpoints
- `frontend/src/hooks/useTheme.js` — Theme color hook
- `frontend/src/components/CustomBanner/` — Banner component
- `frontend/src/pages/Admin/Appearance/` — Admin UI for branding settings
- `frontend/src/locales/en/common.js` — Translation keys for branding
- `server/utils/agents/aibitat/plugins/create-files/lib.js` — Create-files plugin now uses custom branding logos

**System Settings Keys:**
- `banner_enabled`
- `banner_content`
- `banner_timer`
- `theme_color`
- `custom_logo_url`

**Custom Branding Logos for Create-Files Plugin:**
- Place custom light logo (for dark backgrounds) at: `storage/assets/custom-logo-light.png`
- Place custom dark logo (for light backgrounds) at: `storage/assets/custom-logo-dark.png`
- If custom logos are not found, the plugin will not include a logo in generated documents
- These logos are used in generated PDF, DOCX, and PPTX files created by the agent

---

### 6. **Anthropic Max Tokens per Model**
Hard-coded maximum tokens for different Claude models (supports newer models with higher limits).

**File:** `server/utils/agents/aibitat/providers/anthropic.js`

**Mapping:**
- Claude models get per-model max token limits
- Default: 8192 for newer models (claude-sonnet-4-6, claude-opus-4-6)
- Older models: 4096 or specified in map

---

### 7. **MCP Server Configuration Per-Workspace**
MCP servers can be enabled/disabled per workspace, and specific tools can be suppressed.

**Files:**
- `server/endpoints/mcpServers.js` — Config GET/POST endpoints and toggle-tool endpoint
- `server/utils/MCP/index.js` — MCP compatibility layer with workspace awareness
- `frontend/src/models/mcpServers.js` — API client methods
- `frontend/src/pages/Admin/Agents/MCPServers/` — Admin UI for MCP server configuration

**API Endpoints:**
```
GET    /mcp-servers/config
POST   /mcp-servers/config
POST   /mcp-servers/toggle-tool
```

---

### 8. **Analytics Integration**
Google Analytics tracking for application usage.

**Files:**
- `frontend/src/main.jsx` — Analytics initialization
- `frontend/src/utils/analytics.js` — Tracking utility functions
- Environment variable: `VITE_GOOGLE_ANALYTICS_KEY`

---

### 9. **Usage Screen**
Admin dashboard showing system usage statistics and metrics.

**Files:**
- `frontend/src/pages/Admin/Usage/` — Usage statistics and charts
- `server/endpoints/admin/usage.js` — Usage data endpoints

---

## Important Merge Conflict Patterns

When merging upstream releases, watch for these patterns:

### Chat Mode System
Look for `VALID_CHAT_MODE`, `VALID_CHAT_MODES` constants. Must include all four modes:
```javascript
["automatic", "chat", "query", "agent"]
```

### Agent Invocation
`isAgentInvocation()` must be:
1. `async` (upstream requirement)
2. Check `chatMode === "agent"` alongside `chatMode === "automatic"`
3. Check for `@agent` prefix in message

### Workspace Configuration Endpoints
Any changes to:
- `/workspace/:slug` endpoints
- `Workspace.get()` / `Workspace.update()` calls
- Workspace model fields

Must preserve `chatApiKey` and `overrideGlobalAgentSettings` fields.

### Provider Files (Anthropic, Cohere, OpenAI, Azure)
Watch for:
- API key initialization — must use workspace-provided key if available
- Max tokens configuration — must use our per-model map
- Attachment formatting — must preserve our custom handling (now using upstream's shared layer)

### Default Skills Loading
The system prompt generation must:
1. Accept workspace as parameter
2. Check `workspace.overrideGlobalAgentSettings`
3. Load skills from `WorkspaceAgentConfig` if override is enabled
4. Otherwise use global settings

---

## Files Never Modified (Upstream Only)

These files are purely upstream and should not have custom logic:
- `server/endpoints/telegramBot.js`
- `server/endpoints/documents.js`
- `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/ThoughtContainer.js`
- Telegram bot service files

---

## Database Migrations

Custom migrations that must run on every instance:
1. `migrateWorkspaceAgentConfig.js` — Create workspace agent config table
2. `migrateWorkspaceSavedPrompts.js` — Create saved prompts table
3. `migrateWorkspaceChatApiKey.js` — Add chatApiKey field to workspace

These run automatically via `server/utils/boot/index.js` during startup.

---

## Testing Checklist for Merges

After merging upstream:
- [ ] Agent mode (`chatMode = "agent"`) routes all messages through agent
- [ ] Automatic mode (`chatMode = "automatic"`) uses native tool calling if available
- [ ] Workspace agent skills can be toggled in UI
- [ ] Workspace-specific API keys are used instead of global
- [ ] Saved prompts can be created, edited, deleted, and loaded
- [ ] Custom branding (banner, colors) appears correctly
- [ ] MCP servers can be toggled per workspace
- [ ] New agent skills (filesystem-agent, create-files-agent) appear in workspace config
- [ ] Anthropic models use correct max token limits
- [ ] Analytics tracking works (if enabled)
- [ ] Build completes without errors: `npm run build`

---

## Notes

- Always check git history with `git log --oneline` on modified files to understand merge points
- Use `git show <commit>:<filepath>` to see file state at specific commits
- When conflicts arise, prioritize preserving the "keep both" strategy for "agent" vs "automatic" modes
- Run migrations explicitly if adding new custom database tables
