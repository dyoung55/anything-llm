import { X } from "@phosphor-icons/react";
import JsonEditor from "./index";

export default function JsonEditorModal({
  isOpen,
  onClose,
  initialValue,
  onSave,
  title,
  description,
  readOnly = false,
}) {
  if (!isOpen) return null;

  const handleSave = async (parsedJson) => {
    await onSave(parsedJson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-theme-bg-primary rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-theme-border">
          <h2 className="text-xl font-semibold text-theme-text-primary">
            {title || "Edit JSON Configuration"}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <JsonEditor
            initialValue={initialValue}
            onSave={handleSave}
            title={null}
            description={description}
            readOnly={readOnly}
          />
        </div>

        <div className="flex items-center justify-end gap-x-2 p-6 border-t border-theme-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-theme-bg-secondary text-theme-text-primary border border-theme-border rounded-lg hover:bg-theme-bg-primary transition-all"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
