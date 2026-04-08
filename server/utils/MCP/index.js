const MCPHypervisor = require("./hypervisor");
const WorkspaceAgentConfig = require("../agents/workspaceAgentConfig");

class MCPCompatibilityLayer extends MCPHypervisor {
  static _instance;

  constructor() {
    super();
    if (MCPCompatibilityLayer._instance) return MCPCompatibilityLayer._instance;
    MCPCompatibilityLayer._instance = this;
  }

  /**
   * Get all of the active MCP servers as plugins we can load into agents.
   * This will also boot all MCP servers if they have not been started yet.
   * @param {string|null} workspaceSlug - Optional workspace slug for workspace-specific filtering
   * @returns {Promise<string[]>} Array of flow names in @@mcp_{name} format
   */
  async activeMCPServers(workspaceSlug = null) {
    // Boot all global servers
    await this.bootMCPServers();
    
    const globalServerNames = this.mcpServerConfigs.map(s => s.name);
    
    // If no workspace slug, return all global servers
    if (!workspaceSlug) {
      return Object.keys(this.mcps)
        .filter(name => globalServerNames.includes(name))
        .map(name => `@@mcp_${name}`);
    }

    // Get enabled servers for this workspace
    const enabledServers = WorkspaceAgentConfig.getEnabledMcpServers(workspaceSlug);
    
    // Only return servers that are:
    // 1. In the global config
    // 2. Currently running
    // 3. Enabled for this workspace
    return Object.keys(this.mcps)
      .filter(name => globalServerNames.includes(name) && enabledServers.includes(name))
      .map(name => `@@mcp_${name}`);
  }

  /**
   * Get merged MCP server configs for a workspace (global configs filtered to workspace-enabled ones)
   * @param {string} workspaceSlug - The workspace slug
   * @returns {Array<{name: string, server: Object, source: 'workspace'}>} - Filtered server configs with workspace source
   */
  getMergedMCPServers(workspaceSlug) {
    const enabledServers = WorkspaceAgentConfig.getEnabledMcpServers(workspaceSlug);
    return this.mcpServerConfigs
      .filter(s => enabledServers.includes(s.name))
      .map(s => ({ ...s, source: 'workspace' }));
  }

