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

### 7. **Fix: Anthropic Agent Tool Call Limit 400 Error**
When an agent hits its `maxToolCalls` limit, both `provider.stream()` and `provider.complete()` had already pushed a `tool_use` block to the messages array. The final no-tools API call sent that dangling `tool_use` without a matching `tool_result`, causing Anthropic to return a 400 error.

**Fix (two layers):**
1. `index.js` — when `depth >= maxToolCalls`, strip the trailing `tool_use` from `messages` before the final provider call (primary, explicit fix)
2. `anthropic.js` `#prepareMessages()` — strip any trailing unmatched `tool_use` from the last assistant message before every API call (defensive fallback)

**Files to Check:**
- `server/utils/agents/aibitat/index.js` — `handleAsyncExecution` and `handleExecution` limit-hit blocks
- `server/utils/agents/aibitat/providers/anthropic.js` — `#prepareMessages()` trailing guard

---

### 8. **MCP Server Configuration Per-Workspace**
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

### 9. **Analytics Integration**
Google Analytics tracking for application usage.

**Files:**
- `frontend/src/main.jsx` — Analytics initialization
- `frontend/src/utils/analytics.js` — Tracking utility functions
- Environment variable: `VITE_GOOGLE_ANALYTICS_KEY`

---

### 10. **Usage Screen**
Admin dashboard showing system usage statistics and metrics.

**Files:**
- `frontend/src/pages/Admin/Usage/` — Usage statistics and charts
- `server/endpoints/admin/usage.js` — Usage data endpoints

---

### 11. **Extended User Profile Fields**
Adds `fullName`, `email`, `language` (BCP 47), and `timezone` (IANA) fields to the User model.

**Design:**
- `fullName` and `email` are admin-only to write; users see them as read-only in their profile
- `language` and `timezone` are editable by the user in their Account modal and by admins
- Language is synced into i18n on save so the UI language updates immediately
- All four fields are exposed as system prompt variables

**Files to Check:**
- `server/prisma/schema.prisma` — `users` model must include all four new fields
- `server/models/user.js` — `writable` array, `castColumnValue`, `validations`, and `create()`
- `server/models/systemPromptVariables.js` — `{user.fullName}`, `{user.email}`, `{user.language}`, `{user.timezone}` DEFAULT_VARIABLES entries
- `server/endpoints/system.js` — `POST /system/user` must accept `language` and `timezone` (but NOT `fullName`/`email`)
- `server/endpoints/api/admin/index.js` — swagger examples for user endpoints
- `server/endpoints/api/userManagement/index.js` — `GET /v1/users` must use `User.filterFields()` (not a manual field projection)
- `frontend/src/components/TimezoneSelector/index.jsx` — reusable IANA timezone `<select>` component
- `frontend/src/pages/Admin/Users/` — table columns, NewUserModal, EditUserModal
- `frontend/src/components/UserMenu/AccountModal/index.jsx` — username disabled, read-only fullName/email, language/timezone dropdowns

**System Prompt Variables:**
- `{user.fullName}` — user's full name
- `{user.email}` — user's email address
- `{user.language}` — user's preferred language (BCP 47)
- `{user.timezone}` — user's timezone (IANA identifier)

**API Endpoints affected:**
- `GET /v1/admin/users` — returns new fields
- `POST /v1/admin/users/new` — accepts new fields
- `POST /v1/admin/users/:id` — accepts new fields
- `GET /v1/users` — returns new fields (via `User.filterFields()`)
- `POST /system/user` — accepts `language` and `timezone`

---

### 12. **API Key Descriptions**
Optional description field on Developer API keys so each key can be labeled by its purpose.

**Features:**
- Description is set at creation time in the "Create new API key" modal (optional text input)
- Description is shown as a column in the API keys table
- Description can be edited inline after creation (click pencil icon on hover)

