import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/**
 * Full-screen overlay modal for editing or viewing a single text field.
 * Renders above the current modal via a portal.
 *
 * Props:
 *   label    - field label shown in header
 *   value    - current text value
 *   onChange - setter fn (string) => void, omit for read-only
 *   onClose  - called when the user closes / clicks Done
 */
export default function ExpandedFieldModal({ label, value, onChange, onClose }) {
  const readOnly = !onChange;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div className="w-full h-full max-w-6xl flex flex-col bg-theme-bg-secondary rounded-lg border-2 border-theme-modal-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-modal-border flex-shrink-0">
          <h4 className="text-white font-semibold">{label}</h4>
          <button
            type="button"
            onClick={onClose}
            className="transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border border-transparent border"
          >
            <X size={22} weight="bold" className="text-white" />
          </button>
        </div>

        <div className="flex-1 p-4 min-h-0">
          <textarea
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            readOnly={readOnly}
            className="w-full h-full bg-theme-settings-input-bg text-white text-sm rounded-lg outline-none p-3 resize-none border-none"
          />
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-theme-modal-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.getElementById("root")
  );
}
