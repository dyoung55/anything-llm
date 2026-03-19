/**
 * Normalize Aibitat / provider message content for storage and REST APIs.
 * Handles strings, Anthropic-style block arrays, and nested shapes.
 * Avoids String(object) which becomes "[object Object]".
 *
 * Used by EphemeralEventListener (developer API) and chat-history (DB persistence)
 * so UI, API, and stored history stay consistent.
 *
 * @param {unknown} content
 * @returns {string}
 */
function packAgentContentToPlainText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean")
    return String(content);
  if (Array.isArray(content)) {
    const parts = [];
    for (const block of content) {
      if (block == null) continue;
      if (typeof block === "string") {
        parts.push(block);
        continue;
      }
      if (typeof block === "object") {
        if (block.type === "text" && typeof block.text === "string")
          parts.push(block.text);
        else if (typeof block.text === "string") parts.push(block.text);
        else if (block.type === "tool_result" && block.content != null) {
          const inner = packAgentContentToPlainText(block.content);
          if (inner) parts.push(inner);
        }
      }
    }
    return parts.filter(Boolean).join("\n\n");
  }
  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (content.content != null)
      return packAgentContentToPlainText(content.content);
  }
  return "";
}

/**
 * Parse the human-readable "Assembling Tool Call: name(args)" line from providers.
 * @param {string} display
 * @returns {{ display: string, toolName?: string, argumentsPreview?: string }}
 */
function parseAssemblingToolDisplay(display) {
  const s = String(display);
  const m = s.match(/^Assembling Tool Call:\s*([^(]+)\(([\s\S]*)$/);
  if (!m) return { display: s };
  return {
    display: s,
    toolName: m[1].trim(),
    argumentsPreview: m[2],
  };
}

/**
 * Build final assistant text + ordered segments from ephemeral agent `handler.send` payloads.
 * Coalesces `reportStreamEvent` text chunks (fixes per-token "\n\n" fragmentation).
 * Separates narrative text from tool-assembly lines for API consumers (e.g. React).
 *
 * @param {object[]} messages - Parsed JSON objects from EphemeralEventListener
 * @returns {{
 *   thoughts: string[],
 *   textResponse: string|null,
 *   contentSegments: Array<
 *     | { kind: 'text', text: string }
 *     | { kind: 'tool_call', uuid?: string, phase: string, display: string, toolName?: string, argumentsPreview?: string }
 *     | { kind: 'error', message: string }
 *   >
 * }}
 */
function packEphemeralAgentMessages(messages) {
  const thoughts = [];
  const segments = [];
  let textBuffer = "";
  let activeTextUuid = null;

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ kind: "text", text: textBuffer });
      textBuffer = "";
      activeTextUuid = null;
    }
  };

  const pushOrReplaceTool = (inner) => {
    flushText();
    const display =
      typeof inner.content === "string"
        ? inner.content
        : packAgentContentToPlainText(inner.content);
    const parsed = parseAssemblingToolDisplay(display);
    const seg = {
      kind: "tool_call",
      uuid: inner.uuid,
      phase: "assembling",
      ...parsed,
    };
    const last = segments[segments.length - 1];
    if (last && last.kind === "tool_call" && last.uuid === seg.uuid) {
      segments[segments.length - 1] = seg;
    } else {
      segments.push(seg);
    }
  };

  for (const msg of messages) {
    if (msg.type === "statusResponse") {
      flushText();
      thoughts.push(
        typeof msg.content === "string"
          ? msg.content
          : packAgentContentToPlainText(msg.content)
      );
      continue;
    }

    if (
      msg.type === "reportStreamEvent" &&
      msg.content &&
      typeof msg.content === "object"
    ) {
      const ev = msg.content;
      if (ev.type === "removeStatusResponse") continue;
      if (ev.type === "textResponseChunk" && typeof ev.content === "string") {
        if (activeTextUuid !== ev.uuid) {
          flushText();
          activeTextUuid = ev.uuid;
        }
        textBuffer += ev.content;
        continue;
      }
      if (ev.type === "toolCallInvocation") {
        pushOrReplaceTool(ev);
        continue;
      }
      if (ev.type === "fullTextResponse") {
        flushText();
        const t =
          typeof ev.content === "string"
            ? ev.content
            : packAgentContentToPlainText(ev.content);
        if (t) segments.push({ kind: "text", text: t });
        continue;
      }
      continue;
    }

    if (msg.type === "wssFailure") {
      flushText();
      segments.push({
        kind: "error",
        message:
          typeof msg.content === "string"
            ? msg.content
            : String(msg.content ?? ""),
      });
      continue;
    }

    flushText();
    const raw =
      msg.content !== undefined && msg.content !== null
        ? msg.content
        : msg.textResponse !== undefined && msg.textResponse !== null
          ? msg.textResponse
          : msg.text;
    const piece =
      typeof raw === "string" ? raw : packAgentContentToPlainText(raw);
    if (piece && piece.length > 0) segments.push({ kind: "text", text: piece });
  }

  flushText();

  const narrativeParts = segments
    .filter((s) => s.kind === "text")
    .map((s) => s.text);
  const textResponse =
    narrativeParts.length > 0 ? narrativeParts.join("\n\n") : null;

  return { thoughts, textResponse, contentSegments: segments };
}

module.exports = {
  packAgentContentToPlainText,
  parseAssemblingToolDisplay,
  packEphemeralAgentMessages,
};
