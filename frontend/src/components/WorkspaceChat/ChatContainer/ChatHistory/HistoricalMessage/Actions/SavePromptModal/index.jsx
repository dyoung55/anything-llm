import { useState } from "react";
import { X, ArrowsOut } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import ExpandedFieldModal from "@/components/ExpandedFieldModal";
import System from "@/models/system";

export default function SavePromptModal({ prompt, response, onClose }) {
  const [name, setName] = useState("");
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [editedResponse, setEditedResponse] = useState(response);
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
    const { prompt: saved, error: saveError } = await System.createSavedPrompt({
      name: name.trim(),
      prompt: editedPrompt,
      exampleResponse: editedResponse,
    });
    setSaving(false);
    if (saveError && !saved) {
      setError(saveError || "Failed to save prompt.");
      return;
    }
    onClose();
  };

  return (
    <>
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
          <div className="relative p-6 border-b rounded-t border-theme-modal-border">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap">
              Save Prompt
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
            >
              <X size={24} weight="bold" className="text-white" />
            </button>
          </div>
          <div
            className="h-full w-full overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            <form onSubmit={handleSave}>
              <div className="py-7 px-9 space-y-4 flex-col">
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                  <label
                    htmlFor="save-prompt-name"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    Name
                  </label>
                  <input
                    id="save-prompt-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name this prompt"
                    autoComplete="off"
                    required
                    className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block p-2.5"
                  />
                </div>
                <div>
                  <label
                    htmlFor="save-prompt-text"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    Your Prompt
                  </label>
                  <div className="flex flex-col">
                    <div className="flex justify-end items-center bg-theme-settings-input-bg rounded-t-lg px-2.5 py-1 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => setExpandedField("prompt")}
                        className="text-white/50 hover:text-white transition-colors p-0.5 rounded"
                        title="Expand"
                      >
                        <ArrowsOut size={14} />
                      </button>
                    </div>
                    <textarea
                      id="save-prompt-text"
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      rows={6}
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-b-lg rounded-t-none focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 resize-none"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="save-response-text"
                    className="block mb-2 text-sm font-medium text-white"
                  >
                    Example Response
                  </label>
                  <div className="flex flex-col">
                    <div className="flex justify-end items-center bg-theme-settings-input-bg rounded-t-lg px-2.5 py-1 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => setExpandedField("response")}
                        className="text-white/50 hover:text-white transition-colors p-0.5 rounded"
                        title="Expand"
                      >
                        <ArrowsOut size={14} />
                      </button>
                    </div>
                    <textarea
                      id="save-response-text"
                      value={editedResponse}
                      onChange={(e) => setEditedResponse(e.target.value)}
                      rows={10}
                      className="border-none bg-theme-settings-input-bg w-full text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-b-lg rounded-t-none focus:outline-primary-button active:outline-primary-button outline-none block p-2.5 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex w-full justify-end items-center p-6 space-x-2 border-t border-theme-modal-border rounded-b">
                <button
                  onClick={onClose}
                  type="button"
                  className="transition-all duration-300 bg-transparent text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
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
          value={editedPrompt}
          onChange={setEditedPrompt}
          onClose={() => setExpandedField(null)}
        />
      )}
      {expandedField === "response" && (
        <ExpandedFieldModal
          label="Example Response"
          value={editedResponse}
          onChange={setEditedResponse}
          onClose={() => setExpandedField(null)}
        />
      )}
    </>
  );
}
