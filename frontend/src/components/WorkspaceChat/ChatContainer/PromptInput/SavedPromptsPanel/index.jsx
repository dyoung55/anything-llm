import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatText, X } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import System from "@/models/system";
import { PROMPT_INPUT_EVENT } from "../index";
import SavedPromptDetailModal from "./SavedPromptDetailModal";

export function SavedPromptsButton({ showing, setShowSavedPrompts }) {
  return (
    <>
      <button
        type="button"
        onClick={() => setShowSavedPrompts(!showing)}
        data-tooltip-id="saved-prompts-btn"
        data-tooltip-content="Saved Prompts"
        aria-label="Saved Prompts"
        className={`flex justify-center items-center opacity-60 hover:opacity-100 cursor-pointer ${
          showing ? "opacity-100" : ""
        }`}
      >
        <ChatText
          color="var(--theme-sidebar-footer-icon-fill)"
          size={20}
          weight={showing ? "fill" : "regular"}
        />
      </button>
      <Tooltip
        id="saved-prompts-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}

function SavedPromptItem({ savedPrompt, onPastePrompt, onPasteWithExample, onViewDetail }) {
  const promptSnippet =
    savedPrompt.prompt.length > 80
      ? savedPrompt.prompt.slice(0, 80) + "..."
      : savedPrompt.prompt;
  const responseSnippet =
    savedPrompt.exampleResponse.length > 80
      ? savedPrompt.exampleResponse.slice(0, 80) + "..."
      : savedPrompt.exampleResponse;

  return (
    <div className="flex flex-col gap-y-2 p-3 rounded-lg bg-theme-action-menu-item-hover light:bg-slate-200 cursor-pointer hover:opacity-90 transition-opacity">
      <div onClick={() => onViewDetail(savedPrompt)}>
        <p className="text-white light:text-slate-900 font-semibold text-sm truncate">
          {savedPrompt.name}
        </p>
        <p className="text-white/60 light:text-slate-700 text-xs mt-1 line-clamp-2">{promptSnippet}</p>
        <p className="text-white/40 light:text-slate-600 text-xs mt-0.5 line-clamp-2">
          {responseSnippet}
        </p>
      </div>
      <div className="flex gap-x-2 mt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPastePrompt(savedPrompt);
          }}
          className="flex-1 text-xs px-2 py-1 rounded bg-theme-action-menu-bg light:bg-slate-300 border border-theme-modal-border light:border-slate-400 text-white light:text-slate-900 hover:opacity-80 transition-opacity"
        >
          Paste Prompt
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPasteWithExample(savedPrompt);
          }}
          className="flex-1 text-xs px-2 py-1 rounded bg-white light:bg-slate-100 text-black light:text-slate-900 hover:opacity-70 transition-opacity"
        >
          Paste with Example
        </button>
      </div>
    </div>
  );
}

export default function SavedPromptsPanel({ showing, setShowing }) {
  const panelRef = useRef(null);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [detailPrompt, setDetailPrompt] = useState(null);

  useEffect(() => {
    if (!showing) return;
    System.getSavedPrompts().then(setSavedPrompts);
  }, [showing]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !detailPrompt
      ) {
        setShowing(false);
      }
    }
    if (showing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showing, detailPrompt, setShowing]);

  const pastePrompt = (savedPrompt) => {
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: savedPrompt.prompt, writeMode: "replace" },
      })
    );
    setShowing(false);
  };

  const pasteWithExample = (savedPrompt) => {
    const formatted = `${savedPrompt.prompt}\nWhen responding use the following format:\n${savedPrompt.exampleResponse}`;
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: formatted, writeMode: "replace" },
      })
    );
    setShowing(false);
  };

  return createPortal(
    <>
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full w-[380px] bg-theme-bg-secondary light:bg-slate-50 shadow-xl z-50 transform transition-transform duration-300 flex flex-col border-l border-theme-modal-border light:border-slate-200 ${
          showing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-theme-modal-border light:border-slate-200 flex-shrink-0">
          <h2 className="text-white light:text-slate-900 font-semibold text-base">Saved Prompts</h2>
          <button
            type="button"
            onClick={() => setShowing(false)}
            className="text-white light:text-slate-900 hover:opacity-60 transition-opacity"
            aria-label="Close saved prompts panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-y-3">
          {savedPrompts.length === 0 ? (
            <p className="text-white/50 light:text-slate-600 text-sm text-center mt-8">
              No saved prompts yet. Click the bookmark icon on any AI response to
              save a prompt.
            </p>
          ) : (
            savedPrompts.map((sp) => (
              <SavedPromptItem
                key={sp.id}
                savedPrompt={sp}
                onPastePrompt={pastePrompt}
                onPasteWithExample={pasteWithExample}
                onViewDetail={setDetailPrompt}
              />
            ))
          )}
        </div>
      </div>

      {detailPrompt && (
        <SavedPromptDetailModal
          savedPrompt={detailPrompt}
          onClose={() => {
            setDetailPrompt(null);
            setShowing(false);
          }}
        />
      )}
    </>,
    document.getElementById("root")
  );
}
