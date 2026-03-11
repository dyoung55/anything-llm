import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const WorkspaceAgentConfig = {
  /**
   * Get workspace agent configuration
   * @param {string} slug - Workspace slug
   * @returns {Promise<{success: boolean, overrideGlobalAgentSettings: boolean, enabledMcpServers: string[], enabledSkills: string[], disabledSkills: string[], error?: string}>}
   */
  getConfig: async (slug) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Toggle workspace agent settings override
   * @param {string} slug - Workspace slug
   * @param {boolean} enabled - Whether to enable override
   * @returns {Promise<{success: boolean, workspace?: Object, error?: string}>}
   */
  toggleOverride: async (slug, enabled) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config/toggle-override`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ enabled }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Toggle MCP server for workspace
   * @param {string} slug - Workspace slug
   * @param {string} serverName - MCP server name
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  toggleMcpServer: async (slug, serverName, enabled) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config/toggle-mcp-server`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ serverName, enabled }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Toggle skill for workspace
   * @param {string} slug - Workspace slug
   * @param {string} skillName - Skill name
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  toggleSkill: async (slug, skillName, enabled) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config/toggle-skill`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ skillName, enabled }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Get available MCP servers with their enabled status
   * @param {string} slug - Workspace slug
   * @returns {Promise<{success: boolean, servers: Array, error?: string}>}
   */
  getAvailableMcpServers: async (slug) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config/available-mcp-servers`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Get available skills with their enabled status
   * @param {string} slug - Workspace slug
   * @returns {Promise<{success: boolean, skills: Object, error?: string}>}
   */
  getAvailableSkills: async (slug) => {
    return await fetch(`${API_BASE}/workspace/${slug}/agent-config/available-skills`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default WorkspaceAgentConfig;
