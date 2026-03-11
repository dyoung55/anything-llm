import { useState, useEffect } from "react";
import WorkspaceAgentConfig from "@/models/workspaceAgentConfig";
import showToast from "@/utils/toast";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import { titleCase } from "text-case";

export default function WorkspaceMCPServersSelector({ workspace }) {
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [toggling, setToggling] = useState({});

  useEffect(() => {
    fetchServers();
  }, [workspace.slug]);

  const fetchServers = async () => {
    setLoading(true);
    const { success, servers: serverList, error } =
      await WorkspaceAgentConfig.getAvailableMcpServers(workspace.slug);

    if (success) {
      setServers(serverList || []);
    } else {
      showToast(`Error loading MCP servers: ${error}`, "error", {
        clear: true,
      });
    }
    setLoading(false);
  };

  const handleToggle = async (serverName, currentlyEnabled) => {
    setToggling((prev) => ({ ...prev, [serverName]: true }));

    const { success, error } = await WorkspaceAgentConfig.toggleMcpServer(
      workspace.slug,
      serverName,
      !currentlyEnabled
    );

    if (success) {
      setServers((prev) =>
        prev.map((server) =>
          server.name === serverName
            ? { ...server, enabled: !currentlyEnabled }
            : server
        )
      );
      showToast(
        `MCP server ${!currentlyEnabled ? "enabled" : "disabled"}`,
        "success",
        { clear: true }
      );
    } else {
      showToast(`Error: ${error}`, "error", { clear: true });
    }

    setToggling((prev) => ({ ...prev, [serverName]: false }));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
          <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
          <h3 className="text-lg font-medium text-theme-text-primary">
            MCP Servers
          </h3>
        </div>
        <p className="text-sm text-theme-text-secondary">
          Loading MCP servers...
        </p>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center gap-x-2">
          <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
          <h3 className="text-lg font-medium text-theme-text-primary">
            MCP Servers
          </h3>
        </div>
        <div className="bg-theme-bg-secondary rounded-lg p-4">
          <p className="text-sm text-theme-text-secondary text-center">
            No global MCP servers configured. Configure MCP servers in the Admin
            settings first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
        <div>
          <h3 className="text-lg font-medium text-theme-text-primary">
            MCP Servers
          </h3>
          <p className="text-sm text-theme-text-secondary">
            Enable MCP servers for this workspace
          </p>
        </div>
      </div>

      <div className="bg-theme-bg-secondary rounded-lg p-4">
        <div className="flex flex-col gap-y-3">
          {servers.map((server) => (
            <div
              key={server.name}
              className="flex items-center justify-between p-3 bg-theme-bg-primary rounded-lg"
            >
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-x-2">
                  <span className="text-sm font-medium text-theme-text-primary">
                    {titleCase(server.name.replace(/[_-]/g, " "))}
                  </span>
                  {server.running ? (
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                      Running
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                      Stopped
                    </span>
                  )}
                </div>
                {server.tools && server.tools.length > 0 && (
                  <span className="text-xs text-theme-text-secondary mt-1">
                    {server.tools.length} tool{server.tools.length !== 1 ? "s" : ""} available
                  </span>
                )}
                {server.error && (
                  <span className="text-xs text-red-400 mt-1">
                    Error: {server.error}
                  </span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={server.enabled}
                  onChange={() => handleToggle(server.name, server.enabled)}
                  disabled={toggling[server.name]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Only enabled MCP servers will be available to
          the agent in this workspace. All global MCP servers are listed above.
        </p>
      </div>
    </div>
  );
}
