import { useEffect, useState } from "react";
import { X, PencilSimple, Trash, CopySimple } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import System from "@/models/system";
import EditSavedPromptModal from "./EditSavedPromptModal";

export default function SavedPromptsManager({ hideModal }) {
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    System.getSavedPrompts().then(setSavedPrompts);
  }, []);

  const handleDelete = async (promptId) => {
    await System.deleteSavedPrompt(promptId);
    setSavedPrompts((prev) => prev.filter((p) => p.id !== promptId));
    setConfirmDelete(null);
  };

  const handleSaveEdit = (updated) => {
    setSavedPrompts((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (exists) return prev.map((p) => (p.id === updated.id ? updated : p));
      return [...prev, updated];
    });
    setEditingPrompt(null);
  };

  const handleDuplicate = (sp) => {
    setEditingPrompt({ ...sp, id: null, name: `Copy of ${sp.name}` });
  };

  return (
    <>
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-2xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
          <div className="relative p-6 border-b rounded-t border-theme-modal-border">
            <h3 className="text-xl font-semibold text-white">Saved Prompts</h3>
            <button
              onClick={hideModal}
              type="button"
              className="absolute top-4 right-4 transition-all duration-300 bg-transparent rounded-lg text-sm p-1 inline-flex items-center hover:bg-theme-modal-border hover:border-theme-modal-border hover:border-opacity-50 border-transparent border"
            >
              <X size={24} weight="bold" className="text-white" />
            </button>
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {savedPrompts.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-white/50 text-sm">
                  No saved prompts yet. Click the bookmark icon on any AI
                  response to save a prompt.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-theme-modal-border">
                {savedPrompts.map((sp) => (
                  <div
                    key={sp.id}
                    className="flex items-start justify-between gap-x-4 p-5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">
                        {sp.name}
                      </p>
                      <p className="text-white/60 text-xs mt-1 line-clamp-2">
                        {sp.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(sp)}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Duplicate saved prompt"
                        title="Duplicate"
                      >
                        <CopySimple size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPrompt(sp)}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Edit saved prompt"
                        title="Edit"
                      >
                        <PencilSimple size={18} />
                      </button>
                      {confirmDelete === sp.id ? (
                        <div className="flex items-center gap-x-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(sp.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs text-white/40 hover:text-white/60 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(sp.id)}
                          className="text-white/60 hover:text-red-400 transition-colors"
                          aria-label="Delete saved prompt"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full justify-end items-center p-6 border-t border-theme-modal-border rounded-b">
            <button
              onClick={hideModal}
              type="button"
              className="transition-all duration-300 bg-transparent text-white hover:opacity-60 px-4 py-2 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </ModalWrapper>

      {editingPrompt && (
        <EditSavedPromptModal
          savedPrompt={editingPrompt}
          onClose={() => setEditingPrompt(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  );
}
