const prisma = require("./prisma");
const { TokenManager } = require("./helpers/tiktoken");

const MAX_ANALYTICS_ROWS = 100_000;
const BATCH_SIZE = 2500;

/** @type {InstanceType<typeof TokenManager> | null} */
let tokenManagerInstance = null;

function getTokenManager() {
  if (!tokenManagerInstance) tokenManagerInstance = new TokenManager();
  return tokenManagerInstance;
}

/**
 * @param {unknown} val
 * @returns {Date|null}
 */
function normalizeDateStart(val) {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {unknown} val
 * @returns {Date|null}
 */
function normalizeDateEnd(val) {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T23:59:59.999Z`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Record<string, unknown>} body
 * @returns {import("@prisma/client").Prisma.workspace_chatsWhereInput}
 */
function buildUsageWhere(body = {}) {
  /** @type {import("@prisma/client").Prisma.workspace_chatsWhereInput} */
  const where = { include: true };

  if (body.workspaceId != null && body.workspaceId !== "") {
    const wid = Number(body.workspaceId);
    if (!Number.isNaN(wid)) where.workspaceId = wid;
  }

  const gte = normalizeDateStart(body.dateFrom);
  const lte = normalizeDateEnd(body.dateTo);
  if (gte || lte) {
    where.createdAt = {};
    if (gte) where.createdAt.gte = gte;
    if (lte) where.createdAt.lte = lte;
  }

  if (body.unassignedUser === true) {
    where.user_id = null;
  } else if (body.userId != null && body.userId !== "") {
    const uid = Number(body.userId);
    if (!Number.isNaN(uid) && uid > 0) where.user_id = uid;
  }

  if (body.viaApi === true) {
    where.api_session_id = { not: null };
  } else if (body.viaApi === false) {
    where.api_session_id = null;
  }

  return where;
}

/**
 * @param {string} responseStr
 */
function parseMetrics(responseStr) {
  try {
    const j = JSON.parse(responseStr);
    const m = j?.metrics;
    if (!m || typeof m !== "object") {
      return {
        prompt: 0,
        completion: 0,
        total: 0,
        hasMetrics: false,
      };
    }
    const prompt = Number(m.prompt_tokens) || 0;
    const completion = Number(m.completion_tokens) || 0;
    let total = Number(m.total_tokens);
    if (Number.isNaN(total)) total = 0;
    if (total === 0) total = prompt + completion;
    const hasMetrics = !!(
      (m.prompt_tokens != null && Number(m.prompt_tokens) > 0) ||
      (m.completion_tokens != null && Number(m.completion_tokens) > 0) ||
      (m.total_tokens != null && Number(m.total_tokens) > 0)
    );
    return { prompt, completion, total, hasMetrics };
  } catch {
    return { prompt: 0, completion: 0, total: 0, hasMetrics: false };
  }
}

/**
 * @param {string} responseStr
 * @returns {string}
 */
function assistantTextFromResponse(responseStr) {
  try {
    const j = JSON.parse(responseStr);
    if (j?.text != null && typeof j.text === "string") return j.text;
    return "";
  } catch {
    return "";
  }
}

/**
 * @param {string} prompt
 * @param {string} responseStr
 * @returns {{
 *   promptTokens: number,
 *   completionTokens: number,
 *   totalTokens: number,
 *   tokenSource: 'reported' | 'estimated',
 * }}
 */
function tokenCountsForRow(prompt, responseStr) {
  const reported = parseMetrics(responseStr);
  if (reported.hasMetrics) {
    return {
      promptTokens: reported.prompt,
      completionTokens: reported.completion,
      totalTokens: reported.total,
      tokenSource: "reported",
    };
  }

  const tm = getTokenManager();
  const p = String(prompt ?? "");
  const completionText = assistantTextFromResponse(responseStr);
  const estPrompt = tm.countFromString(p);
  const estCompletion = tm.countFromString(completionText);
  return {
    promptTokens: estPrompt,
    completionTokens: estCompletion,
    totalTokens: estPrompt + estCompletion,
    tokenSource: "estimated",
  };
}

/**
 * @param {Date} date
 */
function dayKeyUTC(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * @param {import("@prisma/client").Prisma.workspace_chatsWhereInput} where
 * @returns {Promise<{ error: string, totalCount?: number, max?: number } | { series: object[], totals: object }>}
 */
async function aggregateUsageSeries(where) {
  const totalCount = await prisma.workspace_chats.count({ where });
  if (totalCount > MAX_ANALYTICS_ROWS) {
    return {
      error: "too_many_rows",
      totalCount,
      max: MAX_ANALYTICS_ROWS,
    };
  }

  /** @type {Map<string, { periodStart: string, chatCount: number, promptTokens: number, completionTokens: number, totalTokens: number }>} */
  const buckets = new Map();
  const totals = {
    chatCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    chatsWithMetrics: 0,
    chatsMissingMetrics: 0,
    chatsWithEstimatedTokens: 0,
  };

  let lastId = 0;

  while (true) {
    const batch = await prisma.workspace_chats.findMany({
      where: { AND: [where, { id: { gt: lastId } }] },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: { id: true, createdAt: true, prompt: true, response: true, workspaceId: true },
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      lastId = row.id;
      const key = dayKeyUTC(row.createdAt);
      const reported = parseMetrics(row.response);
      const tc = tokenCountsForRow(row.prompt, row.response);

      totals.chatCount++;
      if (reported.hasMetrics) totals.chatsWithMetrics++;
      else totals.chatsMissingMetrics++;
      if (tc.tokenSource === "estimated") totals.chatsWithEstimatedTokens++;
      totals.promptTokens += tc.promptTokens;
      totals.completionTokens += tc.completionTokens;
      totals.totalTokens += tc.totalTokens;

      if (!buckets.has(key)) {
        buckets.set(key, {
          periodStart: `${key}T00:00:00.000Z`,
          chatCount: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          workspaceBreakdown: {},
        });
      }
      const b = buckets.get(key);
      b.chatCount++;
      b.promptTokens += tc.promptTokens;
      b.completionTokens += tc.completionTokens;
      b.totalTokens += tc.totalTokens;

      // Track per-workspace breakdown
      const wsId = String(row.workspaceId ?? "unknown");
      if (!b.workspaceBreakdown[wsId]) {
        b.workspaceBreakdown[wsId] = {
          chatCount: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };
      }
      b.workspaceBreakdown[wsId].chatCount++;
      b.workspaceBreakdown[wsId].promptTokens += tc.promptTokens;
      b.workspaceBreakdown[wsId].completionTokens += tc.completionTokens;
      b.workspaceBreakdown[wsId].totalTokens += tc.totalTokens;
    }
  }

  const series = Array.from(buckets.values()).sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );

  return { series, totals };
}

/**
 * @param {import("@prisma/client").Prisma.workspace_chatsWhereInput} where
 * @param {number} limit
 * @param {number} offset
 */
async function fetchUsageRows(where, limit = 20, offset = 0) {
  const totalCount = await prisma.workspace_chats.count({ where });
  const rows = await prisma.workspace_chats.findMany({
    where,
    include: { users: true },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
    skip: Math.max(offset, 0),
  });

  const workspaceIds = [...new Set(rows.map((r) => r.workspaceId))];
  const workspaces = await prisma.workspaces.findMany({
    where: { id: { in: workspaceIds } },
    select: { id: true, name: true, slug: true },
  });
  const wsMap = new Map(workspaces.map((w) => [w.id, w]));

  const mapped = rows.map((r) => {
    const ws = wsMap.get(r.workspaceId);
    const tc = tokenCountsForRow(r.prompt, r.response);
    return {
      id: r.id,
      createdAt: r.createdAt,
      workspaceId: r.workspaceId,
      workspaceName: ws?.name ?? null,
      workspaceSlug: ws?.slug ?? null,
      userId: r.user_id,
      username: r.users?.username ?? null,
      viaApi: r.api_session_id != null,
      promptTokens: tc.promptTokens,
      completionTokens: tc.completionTokens,
      totalTokens: tc.totalTokens,
      tokenSource: tc.tokenSource,
    };
  });

  return { rows: mapped, totalCount };
}

/**
 * @param {string} field
 */
function csvEscape(field) {
  const s = field == null ? "" : String(field);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {import("@prisma/client").Prisma.workspace_chatsWhereInput} where
 * @returns {Promise<{ error: string, totalCount?: number, max?: number } | { csv: string }>}
 */
async function buildUsageExportCsv(where) {
  const totalCount = await prisma.workspace_chats.count({ where });
  if (totalCount > MAX_ANALYTICS_ROWS) {
    return {
      error: "too_many_rows",
      totalCount,
      max: MAX_ANALYTICS_ROWS,
    };
  }

  const header = [
    "id",
    "createdAt",
    "workspaceSlug",
    "workspaceName",
    "userId",
    "username",
    "viaApi",
    "tokenSource",
    "promptTokens",
    "completionTokens",
    "totalTokens",
  ].join(",");

  const lines = [header];
  let lastId = 0;

  while (true) {
    const batch = await prisma.workspace_chats.findMany({
      where: { AND: [where, { id: { gt: lastId } }] },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      include: { users: true },
    });

    if (batch.length === 0) break;

    const workspaceIds = [...new Set(batch.map((r) => r.workspaceId))];
    const workspaces = await prisma.workspaces.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true, slug: true },
    });
    const wsMap = new Map(workspaces.map((w) => [w.id, w]));

    for (const r of batch) {
      lastId = r.id;
      const ws = wsMap.get(r.workspaceId);
      const tc = tokenCountsForRow(r.prompt, r.response);
      lines.push(
        [
          csvEscape(r.id),
          csvEscape(new Date(r.createdAt).toISOString()),
          csvEscape(ws?.slug ?? ""),
          csvEscape(ws?.name ?? ""),
          csvEscape(r.user_id ?? ""),
          csvEscape(r.users?.username ?? ""),
          csvEscape(r.api_session_id != null ? "true" : "false"),
          csvEscape(tc.tokenSource),
          csvEscape(tc.promptTokens),
          csvEscape(tc.completionTokens),
          csvEscape(tc.totalTokens),
        ].join(",")
      );
    }
  }

  return { csv: lines.join("\r\n") };
}

module.exports = {
  MAX_ANALYTICS_ROWS,
  buildUsageWhere,
  parseMetrics,
  tokenCountsForRow,
  aggregateUsageSeries,
  fetchUsageRows,
  buildUsageExportCsv,
};
