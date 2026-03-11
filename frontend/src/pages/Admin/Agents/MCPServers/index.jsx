import { useState, useEffect } from "react";
import { titleCase } from "text-case";
import { BookOpenText, ArrowClockwise, PencilSimple } from "@phosphor-icons/react";
import MCPLogo from "@/media/agents/mcp-logo.svg";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import JsonEditorModal from "@/components/JsonEditor/JsonEditorModal";

export function MCPServerHeader({
  setMcpServers,
  setSelectedMcpServer,
  children,
}) {
  const [loadingMcpServers, setLoadingMcpServers] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [mcpConfig, setMcpConfig] = useState({ mcpServers: {} });

  useEffect(() => {
    fetchMCPConfig();
  }, []);

  const fetchMCPConfig = async () => {
    setLoadingMcpServers(true);
    
    // Fetch both servers and config
    const [serversResult, configResult] = await Promise.all([
      MCPServers.listServers(),
      MCPServers.getConfig(),
    ]);
    
    if (serversResult.success) {
      setMcpServers(serversResult.servers || []);
    }
    
    if (configResult.success && configResult.config) {
      setMcpConfig(configResult.config);
    }
    
    setLoadingMcpServers(false);
  };

  // Refresh the list of MCP servers
  const refreshMCPServers = () => {
    if (
      window.confirm(
        "Are you sure you want to refresh the list of MCP servers? This will restart all MCP servers and reload their tools."
      )
    ) {
      setLoadingMcpServers(true);
      MCPServers.forceReload()
        .then(({ servers = [] }) => {
          setSelectedMcpServer(null);
          setMcpServers(servers);
          // Refresh config too
          fetchMCPConfig();
        })
        .catch((err) => {
          console.error(err);
          showToast(`Failed to refresh MCP servers.`, "error", { clear: true });
        })
        .finally(() => {
          setLoadingMcpServers(false);
        });
    }
  };

  const handleSaveJson = async (parsedJson) => {
    try {
      const { success, message, error } = await MCPServers.updateConfig(parsedJson);
      
      if (success) {
        showToast(
          message || "MCP configuration updated successfully. Servers reloaded.",
          "success",
          { clear: true }
        );
        // Refresh the server list
        await fetchMCPConfig();
      } else {
        showToast(`Error: ${error || "Failed to update configuration"}`, "error", {
          clear: true,
        });
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error saving MCP config:", error);
      throw error;
    }
  };

  return (
    <>
      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <img src={MCPLogo} className="w-6 h-6 light:invert" alt="MCP Logo" />
          <p className="text-lg font-medium">MCP Servers</p>
        </div>
        <div className="flex items-center gap-x-3">
          <a
            href="https://docs.anythingllm.com/mcp-compatibility/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="border-none text-theme-text-secondary hover:text-cta-button"
          >
            <BookOpenText size={16} />
          </a>
          <button
            type="button"
            onClick={() => setShowJsonEditor(true)}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <PencilSimple size={16} />
            <p className="text-sm">Edit JSON</p>
          </button>
          <button
            type="button"
            onClick={refreshMCPServers}
            disabled={loadingMcpServers}
            className="border-none text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <ArrowClockwise
              size={16}
              className={loadingMcpServers ? "animate-spin" : ""}
            />
            <p className="text-sm">
              {loadingMcpServers ? "Loading..." : "Refresh"}
            </p>
          </button>
        </div>
      </div>
      {children({ loadingMcpServers })}
      
      <JsonEditorModal
        isOpen={showJsonEditor}
        onClose={() => setShowJsonEditor(false)}
        initialValue={mcpConfig}
        onSave={handleSaveJson}
        title="Edit Global MCP Servers Configuration"
        description='Edit the global MCP servers configuration. The structure should be: { "mcpServers": { "server-name": { "command": "...", "args": [...] } } }. Changes will reload all MCP servers.'
        readOnly={false}
      />
    </>
  );
}

export function MCPServersList({
  isLoading = false,
  servers = [],
  selectedServer,
  handleClick,
}) {
  if (isLoading) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>Loading MCP Servers from configuration file...</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          Learn more about MCP Servers.
        </a>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="text-theme-text-secondary text-center text-xs flex flex-col gap-y-2">
        <p>No MCP servers found</p>
        <a
          href="https://docs.anythingllm.com/mcp-compatibility/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-theme-text-secondary underline hover:text-cta-button"
        >
          Learn more about MCP Servers.
        </a>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg-secondary text-white rounded-xl w-full md:min-w-[360px]">
      {servers.map((server, index) => (
        <div
          key={server.name}
          className={`py-3 px-4 flex items-center justify-between ${
            index === 0 ? "rounded-t-xl" : ""
          } ${
            index === servers.length - 1
              ? "rounded-b-xl"
              : "border-b border-white/10"
          } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
            selectedServer?.name === server.name
              ? "bg-white/10 light:bg-theme-bg-sidebar"
              : ""
          }`}
          onClick={() => handleClick?.(server)}
        >
          <div className="text-sm font-light">
            {titleCase(server.name.replace(/[_-]/g, " "))}
          </div>
          <div className="flex items-center gap-x-2">
            <div
              className={`text-sm text-theme-text-secondary font-medium ${server.running ? "text-green-500" : "text-red-500"}`}
            >
              {server.running ? "On" : "Stopped"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
