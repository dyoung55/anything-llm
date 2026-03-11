const fs = require("fs");
const path = require("path");
const { safeJsonParse } = require("../http");
const { isWithin, normalizePath } = require("../files");
const { SystemSettings } = require("../../models/systemSettings");
const AgentPlugins = require("./aibitat/plugins");

const workspaceAgentConfigPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/plugins/workspace-agent-config")
    : path.resolve(process.env.STORAGE_DIR, "plugins", "workspace-agent-config");

const DEFAULT_SKILLS = [
  AgentPlugins.memory.name,
  AgentPlugins.docSummarizer.name,
  AgentPlugins.webScraping.name,
];

class WorkspaceAgentConfig {
  /**
   * Get the path to a workspace's agent configuration file
   * @param {string} workspaceSlug - The workspace slug
   * @returns {string} - The path to the workspace agent config file
   */
  static getConfigPath(workspaceSlug) {
    if (!fs.existsSync(workspaceAgentConfigPath)) {
      fs.mkdirSync(workspaceAgentConfigPath, { recursive: true });
    }
    return path.resolve(
      workspaceAgentConfigPath,
      normalizePath(`${workspaceSlug}.json`)
    );
  }

  /**
   * Validate that a path is within the workspace agent config directory
   * @param {string} pathToValidate - The path to validate
   * @returns {boolean}
   */
  static isValidLocation(pathToValidate) {
    if (!isWithin(workspaceAgentConfigPath, pathToValidate)) return false;
    return true;
  }

  /**
   * Get workspace agent configuration
   * @param {string} workspaceSlug - The workspace slug
   * @returns {Object} - The workspace agent config
   */
  static getConfig(workspaceSlug) {
    const configPath = this.getConfigPath(workspaceSlug);
    if (!this.isValidLocation(configPath)) {
      return { enabledMcpServers: [], enabledSkills: [], disabledSkills: [] };
    }

    if (!fs.existsSync(configPath)) {
      return { enabledMcpServers: [], enabledSkills: [], disabledSkills: [] };
    }

    try {
      const config = safeJsonParse(fs.readFileSync(configPath, "utf8"), {
        enabledMcpServers: [],
        enabledSkills: [],
        disabledSkills: [],
      });
      return config;
    } catch (error) {
      console.error(
        `Error reading workspace agent config for ${workspaceSlug}:`,
        error
      );
      return { enabledMcpServers: [], enabledSkills: [], disabledSkills: [] };
    }
  }

  /**
   * Save workspace agent configuration
   * @param {string} workspaceSlug - The workspace slug
   * @param {Object} config - The agent config to save
   * @returns {boolean} - Success status
   */
  static saveConfig(workspaceSlug, config) {
    const configPath = this.getConfigPath(workspaceSlug);
    if (!this.isValidLocation(configPath)) {
      throw new Error("Invalid workspace agent config path");
    }

    try {
      const validatedConfig = {
        enabledMcpServers: Array.isArray(config.enabledMcpServers)
          ? config.enabledMcpServers
          : [],
        enabledSkills: Array.isArray(config.enabledSkills)
          ? config.enabledSkills
          : [],
        disabledSkills: Array.isArray(config.disabledSkills)
          ? config.disabledSkills
          : [],
      };

      fs.writeFileSync(
        configPath,
        JSON.stringify(validatedConfig, null, 2),
        "utf8"
      );
      return true;
    } catch (error) {
      console.error(
        `Error saving workspace agent config for ${workspaceSlug}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get enabled MCP servers for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @returns {string[]} - Array of enabled MCP server names
   */
  static getEnabledMcpServers(workspaceSlug) {
    const config = this.getConfig(workspaceSlug);
    return config.enabledMcpServers || [];
  }

  /**
   * Get enabled skills for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @returns {Promise<string[]>} - Array of enabled skill names
   */
  static async getEnabledSkills(workspaceSlug) {
    const config = this.getConfig(workspaceSlug);
    const enabledSkills = [];

    // Process enabled skills
    config.enabledSkills.forEach((skillName) => {
      if (!AgentPlugins.hasOwnProperty(skillName)) return;

      // This is a plugin module with many sub-children plugins
      if (Array.isArray(AgentPlugins[skillName].plugin)) {
        for (const subPlugin of AgentPlugins[skillName].plugin) {
          enabledSkills.push(
            `${AgentPlugins[skillName].name}#${subPlugin.name}`
          );
        }
        return;
      }

      // This is normal single-stage plugin
      enabledSkills.push(AgentPlugins[skillName].name);
    });

    return enabledSkills;
  }

  /**
   * Toggle an MCP server for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} serverName - The MCP server name
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} - Success status
   */
  static toggleMcpServer(workspaceSlug, serverName, enabled) {
    const config = this.getConfig(workspaceSlug);

    if (enabled) {
      // Add to enabled list if not already there
      if (!config.enabledMcpServers.includes(serverName)) {
        config.enabledMcpServers.push(serverName);
      }
    } else {
      // Remove from enabled list
      config.enabledMcpServers = config.enabledMcpServers.filter(
        (name) => name !== serverName
      );
    }

    return this.saveConfig(workspaceSlug, config);
  }

  /**
   * Toggle a skill for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} skillName - The skill name
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} - Success status
   */
  static toggleSkill(workspaceSlug, skillName, enabled) {
    const config = this.getConfig(workspaceSlug);

    // Check if this is a default skill
    const isDefaultSkill = DEFAULT_SKILLS.includes(skillName);

    if (isDefaultSkill) {
      // For default skills, we use disabledSkills array
      if (enabled) {
        // Remove from disabled list
        config.disabledSkills = config.disabledSkills.filter(
          (name) => name !== skillName
        );
      } else {
        // Add to disabled list if not already there
        if (!config.disabledSkills.includes(skillName)) {
          config.disabledSkills.push(skillName);
        }
      }
    } else {
      // For configurable skills, we use enabledSkills array
      if (enabled) {
        // Add to enabled list if not already there
        if (!config.enabledSkills.includes(skillName)) {
          config.enabledSkills.push(skillName);
        }
      } else {
        // Remove from enabled list
        config.enabledSkills = config.enabledSkills.filter(
          (name) => name !== skillName
        );
      }
    }

    return this.saveConfig(workspaceSlug, config);
  }

  /**
   * Check if an MCP server is enabled for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} serverName - The MCP server name
   * @returns {boolean} - Whether the server is enabled
   */
  static isMcpServerEnabled(workspaceSlug, serverName) {
    const config = this.getConfig(workspaceSlug);
    return config.enabledMcpServers.includes(serverName);
  }

  /**
   * Check if a skill is enabled for a workspace
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} skillName - The skill name
   * @returns {boolean} - Whether the skill is enabled
   */
  static isSkillEnabled(workspaceSlug, skillName) {
    const config = this.getConfig(workspaceSlug);
    const isDefaultSkill = DEFAULT_SKILLS.includes(skillName);

    if (isDefaultSkill) {
      // Default skills are enabled unless explicitly disabled
      return !config.disabledSkills.includes(skillName);
    } else {
      // Configurable skills are disabled unless explicitly enabled
      return config.enabledSkills.includes(skillName);
    }
  }
}

module.exports = WorkspaceAgentConfig;