**Files to Check:**
- `server/prisma/schema.prisma` — `api_keys` model must include `description String?`
- `server/models/apiKeys.js` — `create()` accepts `description` param; new `update()` method
- `server/endpoints/admin.js` — `POST /admin/generate-api-key` accepts `description`; new `PATCH /admin/api-key/:id`
- `server/endpoints/system.js` — `POST /system/generate-api-key` accepts `description`; new `PATCH /system/api-key/:id`
- `frontend/src/models/admin.js` — `generateApiKey(description)`, new `updateApiKey(id, description)`
- `frontend/src/models/system.js` — same as admin model
- `frontend/src/pages/GeneralSettings/ApiKeys/NewApiKeyModal/index.jsx` — description input field
- `frontend/src/pages/GeneralSettings/ApiKeys/ApiKeyRow/index.jsx` — description column with inline edit
- `frontend/src/pages/GeneralSettings/ApiKeys/index.jsx` — Description table header, colSpan 5
- Database migration: `server/utils/migrations/addApiKeyDescription.js`

**API Endpoints added:**
```
PATCH /admin/api-key/:id       — update description (multi-user/admin)
PATCH /system/api-key/:id      — update description (single-user)
```

---

### 13. **Thumbs-Down Feedback Comments + Feedback Analytics Dashboard**
Extends the existing thumbs-up feedback system with a thumbs-down button that prompts for a required text explanation, and adds a new admin analytics page to review all feedback.

**Features:**
- Thumbs-down button alongside thumbs-up on every AI chat response
- Clicking thumbs-down opens a required-comment modal: "Help us improve D-Mind"
- Comment is stored in `workspace_chats.feedbackComment`
- Thumbs-up preserves existing behavior (no comment required)
- Admin/manager "User Feedback" page at `/settings/feedback` with:
  - Date range, workspace, user, and rating (up/down/all) filters
  - Bar chart showing daily thumbs-up vs thumbs-down counts (Recharts)
  - Summary cards (total, thumbs up, thumbs down, satisfaction rate)
  - Paginated table with color-coded rating icons, user, workspace, date, truncated comment
  - Click row → detail dialog showing rating, user, workspace, date, comment, original prompt, and AI response

**Files to Check:**
- `server/prisma/schema.prisma` — `workspace_chats` model must include `feedbackComment String?`
- `server/models/workspaceChats.js` — `updateFeedbackScore(chatId, feedbackScore, feedbackComment)` accepts 3 args
- `server/endpoints/workspaces.js` — `POST /workspace/:slug/chat-feedback/:chatId` passes `feedbackComment`
- `server/utils/workspaceFeedbackAnalytics.js` — **new** query helper (buildFeedbackWhere, aggregateFeedbackSeries, fetchFeedbackRows)
- `server/endpoints/system.js` — `POST /system/feedback-analytics` and `POST /system/feedback-analytics/rows`
- `server/utils/migrations/addFeedbackComment.js` — boot-time `ALTER TABLE` migration
- `server/utils/boot/index.js` — `addFeedbackComment()` registered in both `bootHTTP` and `bootSSL`
- `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/HistoricalMessage/Actions/index.jsx` — ThumbsDown button + FeedbackCommentModal
- `frontend/src/models/workspace.js` — `updateChatFeedback(chatId, slug, feedback, feedbackComment)`
- `frontend/src/models/system.js` — `feedbackAnalytics()` and `feedbackAnalyticsRows()`
- `frontend/src/pages/GeneralSettings/FeedbackAnalytics/index.jsx` — **new** analytics page
- `frontend/src/main.jsx` — `/settings/feedback` ManagerRoute registered
- `frontend/src/components/SettingsSidebar/index.jsx` — "User Feedback" nav item
- `frontend/src/utils/paths.js` — `paths.settings.feedback()`

**API Endpoints added:**
```
POST /system/feedback-analytics        — chart series + totals (admin/manager)
POST /system/feedback-analytics/rows   — paginated feedback rows (admin/manager)
```

**Database migration:** `server/utils/migrations/addFeedbackComment.js`
Also includes Prisma migration file: `server/prisma/migrations/20260422000000_add_feedback_comment/`

---

### 9. **Sirius User Sync**
Allows admins to trigger a sync of user data from the Sirius external API, either manually via a button or on a cron schedule.

**Features:**
- "Sync User Data" button on the Admin › Users page — fires a one-off POST to the Sirius API
- Gear icon on the same page opens a settings dialog with:
  - Toggle to enable periodic sync
  - Cron expression input with live human-readable description (via `cronstrue`)
- Every sync (manual or scheduled) logs to EventLogs (`sirius_user_sync_success` / `sirius_user_sync_failed`) and server console
- Cron job managed dynamically via Bree — no server restart required when settings change

