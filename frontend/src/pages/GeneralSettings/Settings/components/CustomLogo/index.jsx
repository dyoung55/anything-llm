import useLogo from "@/hooks/useLogo";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useEffect, useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { REFETCH_LOGO_EVENT } from "@/LogoContext";
import { API_BASE } from "@/utils/constants";

function LogoUploadSection({ 
  title, 
  description, 
  logo, 
  isDefault, 
  onUpload, 
  onRemove,
  inputRef 
}) {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-white/60">{description}</p>
      
      {isDefault ? (
        <label className="mt-2 transition-all duration-300 hover:opacity-60">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            ref={inputRef}
          />
          <div className="w-80 py-4 bg-theme-settings-input-bg rounded-2xl border-2 border-dashed border-theme-text-secondary border-opacity-60 justify-center items-center inline-flex cursor-pointer">
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full bg-white/40">
                <Plus className="w-6 h-6 text-black/80 m-2" />
              </div>
              <div className="text-theme-text-primary text-opacity-80 text-sm font-semibold py-1">
                {t("customization.items.logo.add")}
              </div>
              <div className="text-theme-text-secondary text-opacity-60 text-xs font-medium py-1">
                {t("customization.items.logo.recommended")}
              </div>
            </div>
          </div>
        </label>
      ) : (
        <div className="group w-80 h-[130px] mt-2 overflow-hidden relative">
          <img
            src={logo}
            alt={title}
            className="w-full h-full object-cover border-2 border-theme-text-secondary border-opacity-60 p-1 rounded-2xl"
          />
          <div className="absolute w-full top-0 left-0 right-0 bottom-0 flex flex-col gap-y-3 justify-center items-center rounded-2xl bg-black bg-opacity-80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out border-2 border-transparent hover:border-white">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-[#FFFFFF] text-base font-medium hover:text-opacity-60 mx-2"
            >
              {t("customization.items.logo.replace")}
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
              ref={inputRef}
            />
            <button
              onClick={onRemove}
              className="text-[#FFFFFF] text-base font-medium hover:text-opacity-60 mx-2"
            >
              {t("customization.items.logo.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomLogo() {
  const { t } = useTranslation();
  const { logo: _initLogo, setLogo: _setLogo } = useLogo();
  const [darkLogo, setDarkLogo] = useState("");
  const [lightLogo, setLightLogo] = useState("");
  const [isDefaultDarkLogo, setIsDefaultDarkLogo] = useState(true);
  const [isDefaultLightLogo, setIsDefaultLightLogo] = useState(true);
  const darkFileInputRef = useRef(null);
  const lightFileInputRef = useRef(null);

  useEffect(() => {
    async function logoInit() {
      const _isDefaultLogo = await System.isDefaultLogo();
      setIsDefaultDarkLogo(_isDefaultLogo);
      
      const darkLogoData = await System.fetchLogo();
      setDarkLogo(darkLogoData.logoURL || "");
      
      const lightLogoResponse = await fetch(`${API_BASE}/system/logo?theme=light`, {
        method: "GET",
        cache: "no-cache",
      });
      if (lightLogoResponse.ok && lightLogoResponse.status !== 204) {
        const blob = await lightLogoResponse.blob();
        const lightLogoURL = URL.createObjectURL(blob);
        setLightLogo(lightLogoURL);
        const isCustomLight = lightLogoResponse.headers.get("X-Is-Custom-Logo") === "true";
        setIsDefaultLightLogo(!isCustomLight);
      }
    }
    logoInit();
  }, []);

  const handleDarkLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const objectURL = URL.createObjectURL(file);
    setDarkLogo(objectURL);

    const formData = new FormData();
    formData.append("logo", file);
    const { success, error } = await System.uploadLogo(formData);
    if (!success) {
      showToast(`Failed to upload dark mode logo: ${error}`, "error");
      return;
    }

    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
    showToast("Dark mode logo uploaded successfully.", "success");
    setIsDefaultDarkLogo(false);
  };

  const handleLightLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return false;

    const objectURL = URL.createObjectURL(file);
    setLightLogo(objectURL);

    const formData = new FormData();
    formData.append("logo", file);
    const { success, error } = await System.uploadLogoLight(formData);
    if (!success) {
      showToast(`Failed to upload light mode logo: ${error}`, "error");
      return;
    }

    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
    showToast("Light mode logo uploaded successfully.", "success");
    setIsDefaultLightLogo(false);
  };

  const handleRemoveDarkLogo = async () => {
    const { success, error } = await System.removeCustomLogo();
    if (!success) {
      showToast(`Failed to remove dark mode logo: ${error}`, "error");
      return;
    }

    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
    showToast("Dark mode logo removed successfully.", "success");
    setIsDefaultDarkLogo(true);
    
    const darkLogoData = await System.fetchLogo();
    setDarkLogo(darkLogoData.logoURL || "");
  };

  const handleRemoveLightLogo = async () => {
    const { success, error } = await System.removeCustomLogoLight();
    if (!success) {
      showToast(`Failed to remove light mode logo: ${error}`, "error");
      return;
    }

    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
    showToast("Light mode logo removed successfully.", "success");
    setIsDefaultLightLogo(true);
    
    const lightLogoResponse = await fetch(`${API_BASE}/system/logo?theme=light`, {
      method: "GET",
      cache: "no-cache",
    });
    if (lightLogoResponse.ok && lightLogoResponse.status !== 204) {
      const blob = await lightLogoResponse.blob();
      const lightLogoURL = URL.createObjectURL(blob);
      setLightLogo(lightLogoURL);
    }
  };

  return (
    <div className="flex flex-col gap-y-4 my-4">
      <div className="flex flex-col gap-y-0.5">
        <p className="text-sm leading-6 font-semibold text-white">
          {t("customization.items.logo.title")}
        </p>
        <p className="text-xs text-white/60">
          {t("customization.items.logo.description")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <LogoUploadSection
          title="Dark Mode Logo"
          description="Logo displayed when using dark theme"
          logo={darkLogo}
          isDefault={isDefaultDarkLogo}
          onUpload={handleDarkLogoUpload}
          onRemove={handleRemoveDarkLogo}
          inputRef={darkFileInputRef}
        />
        
        <LogoUploadSection
          title="Light Mode Logo"
          description="Logo displayed when using light theme"
          logo={lightLogo}
          isDefault={isDefaultLightLogo}
          onUpload={handleLightLogoUpload}
          onRemove={handleRemoveLightLogo}
          inputRef={lightFileInputRef}
        />
      </div>
    </div>
  );
}
