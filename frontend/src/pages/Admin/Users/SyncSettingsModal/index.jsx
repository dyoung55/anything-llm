import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import Toggle from "@/components/lib/Toggle";
import cronstrue from "cronstrue";

export default function SyncSettingsModal({ closeModal }) {
  const [enabled, setEnabled] = useState(false);
  const [cron, setCron] = useState("");
  const [cronError, setCronError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    Admin.getSiriusSettings().then(({ enabled: e, cron: c }) => {
      setEnabled(!!e);
      setCron(c || "");
    });
  }, []);

  function cronDescription(expr) {
    if (!expr.trim()) return null;
    try {
      return cronstrue.toString(expr, { throwExceptionOnParseError: true });
    } catch {
      return null;
    }
  }

  function handleCronChange(val) {
    setCron(val);
    setCronError(
      val.trim() && !cronDescription(val) ? "Invalid cron expression." : null
    );
  }

  async function handleSave() {
    if (enabled && (!cron.trim() || cronError)) return;
    setSaving(true);
    setSaveError(null);
    const result = await Admin.updateSiriusSettings({ enabled, cron });
    setSaving(false);
    if (result?.success) {
      closeModal();
    } else {
      setSaveError(result?.error || "Failed to save settings.");
    }
  }

  const description = cronDescription(cron);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="relative w-full max-w-md bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border flex flex-col">
        <div className="relative p-6 border-b rounded-t border-theme-modal-border flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">
            User Sync Settings
          </h3>
          <button
            onClick={closeModal}
            type="button"
            className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
          >
            <X size={24} weight="bold" className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Toggle
            size="md"
            variant="horizontal"
            label="Sync user data periodically"
            description="Automatically call the Sirius API to push updated user metadata into AnythingLLM on a schedule."
            enabled={enabled}
            onChange={setEnabled}
          />

          {enabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Sync schedule (cron syntax)
              </label>
              <input
                type="text"
                value={cron}
                onChange={(e) => handleCronChange(e.target.value)}
                placeholder="e.g. 0 * * * *  (every hour)"
                className="w-full border-none bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg outline-none px-4 py-2"
              />
              {description && !cronError && (
                <p className="text-xs text-green-400">{description}</p>
              )}
              {cronError && (
                <p className="text-xs text-red-400">{cronError}</p>
              )}
              <p className="text-xs text-theme-text-secondary">
                Every run is logged to Event Logs and the server console.
              </p>
            </div>
          )}

          {saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-theme-modal-border">
          <button
            onClick={closeModal}
            type="button"
            className="px-4 py-2 text-sm font-medium text-theme-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (enabled && (!cron.trim() || !!cronError))}
            type="button"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-button text-white hover:bg-primary-button/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
