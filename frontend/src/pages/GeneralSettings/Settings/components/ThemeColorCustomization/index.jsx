import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { CaretDown, CaretUp } from "@phosphor-icons/react";

const DEFAULT_COLORS = {
  dark: {
    "--theme-bg-primary": "#0e0f0f",
    "--theme-bg-secondary": "#1b1b1e",
    "--theme-bg-sidebar": "#0e0f0f",
    "--theme-bg-container": "#0e0f0f",
    "--theme-bg-chat": "#1b1b1e",
    "--theme-bg-chat-input": "#27282a",
    "--theme-text-primary": "#ffffff",
    "--theme-text-secondary": "rgba(255, 255, 255, 0.6)",
    "--theme-placeholder": "#57585a",
    "--theme-sidebar-item-hover": "#3f3f42",
    "--theme-sidebar-border": "rgba(255, 255, 255, 0.1)",
    "--theme-button-primary": "#46c8ff",
    "--theme-settings-input-bg": "#0e0f0f",
  },
  light: {
    "--theme-bg-primary": "#ffffff",
    "--theme-bg-secondary": "#ffffff",
    "--theme-bg-sidebar": "#edf2fa",
    "--theme-bg-container": "#f9fbfd",
    "--theme-bg-chat": "#ffffff",
    "--theme-bg-chat-input": "#eaeaea",
    "--theme-text-primary": "#0e0f0f",
    "--theme-text-secondary": "#7a7d7e",
    "--theme-placeholder": "#9ca3af",
    "--theme-sidebar-item-hover": "#c8efff",
    "--theme-sidebar-border": "#d3d4d4",
    "--theme-button-primary": "#0ba5ec",
    "--theme-settings-input-bg": "#edf2fa",
  },
};

const COLOR_CATEGORIES = {
  Backgrounds: [
    { key: "--theme-bg-primary", label: "Primary Background" },
    { key: "--theme-bg-secondary", label: "Secondary Background" },
    { key: "--theme-bg-sidebar", label: "Sidebar Background" },
    { key: "--theme-bg-container", label: "Container Background" },
    { key: "--theme-bg-chat", label: "Chat Background" },
    { key: "--theme-bg-chat-input", label: "Chat Input Background" },
  ],
  Text: [
    { key: "--theme-text-primary", label: "Primary Text" },
    { key: "--theme-text-secondary", label: "Secondary Text" },
    { key: "--theme-placeholder", label: "Placeholder Text" },
  ],
  Sidebar: [
    { key: "--theme-sidebar-item-hover", label: "Sidebar Item Hover" },
    { key: "--theme-sidebar-border", label: "Sidebar Border" },
  ],
  Buttons: [
    { key: "--theme-button-primary", label: "Primary Button" },
  ],
  Inputs: [
    { key: "--theme-settings-input-bg", label: "Input Background" },
  ],
};

function ColorPicker({ label, value, onChange }) {
  const hexValue = rgbaToHex(value);

  return (
    <div className="flex flex-col gap-y-1">
      <label className="text-xs text-white/80">{label}</label>
      <div className="flex items-center gap-x-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-white/20"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-xs rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block flex-1 py-2 px-3"
          placeholder={hexValue}
        />
      </div>
    </div>
  );
}

function rgbaToHex(color) {
  if (!color) return "#000000";
  if (color.startsWith("#")) return color;
  if (color.startsWith("rgba")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, "0");
      const g = parseInt(match[2]).toString(16).padStart(2, "0");
      const b = parseInt(match[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  return "#000000";
}

export default function ThemeColorCustomization() {
  const [hasChanges, setHasChanges] = useState(false);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [darkExpanded, setDarkExpanded] = useState(false);
  const [lightExpanded, setLightExpanded] = useState(false);

  useEffect(() => {
    Admin.systemPreferencesByFields(["custom_theme_colors"]).then(
      ({ settings }) => {
        if (settings?.custom_theme_colors) {
          try {
            const parsed = JSON.parse(settings.custom_theme_colors);
            setColors(parsed);
          } catch (e) {
            console.error("Error parsing custom theme colors:", e);
          }
        }
      }
    );
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      custom_theme_colors: JSON.stringify(colors),
    });
    showToast(
      "Theme colors updated! Refresh the page to see changes.",
      "success",
      { clear: true }
    );
    localStorage.removeItem("custom_theme_colors");
    setHasChanges(false);
  }

  function handleColorChange(theme, key, value) {
    setColors((prev) => ({
      ...prev,
      [theme]: {
        ...prev[theme],
        [key]: value,
      },
    }));
    setHasChanges(true);
  }

  function resetTheme(theme) {
    setColors((prev) => ({
      ...prev,
      [theme]: DEFAULT_COLORS[theme],
    }));
    setHasChanges(true);
  }

  return (
    <form
      className="flex flex-col gap-y-4 my-4 border-t border-white border-opacity-20 light:border-black/20 pt-6"
      onSubmit={handleSave}
    >
      <div className="flex flex-col gap-y-2">
        <p className="text-sm leading-6 font-semibold text-white">
          Theme Colors
        </p>
        <p className="text-xs text-white/60">
          Customize the color palette for both light and dark themes. Changes
          will apply after page refresh.
        </p>
      </div>

      <div className="flex flex-col gap-y-3">
        <button
          type="button"
          onClick={() => setDarkExpanded(!darkExpanded)}
          className="flex items-center justify-between w-full px-4 py-3 bg-theme-settings-input-bg rounded-lg hover:bg-theme-settings-input-active transition-colors"
        >
          <span className="text-sm font-medium text-white">
            Dark Mode Colors
          </span>
          {darkExpanded ? (
            <CaretUp size={20} className="text-white" />
          ) : (
            <CaretDown size={20} className="text-white" />
          )}
        </button>

        {darkExpanded && (
          <div className="flex flex-col gap-y-4 px-4 pb-4">
            {Object.entries(COLOR_CATEGORIES).map(([category, colorKeys]) => (
              <div key={category} className="flex flex-col gap-y-2">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {colorKeys.map(({ key, label }) => (
                    <ColorPicker
                      key={key}
                      label={label}
                      value={colors.dark[key]}
                      onChange={(value) =>
                        handleColorChange("dark", key, value)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => resetTheme("dark")}
              className="text-xs text-primary-button hover:underline self-start"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-y-3">
        <button
          type="button"
          onClick={() => setLightExpanded(!lightExpanded)}
          className="flex items-center justify-between w-full px-4 py-3 bg-theme-settings-input-bg rounded-lg hover:bg-theme-settings-input-active transition-colors"
        >
          <span className="text-sm font-medium text-white">
            Light Mode Colors
          </span>
          {lightExpanded ? (
            <CaretUp size={20} className="text-white" />
          ) : (
            <CaretDown size={20} className="text-white" />
          )}
        </button>

        {lightExpanded && (
          <div className="flex flex-col gap-y-4 px-4 pb-4">
            {Object.entries(COLOR_CATEGORIES).map(([category, colorKeys]) => (
              <div key={category} className="flex flex-col gap-y-2">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {colorKeys.map(({ key, label }) => (
                    <ColorPicker
                      key={key}
                      label={label}
                      value={colors.light[key]}
                      onChange={(value) =>
                        handleColorChange("light", key, value)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => resetTheme("light")}
              className="text-xs text-primary-button hover:underline self-start"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {hasChanges && (
        <button
          type="submit"
          className="transition-all w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          Save Theme Colors
        </button>
      )}
    </form>
  );
}
