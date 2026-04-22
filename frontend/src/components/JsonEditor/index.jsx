import { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

export default function JsonEditor({
  initialValue = {},
  onSave,
  title = "Edit JSON Configuration",
  description = "Edit the JSON configuration below. Make sure it's valid JSON before saving.",
  readOnly = false,
}) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only set initial value once when component mounts
    if (!initializedRef.current) {
      try {
        setJsonText(JSON.stringify(initialValue, null, 2));
        setError(null);
        initializedRef.current = true;
      } catch (e) {
        setError("Failed to parse initial value");
      }
    }
  }, []);

  const validateJson = () => {
    try {
      JSON.parse(jsonText);
      setError(null);
      setValidationSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setValidationSuccess(false), 3000);
      return true;
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
      setValidationSuccess(false);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateJson()) return;

    setIsSaving(true);
    try {
      const parsedJson = JSON.parse(jsonText);
      await onSave(parsedJson);
      setError(null);
    } catch (e) {
      setError(`Failed to save: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-4 w-full">
      {title && (
        <div className="flex flex-col gap-y-1">
          <h3 className="text-lg font-medium text-theme-text-primary">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-theme-text-secondary">{description}</p>
          )}
        </div>
      )}

      <div className="relative">
        <CodeMirror
          value={jsonText}
          height="384px"
          extensions={[json()]}
          theme={oneDark}
          onChange={(value) => {
            setJsonText(value);
            setError(null);
            setValidationSuccess(false);
          }}
          readOnly={readOnly}
          basicSetup={{ tabSize: 2, indentOnInput: true }}
          className="rounded-lg border border-theme-border focus-within:border-theme-text-primary overflow-hidden text-sm"
        />
        {error && (
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        {validationSuccess && (
          <div className="mt-2 p-3 bg-green-500/10 border border-green-500 rounded-lg">
            <p className="text-sm text-green-500">✓ JSON is valid</p>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex gap-x-2">
          <button
            type="button"
            onClick={validateJson}
            className="px-4 py-2 bg-theme-bg-secondary text-theme-text-primary border border-theme-border rounded-lg hover:bg-theme-bg-primary transition-all"
          >
            Validate JSON
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-transparent text-green-400 border border-green-500 rounded-lg hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
