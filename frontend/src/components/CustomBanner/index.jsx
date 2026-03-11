import { useEffect, useState } from "react";
import System from "@/models/system";
import { X } from "@phosphor-icons/react";

export default function CustomBanner() {
  const [banner, setBanner] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBannerSettings() {
      try {
        const settings = await System.fetchBannerSettings();
        const timerHours = await System.fetchBannerTimer();
        
        if (settings.enabled && settings.text) {
          const bannerContent = JSON.stringify({
            text: settings.text,
            bgColor: settings.bgColor,
            textColor: settings.textColor,
            link: settings.link,
            linkText: settings.linkText,
          });
          const hash = Array.from(bannerContent)
            .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
            .toString(36);
          const dismissalKey = `banner_dismissed_${hash}`;
          const dismissalData = localStorage.getItem(dismissalKey);
          
          let shouldShow = true;
          if (dismissalData) {
            try {
              const parsed = JSON.parse(dismissalData);
              if (parsed.timestamp && timerHours !== null) {
                const hoursSinceDismissal = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
                shouldShow = hoursSinceDismissal >= timerHours;
              } else if (timerHours === null) {
                shouldShow = false;
              }
            } catch {
              shouldShow = timerHours !== null;
            }
          }
          
          setIsDismissed(!shouldShow);
          setBanner({ ...settings, dismissalKey, timerHours });
        }
      } catch (error) {
        console.error("Error fetching banner settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBannerSettings();
  }, []);

  const handleDismiss = () => {
    if (banner?.dismissalKey) {
      const dismissalData = JSON.stringify({
        dismissed: true,
        timestamp: Date.now()
      });
      localStorage.setItem(banner.dismissalKey, dismissalData);
      setIsDismissed(true);
    }
  };

  if (loading || !banner || isDismissed) return null;

  const bgColor = banner.bgColor || "#46c8ff";
  const textColor = banner.textColor || "#ffffff";

  return (
    <div
      className="w-full flex items-center justify-center px-4 py-3 relative"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex items-center gap-x-2 max-w-7xl mx-auto">
        <span className="text-sm font-medium">{banner.text}</span>
        {banner.link && banner.linkText && (
          <a
            href={banner.link}
            className="text-sm font-semibold underline hover:opacity-80 transition-opacity"
            style={{ color: textColor }}
            target={
              banner.link.startsWith("http") ? "_blank" : undefined
            }
            rel={
              banner.link.startsWith("http")
                ? "noopener noreferrer"
                : undefined
            }
          >
            {banner.linkText}
          </a>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-4 p-1 hover:opacity-70 transition-opacity"
        aria-label="Dismiss banner"
      >
        <X size={18} weight="bold" style={{ color: textColor }} />
      </button>
    </div>
  );
}
