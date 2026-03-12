const fs = require("fs");
const path = require("path");
const { safeJsonParse } = require("../http");

const oldWorkspaceMCPPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/workspace-mcp-servers")
    : path.resolve(process.env.STORAGE_DIR, "plugins", "workspace-mcp-servers");

const oldWorkspaceSkillsPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/workspace-skills")
    : path.resolve(process.env.STORAGE_DIR, "plugins", "workspace-skills");

const newWorkspaceAgentConfigPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/workspace-agent-config")
    : path.resolve(process.env.STORAGE_DIR, "plugins", "workspace-agent-config");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/.workspace-agent-config-migrated")
    : path.resolve(process.env.STORAGE_DIR, "plugins", ".workspace-agent-config-migrated");

/**
 * Migrate old workspace-specific MCP and skills configs to new format
 * This migration runs once on server startup
 */
async function migrateWorkspaceAgentConfig() {
  // Check if migration already ran
  if (fs.existsSync(migrationFlagPath)) {
    console.log("[Migration] Workspace agent config migration already completed");
    return;
  }

  console.log("[Migration] Starting workspace agent config migration...");

  let migratedCount = 0;
  const workspaceSlugs = new Set();

  // Collect all workspace slugs from old configs
  if (fs.existsSync(oldWorkspaceMCPPath)) {
    const mcpFiles = fs.readdirSync(oldWorkspaceMCPPath);
    mcpFiles.forEach((file) => {
      if (file.endsWith(".json")) {
        workspaceSlugs.add(file.replace(".json", ""));
      }
    });
  }

  if (fs.existsSync(oldWorkspaceSkillsPath)) {
    const skillFiles = fs.readdirSync(oldWorkspaceSkillsPath);
    skillFiles.forEach((file) => {
      if (file.endsWith(".json")) {
        workspaceSlugs.add(file.replace(".json", ""));
      }
    });
  }

  if (workspaceSlugs.size === 0) {
    console.log("[Migration] No workspace configs to migrate");
    const pluginsDir = path.dirname(migrationFlagPath);
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }
    fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
    return;
  }

  // Create new config directory
  if (!fs.existsSync(newWorkspaceAgentConfigPath)) {
    fs.mkdirSync(newWorkspaceAgentConfigPath, { recursive: true });
  }

  // Migrate each workspace
  for (const slug of workspaceSlugs) {
    try {
      const newConfig = {
        enabledMcpServers: [],
        enabledSkills: [],
        disabledSkills: [],
      };

      // Migrate MCP servers
      const oldMcpPath = path.join(oldWorkspaceMCPPath, `${slug}.json`);
      if (fs.existsSync(oldMcpPath)) {
        const oldMcpConfig = safeJsonParse(
          fs.readFileSync(oldMcpPath, "utf8"),
          { mcpServers: {} }
        );
        // Extract server names from the old config
        newConfig.enabledMcpServers = Object.keys(
          oldMcpConfig.mcpServers || {}
        );
      }

      // Migrate skills
      const oldSkillsPath = path.join(oldWorkspaceSkillsPath, `${slug}.json`);
      if (fs.existsSync(oldSkillsPath)) {
        const oldSkillsConfig = safeJsonParse(
          fs.readFileSync(oldSkillsPath, "utf8"),
          { enabledSkills: [], disabledSkills: [], importedSkills: [] }
        );
        newConfig.enabledSkills = oldSkillsConfig.enabledSkills || [];
        newConfig.disabledSkills = oldSkillsConfig.disabledSkills || [];
        // Note: importedSkills are handled separately via ImportedPlugin system
      }

      // Write new config
      const newConfigPath = path.join(
        newWorkspaceAgentConfigPath,
        `${slug}.json`
      );
      fs.writeFileSync(
        newConfigPath,
        JSON.stringify(newConfig, null, 2),
        "utf8"
      );

      console.log(`[Migration] Migrated config for workspace: ${slug}`);
      migratedCount++;
    } catch (error) {
      console.error(`[Migration] Error migrating workspace ${slug}:`, error);
    }
  }

  // Delete old directories
  try {
    if (fs.existsSync(oldWorkspaceMCPPath)) {
      fs.rmSync(oldWorkspaceMCPPath, { recursive: true, force: true });
      console.log("[Migration] Removed old workspace-mcp-servers directory");
    }
  } catch (error) {
    console.error("[Migration] Error removing old MCP directory:", error);
  }

  try {
    if (fs.existsSync(oldWorkspaceSkillsPath)) {
      fs.rmSync(oldWorkspaceSkillsPath, { recursive: true, force: true });
      console.log("[Migration] Removed old workspace-skills directory");
    }
  } catch (error) {
    console.error("[Migration] Error removing old skills directory:", error);
  }

  // Create migration flag
  const pluginsDir = path.dirname(migrationFlagPath);
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }
  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");

  console.log(
    `[Migration] Workspace agent config migration completed. Migrated ${migratedCount} workspace(s).`
  );
}

module.exports = { migrateWorkspaceAgentConfig };