  /**
   * Convert an MCP server name to an AnythingLLM Agent plugin
   * @param {string} name - The base name of the MCP server to convert - not the tool name. eg: `docker-mcp` not `docker-mcp:list-containers`
   * @param {Object} aibitat - The aibitat object to pass to the plugin
   * @returns {Promise<{name: string, description: string, plugin: Function}[]|null>} Array of plugin configurations or null if not found
   */
  async convertServerToolsToPlugins(name, _aibitat = null) {
    const mcp = this.mcps[name];
    if (!mcp) return null;

    let tools;
    try {
      const response = await mcp.listTools();
      tools = response.tools;
    } catch (error) {
      this.log(`Failed to list tools for MCP server ${name}:`, error);
      return null;
    }
    if (!tools || !tools.length) return null;

    const suppressedTools = this.getSuppressedTools(name);
    const totalTools = tools.length;
    tools = tools.filter((tool) => !suppressedTools.includes(tool.name));
    const suppressedCount = totalTools - tools.length;

    if (suppressedCount > 0) {
      this.log(
        `MCP server ${name}: ${suppressedCount} tool(s) suppressed, ${tools.length} tool(s) enabled`
      );
    }

    if (!tools.length) {
      this.log(`MCP server ${name}: All tools are suppressed, skipping`);
      return null;
    }

    const plugins = [];
    for (const tool of tools) {
      plugins.push({
        name: `${name}-${tool.name}`,
        description: tool.description,
        plugin: function () {
          return {
            name: `${name}-${tool.name}`,
            setup: (aibitat) => {
              aibitat.function({
                super: aibitat,
                name: `${name}-${tool.name}`,
                controller: new AbortController(),
                description: tool.description,
                isMCPTool: true,
                examples: [],
                parameters: {
                  $schema: "http://json-schema.org/draft-07/schema#",
                  ...tool.inputSchema,
                },
                handler: async function (args = {}) {
                  try {
                    const mcpLayer = new MCPCompatibilityLayer();
                    let currentMcp = mcpLayer.mcps[name];

                    if (!currentMcp) {
                      // Server not in mcps - try to reconnect it
                      aibitat.handlerProps.log(
                        `MCP server ${name} not running, attempting to reconnect...`
                      );
                      aibitat.introspect(
                        `MCP server ${name} is offline, attempting to reconnect...`
                      );

                      try {
                        // Attempt reconnection with a timeout
                        const reconnectPromise = mcpLayer.startMCPServer(name);
                        const timeoutPromise = new Promise((_, reject) =>
                          setTimeout(
                            () =>
                              reject(new Error("Reconnection attempt timeout")),
                            15000
                          )
                        );
                        const result = await Promise.race([
                          reconnectPromise,
                          timeoutPromise,
                        ]);

                        if (!result.success) {
                          throw new Error(
                            result.error || "Failed to reconnect to MCP server"
                          );
                        }

                        currentMcp = mcpLayer.mcps[name];
                        if (!currentMcp) {
                          throw new Error(
                            `Server ${name} reported success but is not in mcps`
                          );
                        }

                        aibitat.handlerProps.log(
                          `Successfully reconnected to MCP server ${name}`
                        );
                        aibitat.introspect(
                          `Successfully reconnected to MCP server ${name}`
                        );
                      } catch (reconnectError) {
                        throw new Error(
                          `MCP server ${name} is offline and could not be reconnected: ${reconnectError.message}`
                        );
                      }
                    }

                    // Verify server is still alive before executing
                    try {
                      const serverAlive = await Promise.race([
                        currentMcp.ping(),
                        new Promise((_, reject) =>
                          setTimeout(
                            () => reject(new Error("Ping timeout")),
                            3000
                          )
                        ),
                      ]);
                      if (!serverAlive) {
                        throw new Error("Server ping returned false");
                      }
                    } catch (pingError) {
                      throw new Error(
                        `MCP server ${name} is not responding: ${pingError.message}`
                      );
                    }

                    aibitat.handlerProps.log(
                      `Executing MCP server: ${name}:${tool.name} with args:`,
                      args
                    );
                    aibitat.introspect(
                      `Executing MCP server: ${name} with ${JSON.stringify(args, null, 2)}`
                    );
                    const result = await currentMcp.callTool({
                      name: tool.name,
                      arguments: args,
                    });
                    aibitat.handlerProps.log(
                      `MCP server: ${name}:${tool.name} completed successfully`,
                      result
                    );
                    aibitat.introspect(
                      `MCP server: ${name}:${tool.name} completed successfully`
                    );
                    return MCPCompatibilityLayer.returnMCPResult(result);
                  } catch (error) {
                    aibitat.handlerProps.log(
                      `MCP server: ${name}:${tool.name} failed with error:`,
                      error
                    );
                    aibitat.introspect(
                      `MCP server: ${name}:${tool.name} failed with error:`,
                      error
                    );
                    return `The tool ${name}:${tool.name} failed with error: ${error?.message || "An unknown error occurred"}`;
                  }
                },
              });
            },
          };
        },
        toolName: `${name}:${tool.name}`,
      });
    }

    return plugins;
  }

  /**
   * Returns the MCP servers that were loaded or attempted to be loaded
   * so that we can display them in the frontend for review or error logging.
   * Does NOT attempt to re-connect to offline servers - only returns current state.
   * @param {string|null} workspaceSlug - Optional workspace slug for workspace-specific servers
   * @returns {Promise<{
   *   name: string,
   *   running: boolean,
   *   tools: {name: string, description: string, inputSchema: Object}[],
   *   process: {pid: number, cmd: string}|null,
   *   error: string|null,
   *   source: 'global' | 'workspace'
   * }[]>} - The active MCP servers
   */
  async servers(workspaceSlug = null) {
    // Do NOT call bootMCPServers() here - just return current state
    // bootMCPServers() is only called at startup or on explicit reload
    const servers = [];

    try {
      // Get merged servers if workspace slug provided
      const serverConfigs = workspaceSlug
        ? this.getMergedMCPServers(workspaceSlug)
        : this.mcpServerConfigs.map(s => ({ ...s, source: 'global' }));

      for (const serverConfig of serverConfigs) {
        try {
          const name = serverConfig.name;
          const result = this.mcpLoadingResults[name];

          if (result && result.status === "failed") {
            servers.push({
              name,
              config: serverConfig.server || null,
              running: false,
              tools: [],
              error: result.message,
              process: null,
              source: serverConfig.source || 'global',
            });
            continue;
          }

          const mcp = this.mcps[name];
          if (!mcp) {
            // Server not running - might be workspace-specific and not started
            servers.push({
              name,
              config: serverConfig.server || null,
              running: false,
              tools: [],
              error: null,
              process: null,
              source: serverConfig.source || 'global',
            });
            continue;
          }

          // Check if server is still alive with a timeout
          let online = false;
          let tools = [];
          try {
            const pingPromise = mcp.ping();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Ping timeout")), 2000)
            );
            online = !!(await Promise.race([pingPromise, timeoutPromise]));

            if (online) {
              try {
                const toolsPromise = mcp.listTools();
                const toolsTimeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("List tools timeout")), 2000)
                );
                const toolsResult = await Promise.race([toolsPromise, toolsTimeoutPromise]);
                tools = (toolsResult.tools || []).filter(
                  (tool) => !tool.name.startsWith("handle_mcp_connection_mcp_")
                );
              } catch (toolError) {
                // If tool listing times out or fails, just continue without tools
                this.log(`Failed to list tools for ${name}: ${toolError.message}`);
                tools = [];
              }
            }
          } catch (pingError) {
            // If ping fails, mark as offline
            online = false;
          }