**Environment variable:**
- `SIRIUS_API_KEY` — API key sent as `x-api-token` header to the Sirius endpoint

**Files to Check:**
- `server/utils/sirius/syncUsers.js` — shared sync function (URL, headers, logging)
- `server/jobs/sync-sirius-users.js` — Bree job wrapping the sync function
- `server/utils/BackgroundWorkers/index.js` — `siriusSyncEnabled`, `siriusSyncCron`, `updateSiriusSync()`
- `server/models/systemSettings.js` — `sirius_sync_enabled` and `sirius_sync_cron` in `supportedFields`
- `server/endpoints/admin.js` — `POST /admin/sirius/sync-users`, `GET/POST /admin/sirius/settings`
- `frontend/src/models/admin.js` — `siriusSyncUsers()`, `getSiriusSettings()`, `updateSiriusSettings()`
- `frontend/src/pages/Admin/Users/index.jsx` — Sync button, gear icon, modal wiring
- `frontend/src/pages/Admin/Users/SyncSettingsModal/index.jsx` — Settings modal

**API Endpoints added:**
```
POST /admin/sirius/sync-users    — Trigger immediate sync (admin only)
GET  /admin/sirius/settings      — Get enabled + cron settings (admin only)
POST /admin/sirius/settings      — Save enabled + cron, updates live Bree schedule (admin only)
```

---

### 14. **Always-On RAG in Agent Mode**
When enabled, agent mode automatically performs a vector similarity search on the workspace's embedded documents on every message — identical to how Chat mode works — and injects results into the agent's context before tool execution. This allows the agent to benefit from workspace knowledge without needing to call the `rag-memory` tool explicitly.

**Field:** `workspace.agentAlwaysOnRag` (boolean, default `false`)

**Behavior:**
- Toggle is only shown in workspace Chat Settings when **Agent** mode is selected
- When enabled, vector search fires on every message using the workspace's existing `topN`, `similarityThreshold`, and `vectorSearchMode` settings
- Results are injected into the `<attached_documents>` context block alongside pinned docs and uploaded files
- If no embeddings exist in the workspace namespace, the search is skipped silently

**Files to Check:**
- `server/prisma/schema.prisma` — `workspaces` model must include `agentAlwaysOnRag Boolean? @default(false)`
- `server/models/workspace.js` — `writable` array and `validations` must include `agentAlwaysOnRag`
- `server/utils/agents/index.js` — `AgentHandler.#fetchParsedFileContext()` performs vector search when flag is set
- `server/utils/agents/ephemeral.js` — `EphemeralAgentHandler.#fetchParsedFileContext()` same
- `server/utils/migrations/addAgentAlwaysOnRag.js` — boot-time `ALTER TABLE` migration
- `server/utils/boot/index.js` — `addAgentAlwaysOnRag()` registered in both `bootHTTP` and `bootSSL`
- `frontend/src/pages/WorkspaceSettings/ChatSettings/ChatModeSelection/index.jsx` — conditional Toggle component

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
4. `addUserProfileFields.js` — Add fullName, email, language, timezone to users table
5. `addApiKeyDescription.js` — Add description column to api_keys table

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
- [ ] When agent tool call limit is hit, agent returns graceful summary instead of 400 error
- [ ] Analytics tracking works (if enabled)
- [ ] User profile fields (fullName, email, language, timezone) appear in Admin Users table and modals
- [ ] Account modal shows username as read-only, fullName/email as "Set by administrator"
- [ ] Language and timezone dropdowns save to DB and sync i18n on save
- [ ] System prompt variables `{user.fullName}`, `{user.email}`, `{user.language}`, `{user.timezone}` resolve correctly
- [ ] `/v1/users` and `/v1/admin/users` return all new fields
- [ ] Build completes without errors: `npm run build`
- [ ] API key description can be set at creation time and appears in the table
- [ ] Existing keys without description show "—" in the description column
- [ ] Description can be edited inline via pencil icon; saves on Enter or ✓ button

---

## Notes

- Always check git history with `git log --oneline` on modified files to understand merge points
- Use `git show <commit>:<filepath>` to see file state at specific commits
- When conflicts arise, prioritize preserving the "keep both" strategy for "agent" vs "automatic" modes
- Run migrations explicitly if adding new custom database tables
