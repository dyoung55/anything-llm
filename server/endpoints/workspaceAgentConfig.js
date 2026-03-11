const { Workspace } = require("../models/workspace");
const { reqBody, multiUserMode, userFromSession } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const WorkspaceAgentConfig = require("../utils/agents/workspaceAgentConfig");
const MCPCompatibilityLayer = require("../utils/MCP");
const { SystemSettings } = require("../models/systemSettings");
const { safeJsonParse } = require("../utils/http");
const AgentPlugins = require("../utils/agents/aibitat/plugins");

function workspaceAgentConfigEndpoints(app) {
  if (!app) return;

  /**
   * Get workspace agent configuration
   */
  app.get(
    "/workspace/:slug/agent-config",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        // Check permissions
        if (multiUserMode(response)) {
          const user = await userFromSession(request, response);
          if (!user || user.role === ROLES.default) {
            response.status(403).json({
              success: false,
              error: "Insufficient permissions",
            });
            return;
          }
        }

        const config = WorkspaceAgentConfig.getConfig(slug);

        response.status(200).json({
          success: true,
          overrideGlobalAgentSettings:
            workspace.overrideGlobalAgentSettings || false,
          enabledMcpServers: config.enabledMcpServers,
          enabledSkills: config.enabledSkills,
          disabledSkills: config.disabledSkills,
        });
      } catch (error) {
        console.error("Error getting workspace agent config:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Toggle workspace agent settings override
   */
  app.post(
    "/workspace/:slug/agent-config/toggle-override",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const { enabled } = reqBody(request);

        const workspace = await Workspace.get({ slug });
        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        const { workspace: updatedWorkspace, message } = await Workspace.update(
          workspace.id,
          {
            overrideGlobalAgentSettings: enabled === true,
          }
        );

        if (!updatedWorkspace) {
          response.status(500).json({
            success: false,
            error: message || "Failed to update workspace",
          });
          return;
        }

        response.status(200).json({
          success: true,
          workspace: updatedWorkspace,
        });
      } catch (error) {
        console.error("Error toggling workspace override:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Toggle MCP server for workspace
   */
  app.post(
    "/workspace/:slug/agent-config/toggle-mcp-server",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const { serverName, enabled } = reqBody(request);

        const workspace = await Workspace.get({ slug });
        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        if (!serverName || typeof enabled !== "boolean") {
          response.status(400).json({
            success: false,
            error: "Invalid request: serverName and enabled are required",
          });
          return;
        }

        const success = WorkspaceAgentConfig.toggleMcpServer(
          slug,
          serverName,
          enabled
        );

        if (!success) {
          response.status(500).json({
            success: false,
            error: "Failed to toggle MCP server",
          });
          return;
        }

        response.status(200).json({
          success: true,
          message: `MCP server ${enabled ? "enabled" : "disabled"} successfully`,
        });
      } catch (error) {
        console.error("Error toggling MCP server:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Toggle skill for workspace
   */
  app.post(
    "/workspace/:slug/agent-config/toggle-skill",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const { skillName, enabled } = reqBody(request);

        const workspace = await Workspace.get({ slug });
        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        if (!skillName || typeof enabled !== "boolean") {
          response.status(400).json({
            success: false,
            error: "Invalid request: skillName and enabled are required",
          });
          return;
        }

        const success = WorkspaceAgentConfig.toggleSkill(
          slug,
          skillName,
          enabled
        );

        if (!success) {
          response.status(500).json({
            success: false,
            error: "Failed to toggle skill",
          });
          return;
        }

        response.status(200).json({
          success: true,
          message: `Skill ${enabled ? "enabled" : "disabled"} successfully`,
        });
      } catch (error) {
        console.error("Error toggling skill:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Get available MCP servers with their enabled status
   */
  app.get(
    "/workspace/:slug/agent-config/available-mcp-servers",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        const mcpLayer = new MCPCompatibilityLayer();
        const servers = await mcpLayer.servers();
        const config = WorkspaceAgentConfig.getConfig(slug);

        const serversWithStatus = servers.map((server) => ({
          name: server.name,
          running: server.running,
          tools: server.tools,
          error: server.error,
          enabled: config.enabledMcpServers.includes(server.name),
        }));

        response.status(200).json({
          success: true,
          servers: serversWithStatus,
        });
      } catch (error) {
        console.error("Error getting available MCP servers:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * Get available skills with their enabled status
   */
  app.get(
    "/workspace/:slug/agent-config/available-skills",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.status(404).json({
            success: false,
            error: "Workspace not found",
          });
          return;
        }

        const config = WorkspaceAgentConfig.getConfig(slug);

        // Get global skills
        const _disabledDefaultSkills = safeJsonParse(
          await SystemSettings.getValueOrFallback(
            { label: "disabled_agent_skills" },
            "[]"
          ),
          []
        );

        const _configurableSkills = safeJsonParse(
          await SystemSettings.getValueOrFallback(
            { label: "default_agent_skills" },
            "[]"
          ),
          []
        );

        // Build default skills list
        const DEFAULT_SKILLS = [
          AgentPlugins.memory.name,
          AgentPlugins.docSummarizer.name,
          AgentPlugins.webScraping.name,
        ];

        const defaultSkills = DEFAULT_SKILLS.filter(
          (skill) => !_disabledDefaultSkills.includes(skill)
        ).map((skillName) => ({
          name: skillName,
          enabled: !config.disabledSkills.includes(skillName),
          isDefault: true,
        }));

        const configurableSkills = _configurableSkills.map((skillName) => ({
          name: skillName,
          enabled: config.enabledSkills.includes(skillName),
          isDefault: false,
        }));

        response.status(200).json({
          success: true,
          skills: {
            default: defaultSkills,
            configurable: configurableSkills,
          },
        });
      } catch (error) {
        console.error("Error getting available skills:", error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );
}

module.exports = { workspaceAgentConfigEndpoints };