          servers.push({
            name,
            config: serverConfig.server || null,
            running: online,
            tools,
            error: null,
            process: {
              pid: mcp.transport?.process?.pid || null,
            },
            source: serverConfig.source || 'global',
          });
        } catch (serverError) {
          // If processing a single server fails, log it and continue with others
          this.log(`Error processing server config: ${serverError.message}`);
          servers.push({
            name: serverConfig.name,
            config: serverConfig.server || null,
            running: false,
            tools: [],
            error: `Error checking server status: ${serverError.message}`,
            process: null,
            source: serverConfig.source || 'global',
          });
        }
      }
    } catch (error) {
      // If getting server configs fails, log it and return what we have
      this.log(`Error in servers() method: ${error.message}`);
    }

    return servers;
  }

  /**
   * Toggle the MCP server (start or stop)
   * @param {string} name - The name of the MCP server to toggle
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  async toggleServerStatus(name) {
    const server = this.mcpServerConfigs.find((s) => s.name === name);
    if (!server)
      return {
        success: false,
        error: `MCP server ${name} not found in config file.`,
      };
    const mcp = this.mcps[name];
    const online = !!mcp ? !!(await mcp.ping()) : false; // If the server is not in the mcps object, it is not running

    if (online) {
      const killed = this.pruneMCPServer(name);
      return {
        success: killed,
        error: killed ? null : `Failed to kill MCP server: ${name}`,
      };
    } else {
      const startupResult = await this.startMCPServer(name);
      return { success: startupResult.success, error: startupResult.error };
    }
  }

  /**
   * Delete the MCP server - will also remove it from the config file
   * @param {string} name - The name of the MCP server to delete
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  async deleteServer(name) {
    const server = this.mcpServerConfigs.find((s) => s.name === name);
    if (!server)
      return {
        success: false,
        error: `MCP server ${name} not found in config file.`,
      };

    const mcp = this.mcps[name];
    const online = !!mcp ? !!(await mcp.ping()) : false; // If the server is not in the mcps object, it is not running
    if (online) this.pruneMCPServer(name);
    this.removeMCPServerFromConfig(name);

    delete this.mcps[name];
    delete this.mcpLoadingResults[name];
    this.log(`MCP server was killed and removed from config file: ${name}`);
    return { success: true, error: null };
  }

  /**
   * Return the result of an MCP server call as a string
   * This will handle circular references and bigints since an MCP server can return any type of data.
   * @param {Object} result - The result to return
   * @returns {string} The result as a string
   */
  static returnMCPResult(result) {
    if (typeof result !== "object" || result === null) return String(result);

    const seen = new WeakSet();
    try {
      return JSON.stringify(result, (key, value) => {
        if (typeof value === "bigint") return value.toString();
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      });
    } catch (e) {
      return `[Unserializable: ${e.message}]`;
    }
  }

  /**
   * Toggle tool suppression for an MCP server
   * @param {string} serverName - The name of the MCP server
   * @param {string} toolName - The name of the tool to toggle
   * @param {boolean} enabled - Whether the tool should be enabled (true) or suppressed (false)
   * @returns {Promise<{success: boolean, error: string | null, suppressedTools: string[]}>}
   */
  async toggleToolSuppression(serverName, toolName, enabled) {
    return this.updateSuppressedTools(serverName, toolName, enabled);
  }
}
module.exports = MCPCompatibilityLayer;
