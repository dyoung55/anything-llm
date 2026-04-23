const prisma = require("./prisma");

const MAX_FEEDBACK_ROWS = 100_000;
const BATCH_SIZE = 2500;

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
 * Extracts the plain text from the AI response JSON blob.
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
 * Builds a Prisma WHERE clause for feedback rows.
 * Always restricts to rows where feedbackScore IS NOT NULL.
 * @param {Record<string, unknown>} body
 * @returns {import("@prisma/client").Prisma.workspace_chatsWhereInput}
 */
function buildFeedbackWhere(body = {}) {
  /** @type {import("@prisma/client").Prisma.workspace_chatsWhereInput} */
  const where = { feedbackScore: { not: null } };

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

  // feedbackScore filter: true = thumbs up only, false = thumbs down only, omit = both
  if (body.feedbackScore === true) {
    where.feedbackScore = true;
  } else if (body.feedbackScore === false) {
    where.feedbackScore = false;
  }

  return where;
}

/**
 * @param {Date} date
 */
function dayKeyUTC(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Returns a daily time-series of thumbs-up / thumbs-down counts.
 * @param {import("@prisma/client").Prisma.workspace_chatsWhereInput} where
 * @returns {Promise<{ error: string, totalCount?: number, max?: number } | { series: object[], totals: object }>}
 */
async function aggregateFeedbackSeries(where) {
  const totalCount = await prisma.workspace_chats.count({ where });
  if (totalCount > MAX_FEEDBACK_ROWS) {
    return { error: "too_many_rows", totalCount, max: MAX_FEEDBACK_ROWS };
  }

  /** @type {Map<string, { periodStart: string, thumbsUp: number, thumbsDown: number }>} */
  const buckets = new Map();
  const totals = { thumbsUp: 0, thumbsDown: 0, total: 0 };

  let lastId = 0;
  while (true) {
    const batch = await prisma.workspace_chats.findMany({
      where: { AND: [where, { id: { gt: lastId } }] },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      select: { id: true, createdAt: true, feedbackScore: true },
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      lastId = row.id;
      const key = dayKeyUTC(row.createdAt);

      if (!buckets.has(key)) {
        buckets.set(key, {
          periodStart: `${key}T00:00:00.000Z`,
          thumbsUp: 0,
          thumbsDown: 0,
        });
      }

      const b = buckets.get(key);
      if (row.feedbackScore === true) {
        b.thumbsUp++;
        totals.thumbsUp++;
      } else {
        b.thumbsDown++;
        totals.thumbsDown++;
      }
      totals.total++;
    }
  }

  const series = Array.from(buckets.values()).sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );

  return { series, totals };
}

/**
 * Returns paginated feedback rows with workspace, user, prompt, and response.
 * @param {import("@prisma/client").Prisma.workspace_chatsWhereInput} where
 * @param {number} limit
 * @param {number} offset
 */
async function fetchFeedbackRows(where, limit = 25, offset = 0) {
  const totalCount = await prisma.workspace_chats.count({ where });
  const rows = await prisma.workspace_chats.findMany({
    where,
    include: { users: true },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
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
    return {
      id: r.id,
      createdAt: r.createdAt,
      feedbackScore: r.feedbackScore,
      feedbackComment: r.feedbackComment ?? null,
      workspaceId: r.workspaceId,
      workspaceName: ws?.name ?? null,
      workspaceSlug: ws?.slug ?? null,
      userId: r.user_id,
      username: r.users?.username ?? null,
      prompt: r.prompt,
      response: assistantTextFromResponse(r.response),
    };
  });

  return { rows: mapped, totalCount };
}

module.exports = {
  buildFeedbackWhere,
  aggregateFeedbackSeries,
  fetchFeedbackRows,
};
