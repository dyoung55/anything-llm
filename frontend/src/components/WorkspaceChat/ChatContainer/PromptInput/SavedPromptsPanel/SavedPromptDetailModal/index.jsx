import { useState } from "react";
import { X, ArrowsOut } from "@phosphor-icons/react";
import ModalWrapper from "@/components/ModalWrapper";
import ExpandedFieldModal from "@/components/ExpandedFieldModal";
import { PROMPT_INPUT_EVENT } from "../../index";

export default function SavedPromptDetailModal({ savedPrompt, onClose }) {
  const { name, prompt, exampleResponse } = savedPrompt;
  const [expandedField, setExpandedField] = useState(null);

  const pastePrompt = () => {
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: prompt, writeMode: "replace" },
      })
    );
    onClose();
  };

  const pasteWithExample = () => {
    const formatted = `${prompt}\nWhen responding use the following format:\n${exampleResponse}`;
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: formatted, writeMode: "replace" },
      })
    );
    onClose();
  };

  return (
    <>
      <ModalWrapper isOpen={true}>
        <div className="w-full max-w-3xl bg-theme-bg-secondary rounded-lg shadow border-2 border-theme-modal-border overflow-hidden">
          <div className="relative p-6 border-b rounded-t border-theme-modal-border">
            <h3 className="text-xl font-semibold text-white overflow-hidden overflow-ellipsis whitespace-nowrap pr-8">
              {name}
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
            <div className="py-7 px-9 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Prompt
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
                    readOnly
                    value={prompt}
                    rows={6}
                    className="border-none bg-theme-settings-input-bg w-full text-white text-sm rounded-b-lg rounded-t-none outline-none block p-2.5 resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-white">
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
                    readOnly
                    value={exampleResponse}
                    rows={10}
                    className="border-none bg-theme-settings-input-bg w-full text-white text-sm rounded-b-lg rounded-t-none outline-none block p-2.5 resize-none"
                  />
                </div>
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
              onClick={pastePrompt}
              type="button"
              className="transition-all duration-300 bg-theme-action-menu-bg border border-theme-modal-border text-white hover:opacity-80 px-4 py-2 rounded-lg text-sm"
            >
              Paste Prompt
            </button>
            <button
              onClick={pasteWithExample}
              type="button"
              className="transition-all duration-300 bg-white text-black hover:opacity-60 px-4 py-2 rounded-lg text-sm"
            >
              Paste with Example
            </button>
          </div>
        </div>
      </ModalWrapper>

      {expandedField === "prompt" && (
        <ExpandedFieldModal
          label="Prompt"
          value={prompt}
          onClose={() => setExpandedField(null)}
        />
      )}
      {expandedField === "response" && (
        <ExpandedFieldModal
          label="Example Response"
          value={exampleResponse}
          onClose={() => setExpandedField(null)}
        />
      )}
    </>
  );
}
