import { useState } from "react";
import WorkspaceAgentConfig from "@/models/workspaceAgentConfig";
import showToast from "@/utils/toast";

export default function OverrideAgentSettingsToggle({
  workspace,
  onToggle,
}) {
  const [isEnabled, setIsEnabled] = useState(
    workspace?.overrideGlobalAgentSettings || false
  );
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    const newValue = !isEnabled;

    const { success, workspace: updatedWorkspace, error } =
      await WorkspaceAgentConfig.toggleOverride(workspace.slug, newValue);

    if (success && updatedWorkspace) {
      setIsEnabled(newValue);
      showToast(
        `Workspace-specific agent settings ${newValue ? "enabled" : "disabled"}`,
        "success",
        { clear: true }
      );
      if (onToggle) onToggle(updatedWorkspace);
    } else {
      showToast(`Error: ${error || "Failed to update settings"}`, "error", {
        clear: true,
      });
    }

    setIsToggling(false);
  };

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center gap-x-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
            disabled={isToggling}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
        <span className="text-sm font-medium text-theme-text-primary">
          Override Global Agent Settings
        </span>
      </div>

      <div className="text-sm text-theme-text-secondary">
        {isEnabled ? (
          <p>
            This workspace is using custom agent settings. Skills and MCP
            servers configured below will be added to the global configuration.
          </p>
        ) : (
          <p>
            This workspace is using global agent settings. Enable this option to
            configure workspace-specific skills and MCP servers.
          </p>
        )}
      </div>

      {isEnabled && (
        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> Workspace-specific settings are additive.
            Global skills and MCP servers will still be available, and you can
            add workspace-specific ones below.
          </p>
        </div>
      )}
    </div>
  );
}
