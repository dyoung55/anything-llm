import { useEffect, useRef, useState } from "react";
import Admin from "@/models/admin";
import showToast from "@/utils/toast";
import { Check, PencilSimple, Trash, X } from "@phosphor-icons/react";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import { formatDateTime } from "@/utils/directories";

export default function ApiKeyRow({ apiKey, removeApiKey, isMultiUser }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(apiKey.description || "");
  const inputRef = useRef(null);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate this api key?\nAfter you do this it will not longer be useable.\n\nThis action is irreversible.`
      )
    )
      return false;

    const user = userFromStorage();
    const Model = !!user ? Admin : System;
    await Model.deleteApiKey(apiKey.id);
    showToast("API Key permanently deleted", "info");
    removeApiKey(apiKey.id);
  };

  const copyApiKey = () => {
    if (!apiKey) return false;
    window.navigator.clipboard.writeText(apiKey.secret);
    showToast("API Key copied to clipboard", "success");
    setCopied(true);
  };

  const handleEditStart = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleEditCancel = () => {
    setDescription(apiKey.description || "");
    setEditing(false);
  };

  const handleEditSave = async () => {
    const user = userFromStorage();
    const Model = !!user ? Admin : System;
    const newDesc = description.trim() || null;
    const { error } = await Model.updateApiKey(apiKey.id, newDesc);
    if (error) {
      showToast("Failed to update description", "error");
      return;
    }
    apiKey.description = newDesc;
    setDescription(newDesc || "");
    setEditing(false);
    showToast("Description updated", "success");
  };

  useEffect(() => {
    function resetStatus() {
      if (!copied) return false;
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
    resetStatus();
  }, [copied]);

  return (
    <>
      <tr className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10">
        <td scope="row" className="px-6 whitespace-nowrap">
          {apiKey.secret}
        </td>
        <td className="px-6">
          {editing ? (
            <div className="flex items-center gap-x-1">
              <input
                ref={inputRef}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave();
                  if (e.key === "Escape") handleEditCancel();
                }}
                placeholder="Add a description..."
                className="border-none bg-theme-settings-input-bg text-white light:text-black placeholder:text-white/30 placeholder:light:text-black/40 text-xs rounded outline-none px-2 py-1 w-48"
              />
              <button
                onClick={handleEditSave}
                className="p-1 rounded hover:bg-white/10 text-green-400"
              >
                <Check size={14} weight="bold" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 rounded hover:bg-white/10 hover:light:bg-black/10 text-white/60 light:text-black/60"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-x-1">
              <span className="text-white/60 light:text-black/60">
                {apiKey.description || "—"}
              </span>
              <button
                onClick={handleEditStart}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 hover:light:bg-black/10 text-white/50 light:text-black/40 transition-opacity"
              >
                <PencilSimple size={12} />
              </button>
            </div>
          )}
        </td>
        {isMultiUser && (
          <td className="px-6 text-left">{apiKey.createdBy?.username || "--"}</td>
        )}
        <td className="px-6 whitespace-nowrap">{formatDateTime(apiKey.createdAt)}</td>
        <td className="px-6 flex items-center gap-x-6 h-full mt-1">
          <button
            onClick={copyApiKey}
            disabled={copied}
            className="text-xs font-medium text-blue-300 rounded-lg hover:text-white hover:light:text-blue-500 hover:text-opacity-60 hover:underline"
          >
            {copied ? "Copied" : "Copy API Key"}
          </button>
          <button
            onClick={handleDelete}
            className="text-xs font-medium text-white/80 light:text-black/80 hover:light:text-red-500 hover:text-red-300 rounded-lg px-2 py-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10"
          >
            <Trash className="h-5 w-5" />
          </button>
        </td>
      </tr>
    </>
  );
}
