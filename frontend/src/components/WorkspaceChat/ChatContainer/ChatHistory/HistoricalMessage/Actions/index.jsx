import React, { memo, useRef, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import {
  Check,
  ThumbsUp,
  ThumbsDown,
  ArrowsClockwise,
  Copy,
  FloppyDisk,
  X,
} from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { EditMessageAction } from "./EditMessage";
import RenderMetrics from "./RenderMetrics";
import ActionMenu from "./ActionMenu";
import { useTranslation } from "react-i18next";
import SavePromptModal from "./SavePromptModal";

const Actions = ({
  message,
  feedbackScore,
  chatId,
  slug,
  isLastMessage,
  regenerateMessage,
  forkThread,
  isEditing,
  role,
  metrics = {},
  alignmentCls = "",
  userPrompt = "",
}) => {
  const { t } = useTranslation();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleThumbsUp = async () => {
    const updatedFeedback = selectedFeedback === true ? null : true;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback, null);
    setSelectedFeedback(updatedFeedback);
  };

  const handleThumbsDownClick = () => {
    if (selectedFeedback === false) {
      // Toggle off — clear rating without a comment
      Workspace.updateChatFeedback(chatId, slug, null, null);
      setSelectedFeedback(null);
    } else {
      setShowCommentModal(true);
    }
  };

  const handleCommentSubmit = async (comment) => {
    await Workspace.updateChatFeedback(chatId, slug, false, comment);
    setSelectedFeedback(false);
    setShowCommentModal(false);
  };

  return (
    <div
      className={`flex w-full flex-wrap items-center gap-y-1 ${role === "user" ? "justify-end" : "justify-between"}`}
    >
      <div className="flex justify-start items-center gap-x-[8px]">
        {role !== "user" && (
          <SavePromptButton
            userPrompt={userPrompt}
            response={message}
          />
        )}
        <div className="flex justify-start items-center gap-x-[8px]">
          <div
            className={`flex justify-start items-center gap-x-[8px] ${role === "user" ? "flex-row-reverse" : ""}`}
          >
            <CopyMessage message={message} />
            <EditMessageAction
              chatId={chatId}
              role={role}
              isEditing={isEditing}
            />
          </div>
          {isLastMessage && !isEditing && (
            <RegenerateMessage
              regenerateMessage={regenerateMessage}
              slug={slug}
              chatId={chatId}
            />
          )}
          {chatId && role !== "user" && !isEditing && (
            <>
              <FeedbackButton
                isSelected={selectedFeedback === true}
                handleFeedback={handleThumbsUp}
                tooltipId={`feedback-up-${chatId}`}
                tooltipContent={t("chat_window.good_response")}
                IconComponent={ThumbsUp}
                selectedColor="text-green-400"
              />
              <FeedbackButton
                isSelected={selectedFeedback === false}
                handleFeedback={handleThumbsDownClick}
                tooltipId={`feedback-down-${chatId}`}
                tooltipContent="Poor response"
                IconComponent={ThumbsDown}
                selectedColor="text-red-400"
              />
            </>
          )}
          <ActionMenu
            chatId={chatId}
            forkThread={forkThread}
            isEditing={isEditing}
            role={role}
          />
        </div>
      </div>
      <RenderMetrics metrics={metrics} />
      {showCommentModal && (
        <FeedbackCommentModal
          onSubmit={handleCommentSubmit}
          onCancel={() => setShowCommentModal(false)}
        />
      )}
    </div>
  );
};

function FeedbackButton({
  isSelected,
  handleFeedback,
  tooltipId,
  tooltipContent,
  IconComponent,
  selectedColor = "text-zinc-300",
}) {
  return (
    <div className="mt-3 relative">
      <button
        onClick={handleFeedback}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipContent}
        className={isSelected ? selectedColor : "text-zinc-300 light:text-slate-500"}
        aria-label={tooltipContent}
      >
        <IconComponent
          size={20}
          className="mb-1"
          weight={isSelected ? "fill" : "regular"}
        />
      </button>
    </div>
  );
}

function FeedbackCommentModal({ onSubmit, onCancel }) {
  const [comment, setComment] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-theme-bg-secondary border border-theme-modal-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold text-base">
              Help us improve D-Mind
            </h3>
            <p className="text-zinc-400 text-sm mt-1">
              What could this response have done better? Your input helps us
              deliver more accurate, useful answers.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-white ml-4 mt-0.5 flex-shrink-0"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describe what was missing or incorrect..."
            rows={4}
            className="w-full rounded-lg bg-theme-bg-primary border border-theme-modal-border text-white placeholder-zinc-500 text-sm p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-zinc-400 hover:text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!comment.trim()}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CopyMessage({ message }) {
  const { copied, copyText } = useCopyText();
  const { t } = useTranslation();

  return (
    <>
      <div className="mt-3 relative">
        <button
          onClick={() => copyText(message)}
          data-tooltip-id="copy-assistant-text"
          data-tooltip-content={t("chat_window.copy")}
          className="text-zinc-300 light:text-slate-500"
          aria-label={t("chat_window.copy")}
        >
          {copied ? (
            <Check size={20} className="mb-1" />
          ) : (
            <Copy size={20} className="mb-1" />
          )}
        </button>
      </div>
    </>
  );
}

function RegenerateMessage({ regenerateMessage, chatId }) {
  const { t } = useTranslation();
  if (!chatId) return null;
  return (
    <div className="mt-3 relative">
      <button
        onClick={() => regenerateMessage(chatId)}
        data-tooltip-id="regenerate-assistant-text"
        data-tooltip-content={t("chat_window.regenerate_response")}
        className="border-none text-zinc-300 light:text-slate-500"
        aria-label={t("chat_window.regenerate")}
      >
        <ArrowsClockwise size={20} className="mb-1" weight="fill" />
      </button>
    </div>
  );
}

function SavePromptButton({ userPrompt, response }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="mt-3 relative">
        <button
          onClick={() => setShowModal(true)}
          data-tooltip-id="save-prompt-button"
          data-tooltip-content="Save Prompt"
          className="text-zinc-300"
          aria-label="Save Prompt"
        >
          <FloppyDisk
            color="var(--theme-sidebar-footer-icon-fill)"
            size={20}
            className="mb-1"
          />
        </button>
      </div>
      {showModal && (
        <SavePromptModal
          prompt={userPrompt}
          response={response}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default memo(Actions);
