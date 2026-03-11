import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function CustomBannerSettings() {
  const { t } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    text: "",
    bgColor: "#46c8ff",
    textColor: "#ffffff",
    link: "",
    linkText: "",
    reappearHours: "",
  });

  useEffect(() => {
    Admin.systemPreferencesByFields([
      "custom_banner_enabled",
      "custom_banner_text",
      "custom_banner_bg_color",
      "custom_banner_text_color",
      "custom_banner_link",
      "custom_banner_link_text",
      "custom_banner_reappear_hours",
    ]).then(({ settings: prefs }) => {
      setSettings({
        enabled: prefs?.custom_banner_enabled === "true",
        text: prefs?.custom_banner_text || "",
        bgColor: prefs?.custom_banner_bg_color || "#46c8ff",
        textColor: prefs?.custom_banner_text_color || "#ffffff",
        link: prefs?.custom_banner_link || "",
        linkText: prefs?.custom_banner_link_text || "",
        reappearHours: prefs?.custom_banner_reappear_hours || "",
      });
    });
  }, []);

  async function handleBannerUpdate(e) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      custom_banner_enabled: settings.enabled ? "true" : "false",
      custom_banner_text: settings.text || null,
      custom_banner_bg_color: settings.bgColor || null,
      custom_banner_text_color: settings.textColor || null,
      custom_banner_link: settings.link || null,
      custom_banner_link_text: settings.linkText || null,
      custom_banner_reappear_hours: settings.reappearHours || null,
    });
    showToast("Banner settings updated! Refresh to see changes.", "success", {
      clear: true,
    });
    setHasChanges(false);
    return;
  }

  return (
    <form
      className="flex flex-col gap-y-4 my-4 border-t border-white border-opacity-20 light:border-black/20 pt-6"
      onChange={() => setHasChanges(true)}
      onSubmit={handleBannerUpdate}
    >
      <div className="flex flex-col gap-y-2">
        <p className="text-sm leading-6 font-semibold text-white">
          Custom Banner
        </p>
        <p className="text-xs text-white/60">
          Display a custom banner message at the top of all authenticated pages.
        </p>
      </div>

      <div className="flex items-center gap-x-2">
        <input
          type="checkbox"
          id="banner-enabled"
          checked={settings.enabled}
          onChange={(e) => {
            setSettings((prev) => ({ ...prev, enabled: e.target.checked }));
          }}
          className="w-4 h-4 rounded border-gray-300 text-primary-button focus:ring-primary-button"
        />
        <label htmlFor="banner-enabled" className="text-sm text-white">
          Enable custom banner
        </label>
      </div>

      {settings.enabled && (
        <>
          <div className="flex flex-col gap-y-2">
            <label className="text-sm font-medium text-white">
              Banner Message
            </label>
            <input
              type="text"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4"
              placeholder="Important announcement or message"
              value={settings.text}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, text: e.target.value }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <div className="flex flex-col gap-y-2">
              <label className="text-sm font-medium text-white">
                Background Color
              </label>
              <div className="flex items-center gap-x-2">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      bgColor: e.target.value,
                    }));
                  }}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.bgColor}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      bgColor: e.target.value,
                    }));
                  }}
                  className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block flex-1 py-2 px-4"
                  placeholder="#46c8ff"
                />
              </div>
            </div>

            <div className="flex flex-col gap-y-2">
              <label className="text-sm font-medium text-white">
                Text Color
              </label>
              <div className="flex items-center gap-x-2">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      textColor: e.target.value,
                    }));
                  }}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      textColor: e.target.value,
                    }));
                  }}
                  className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block flex-1 py-2 px-4"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <label className="text-sm font-medium text-white">
              Optional Link URL
            </label>
            <input
              type="text"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4"
              placeholder="https://example.com or mailto:email@example.com"
              value={settings.link}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, link: e.target.value }));
              }}
            />
            <p className="text-xs text-white/60">
              Supports URLs (https://) and mailto: links
            </p>
          </div>

          {settings.link && (
            <div className="flex flex-col gap-y-2">
              <label className="text-sm font-medium text-white">
                Link Text
              </label>
              <input
                type="text"
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4"
                placeholder="Learn more"
                value={settings.linkText}
                onChange={(e) => {
                  setSettings((prev) => ({
                    ...prev,
                    linkText: e.target.value,
                  }));
                }}
              />
            </div>
          )}

          <div className="flex flex-col gap-y-2">
            <label className="text-sm font-medium text-white">
              Auto-Reappear Timer (hours)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4"
              placeholder="24"
              value={settings.reappearHours}
              onChange={(e) => {
                setSettings((prev) => ({
                  ...prev,
                  reappearHours: e.target.value,
                }));
              }}
            />
            <p className="text-xs text-white/60">
              Number of hours after dismissal before the banner reappears. Leave empty for permanent dismissal (until message changes).
            </p>
          </div>

          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: settings.bgColor,
              color: settings.textColor,
            }}
          >
            <div className="flex items-center gap-x-2">
              <span className="text-sm font-medium">
                {settings.text || "Preview your banner message here"}
              </span>
              {settings.link && settings.linkText && (
                <span
                  className="text-sm font-semibold underline"
                  style={{ color: settings.textColor }}
                >
                  {settings.linkText}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {hasChanges && (
        <button
          type="submit"
          className="transition-all w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          Save Banner Settings
        </button>
      )}
    </form>
  );
}
