import { useState } from "react";
import { X, ArrowsOut } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import ExpandedFieldModal from "@/components/ExpandedFieldModal";
import System from "@/models/system";

export default function EditSavedPromptModal({ savedPrompt, onClose, onSave }) {
  const isNew = !savedPrompt.id;
  const [name, setName] = useState(savedPrompt.name);
  const [prompt, setPrompt] = useState(savedPrompt.prompt);
  const [exampleResponse, setExampleResponse] = useState(
    savedPrompt.exampleResponse
  );
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedField, setExpandedField] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name for this saved prompt.");
      return;
    }
    setSaving(true);
    setError(null);
    let updated, saveError;
    if (isNew) {
      const result = await System.createSavedPrompt({
        name: name.trim(),
        prompt,
        exampleResponse,
      });
      updated = result.prompt;
      saveError = result.error;
    } else {
      const result = await System.updateSavedPrompt(savedPrompt.id, {
        name: name.trim(),
        prompt,
        exampleResponse,
      });
      updated = result.prompt;
      saveError = result.error;
    }
    setSaving(false);
    if (saveError && !updated) {
      setError(saveError || "Failed to save prompt.");
      return;
    }
    onSave(updated);
  };

  return (
    <>
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
          <div className="relative p-6 border-b rounded-t border-theme-modal-border">
            <h3 className="text-xl font-semibold text-white light:text-slate-900 overflow-hidden overflow-ellipsis whitespace-nowrap">
              {isNew ? "Duplicate Saved Prompt" : "Edit Saved Prompt"}
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
            >
              <X size={24} weight="bold" className="text-white light:text-slate-900" />
            </button>
          </div>
          <div
            className="h-full w-full overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <form onSubmit={handleSave}>
              <div className="py-7 px-9 space-y-4">
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                  <label
                    htmlFor="edit-prompt-name"
                    className="block mb-2 text-sm font-medium text-white light:text-slate-900"
                  >
                    Name
                  </label>
                  <input
                    id="edit-prompt-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                    required
                    className="border-none bg-theme-settings-input-bg light:bg-slate-100 w-full text-white light:text-slate-900 placeholder:text-theme-settings-input-placeholder light:placeholder:text-slate-500 text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-prompt-text"
                    className="block mb-2 text-sm font-medium text-white light:text-slate-900"
                  >
                    Your Prompt
                  </label>
                  <div className="flex flex-col">
                    <div className="flex justify-end items-center bg-theme-settings-input-bg light:bg-slate-100 rounded-t-lg px-2.5 py-1 border-b border-white/10 light:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setExpandedField("prompt")}
                        className="text-white/50 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors p-0.5 rounded light:hover:bg-slate-200"
                        title="Expand"
                      >
                        <ArrowsOut size={14} weight="bold" />
                      </button>
                    </div>
                    <textarea
                      id="edit-prompt-text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={6}
                      className="border-none bg-theme-settings-input-bg light:bg-slate-50 w-full text-white light:text-slate-900 placeholder:text-theme-settings-input-placeholder light:placeholder:text-slate-500 text-sm rounded-b-lg rounded-t-none focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 resize-none"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="edit-response-text"
                    className="block mb-2 text-sm font-medium text-white light:text-slate-900"
                  >
                    Example Response
                  </label>
                  <div className="flex flex-col">
                    <div className="flex justify-end items-center bg-theme-settings-input-bg light:bg-slate-100 rounded-t-lg px-2.5 py-1 border-b border-white/10 light:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setExpandedField("response")}
                        className="text-white/50 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors p-0.5 rounded light:hover:bg-slate-200"
                        title="Expand"
                      >
                        <ArrowsOut size={14} weight="bold" />
                      </button>
                    </div>
                    <textarea
                      id="edit-response-text"
                      value={exampleResponse}
                      onChange={(e) => setExampleResponse(e.target.value)}
                      rows={10}
                      className="border-none bg-theme-settings-input-bg light:bg-slate-50 w-full text-white light:text-slate-900 placeholder:text-theme-settings-input-placeholder light:placeholder:text-slate-500 text-sm rounded-b-lg rounded-t-none focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
                <button
                  onClick={onClose}
                  type="button"
                  className="transition-all duration-300 bg-transparent text-white light:text-slate-900 hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="transition-all duration-300 bg-white light:bg-slate-100 text-black light:text-slate-900 hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalWrapper>

      {expandedField === "prompt" && (
        <ExpandedFieldModal
          label="Your Prompt"
          value={prompt}
          onChange={setPrompt}
          onClose={() => setExpandedField(null)}
        />
      )}
      {expandedField === "response" && (
        <ExpandedFieldModal
          label="Example Response"
          value={exampleResponse}
          onChange={setExampleResponse}
          onClose={() => setExpandedField(null)}
        />
      )}
    </>
  );
}
