import { useEffect, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function CustomSiteSettings() {
  const { t } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    title: null,
    faviconUrl: null,
    description: null,
    ogImage: null,
    ogUrl: null,
  });

  useEffect(() => {
    Admin.systemPreferencesByFields([
      "meta_page_title",
      "meta_page_favicon",
      "meta_page_description",
      "meta_page_og_image",
      "meta_page_og_url",
    ]).then(({ settings }) => {
      setSettings({
        title: settings?.meta_page_title,
        faviconUrl: settings?.meta_page_favicon,
        description: settings?.meta_page_description,
        ogImage: settings?.meta_page_og_image,
        ogUrl: settings?.meta_page_og_url,
      });
    });
  }, []);

  async function handleSiteSettingUpdate(e) {
    e.preventDefault();
    await Admin.updateSystemPreferences({
      meta_page_title: settings.title ?? null,
      meta_page_favicon: settings.faviconUrl ?? null,
      meta_page_description: settings.description ?? null,
      meta_page_og_image: settings.ogImage ?? null,
      meta_page_og_url: settings.ogUrl ?? null,
    });
    showToast(
      "Site preferences updated! They will reflect on page reload.",
      "success",
      { clear: true }
    );
    setHasChanges(false);
    return;
  }

  return (
    <form
      className="flex flex-col gap-y-0.5 my-4 border-t border-white border-opacity-20 light:border-black/20 pt-6"
      onChange={() => setHasChanges(true)}
      onSubmit={handleSiteSettingUpdate}
    >
      <p className="text-sm leading-6 font-semibold text-white">
        {t("customization.items.browser-appearance.title")}
      </p>
      <p className="text-xs text-white/60">
        {t("customization.items.browser-appearance.description")}
      </p>

      <div className="w-fit">
        <p className="text-sm leading-6 font-medium text-white mt-2">
          {t("customization.items.browser-appearance.tab.title")}
        </p>
        <p className="text-xs text-white/60">
          {t("customization.items.browser-appearance.tab.description")}
        </p>
        <div className="flex items-center gap-x-4">
          <input
            name="meta_page_title"
            type="text"
            className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
            placeholder="AnythingLLM | Your personal LLM trained on anything"
            autoComplete="off"
            onChange={(e) => {
              setSettings((prev) => {
                return { ...prev, title: e.target.value };
              });
            }}
            value={
              settings.title ??
              "AnythingLLM | Your personal LLM trained on anything"
            }
          />
        </div>
      </div>

      <div className="w-fit">
        <p className="text-sm leading-6 font-medium text-white mt-2">
          {t("customization.items.browser-appearance.favicon.title")}
        </p>
        <p className="text-xs text-white/60">
          {t("customization.items.browser-appearance.favicon.description")}
        </p>
        <div className="flex items-center gap-x-2">
          <img
            src={settings.faviconUrl ?? "/favicon.png"}
            onError={(e) => (e.target.src = "/favicon.png")}
            className="h-10 w-10 rounded-lg mt-2"
            alt="Site favicon"
          />
          <input
            name="meta_page_favicon"
            type="url"
            className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-fit py-2 px-4"
            placeholder="url to your image"
            onChange={(e) => {
              setSettings((prev) => {
                return { ...prev, faviconUrl: e.target.value };
              });
            }}
            autoComplete="off"
            value={settings.faviconUrl ?? ""}
          />
        </div>
      </div>

      <div className="w-full mt-4">
        <p className="text-sm leading-6 font-medium text-white">
          Meta Description
        </p>
        <p className="text-xs text-white/60">
          Description shown in search results and social media previews
          (recommended: 150-160 characters)
        </p>
        <textarea
          name="meta_page_description"
          rows={3}
          className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4 resize-none"
          placeholder="A brief description of your site"
          onChange={(e) => {
            setSettings((prev) => {
              return { ...prev, description: e.target.value };
            });
          }}
          autoComplete="off"
          value={settings.description ?? ""}
        />
      </div>

      <div className="w-full mt-4">
        <p className="text-sm leading-6 font-medium text-white">
          Open Graph Image URL
        </p>
        <p className="text-xs text-white/60">
          Image shown when sharing on social media (recommended: 1200x630px)
        </p>
        <div className="flex items-start gap-x-2 mt-2">
          {settings.ogImage && (
            <img
              src={settings.ogImage}
              onError={(e) => (e.target.style.display = "none")}
              className="h-20 w-auto rounded-lg"
              alt="Open Graph preview"
            />
          )}
          <input
            name="meta_page_og_image"
            type="url"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block flex-1 py-2 px-4"
            placeholder="https://example.com/image.png"
            onChange={(e) => {
              setSettings((prev) => {
                return { ...prev, ogImage: e.target.value };
              });
            }}
            autoComplete="off"
            value={settings.ogImage ?? ""}
          />
        </div>
      </div>

      <div className="w-full mt-4">
        <p className="text-sm leading-6 font-medium text-white">
          Open Graph URL
        </p>
        <p className="text-xs text-white/60">
          Your custom domain URL (e.g., https://d-mind.deacerousa.com)
        </p>
        <input
          name="meta_page_og_url"
          type="url"
          className="border-none bg-theme-settings-input-bg mt-2 text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full py-2 px-4"
          placeholder="https://your-domain.com"
          onChange={(e) => {
            setSettings((prev) => {
              return { ...prev, ogUrl: e.target.value };
            });
          }}
          autoComplete="off"
          value={settings.ogUrl ?? ""}
        />
      </div>

      {hasChanges && (
        <button
          type="submit"
          className="transition-all mt-4 w-fit duration-300 border border-slate-200 px-5 py-2.5 rounded-lg text-white text-sm items-center flex gap-x-2 hover:bg-slate-200 hover:text-slate-800 focus:ring-gray-800"
        >
          Save
        </button>
      )}
    </form>
  );
}
