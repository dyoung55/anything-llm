import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { CanViewChatHistory } from "@/components/CanViewChatHistory";
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { ThumbsUp, ThumbsDown, X } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function truncate(str, max = 80) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function FeedbackAnalytics() {
  return (
    <CanViewChatHistory>
      <FeedbackAnalyticsInner />
    </CanViewChatHistory>
  );
}

function FeedbackAnalyticsInner() {
  const defaults = defaultDateRange();
  const [workspaceId, setWorkspaceId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [userFilter, setUserFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);

  const [series, setSeries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableOffset, setTableOffset] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const pageSize = 25;

  const buildPayload = useCallback(() => {
    const p = {};
    if (workspaceId) p.workspaceId = Number(workspaceId);
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (userFilter === "unassigned") p.unassignedUser = true;
    else if (userFilter) p.userId = Number(userFilter);
    if (ratingFilter === "up") p.feedbackScore = true;
    else if (ratingFilter === "down") p.feedbackScore = false;
    return p;
  }, [workspaceId, dateFrom, dateTo, userFilter, ratingFilter]);

  const loadTable = useCallback(
    async (offset, payload) => {
      setTableLoading(true);
      const r = await System.feedbackAnalyticsRows({
        ...payload,
        limit: pageSize,
        offset,
      });
      setRows(r.rows || []);
      setTotalCount(r.totalCount ?? 0);
      setTableOffset(offset);
      setTableLoading(false);
    },
    [pageSize]
  );

  const refreshAll = useCallback(async () => {
    const payload = buildPayload();
    setSummaryLoading(true);
    const res = await System.feedbackAnalytics(payload);
    if (res.error) {
      showToast(res.error?.error || "Failed to load feedback data.", "error");
      setSeries([]);
      setTotals(null);
      setSummaryLoading(false);
      return;
    }
    setSeries(res.series || []);
    setTotals(res.totals || null);
    setSummaryLoading(false);
    await loadTable(0, payload);
  }, [buildPayload, loadTable]);

  useEffect(() => {
    async function loadLists() {
      const [ws, us] = await Promise.all([Admin.workspaces(), Admin.users()]);
      setWorkspaces(ws);
      setUsers(us);
      setListsLoading(false);
    }
    loadLists();
  }, []);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (listsLoading || initialFetchDone.current) return;
    initialFetchDone.current = true;
    refreshAll();
  }, [listsLoading, refreshAll]);

  const chartData = (series || []).map((s) => ({
    name: s.periodStart.slice(0, 10),
    "Thumbs Up": s.thumbsUp,
    "Thumbs Down": s.thumbsDown,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.floor(tableOffset / pageSize) + 1;

  const satisfactionRate =
    totals && totals.total > 0
      ? Math.round((totals.thumbsUp / totals.total) * 100)
      : null;

  return (
    <div className="w-full h-full overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          {/* Header */}
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <p className="text-lg leading-6 font-bold text-theme-text-primary">
              User Feedback
            </p>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              Review thumbs-up and thumbs-down feedback submitted by users
              across all workspaces.
            </p>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                Workspace
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[180px]"
                >
                  <option value="">All Workspaces</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                User
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[160px]"
                >
                  <option value="">All Users</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                Rating
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[160px]"
                >
                  <option value="all">All Ratings</option>
                  <option value="up">Thumbs Up</option>
                  <option value="down">Thumbs Down</option>
                </select>
              </label>

              <button
                type="button"
                onClick={refreshAll}
                className="flex items-center gap-x-2 px-4 py-2 rounded-lg bg-primary-button hover:light:bg-theme-bg-primary hover:text-theme-text-primary text-xs font-semibold hover:bg-secondary h-[38px] w-fit self-end"
              >
                Apply
              </button>
            </div>

            {/* Summary cards */}
            {summaryLoading ? (
              <Skeleton.default
                height={80}
                width="100%"
                highlightColor="var(--theme-bg-secondary)"
                baseColor="var(--theme-bg-primary)"
              />
            ) : totals ? (
              <div className="flex flex-wrap gap-3 mt-2">
                <SummaryCard
                  label="Total Feedback"
                  value={totals.total}
                  color="text-theme-text-primary"
                />
                <SummaryCard
                  label="Thumbs Up"
                  value={totals.thumbsUp}
                  color="text-green-400"
                />
                <SummaryCard
                  label="Thumbs Down"
                  value={totals.thumbsDown}
                  color="text-red-400"
                />
                {satisfactionRate !== null && (
                  <SummaryCard
                    label="Satisfaction Rate"
                    value={`${satisfactionRate}%`}
                    color={
                      satisfactionRate >= 70
                        ? "text-green-400"
                        : satisfactionRate >= 40
                        ? "text-yellow-400"
                        : "text-red-400"
                    }
                  />
                )}
              </div>
            ) : null}

            {/* Chart */}
            {!summaryLoading && chartData.length > 0 && (
              <div className="mt-4 bg-theme-bg-primary rounded-xl p-4">
                <p className="text-sm font-semibold text-theme-text-primary mb-3">
                  Feedback Over Time
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--theme-bg-secondary)",
                        border: "1px solid #ffffff20",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
                    />
                    <Bar dataKey="Thumbs Up" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Thumbs Down" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-theme-text-primary mb-2">
                Feedback Log
              </p>
              {tableLoading ? (
                <Skeleton.default
                  height={200}
                  width="100%"
                  highlightColor="var(--theme-bg-secondary)"
                  baseColor="var(--theme-bg-primary)"
                />
              ) : (
                <>
                  <table className="w-full text-left text-sm text-theme-text-secondary border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 pr-4 w-10">Rating</th>
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Workspace</th>
                        <th className="py-2 pr-4 whitespace-nowrap">Date &amp; Time</th>
                        <th className="py-2 pr-4">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRow(r)}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        >
                          <td className="py-2 pr-4">
                            <RatingIcon score={r.feedbackScore} />
                          </td>
                          <td className="py-2 pr-4 text-theme-text-primary">
                            {r.username ?? (r.userId == null ? "Unassigned" : "—")}
                          </td>
                          <td className="py-2 pr-4 text-theme-text-primary">
                            {r.workspaceName || r.workspaceSlug || r.workspaceId}
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap text-theme-text-primary">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-theme-text-secondary max-w-xs">
                            {truncate(r.feedbackComment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {rows.length === 0 && (
                    <p className="text-sm text-theme-text-secondary py-4">
                      No feedback found for the selected filters.
                    </p>
                  )}

                  {totalCount > pageSize && (
                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <button
                        type="button"
                        disabled={tableOffset <= 0}
                        onClick={() =>
                          loadTable(
                            Math.max(0, tableOffset - pageSize),
                            buildPayload()
                          )
                        }
                        className="px-3 py-1 rounded-lg bg-theme-bg-primary border border-white/10 text-theme-text-primary font-medium hover:bg-white/10 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="text-theme-text-secondary">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={tableOffset + pageSize >= totalCount}
                        onClick={() =>
                          loadTable(tableOffset + pageSize, buildPayload())
                        }
                        className="px-3 py-1 rounded-lg bg-theme-bg-primary border border-white/10 text-theme-text-primary font-medium hover:bg-white/10 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRow && (
        <FeedbackDetailDialog
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-theme-bg-primary rounded-xl px-5 py-4 min-w-[140px]">
      <p className="text-xs text-theme-text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RatingIcon({ score }) {
  if (score === true) {
    return <ThumbsUp size={16} weight="fill" className="text-green-400" />;
  }
  if (score === false) {
    return <ThumbsDown size={16} weight="fill" className="text-red-400" />;
  }
  return <span className="text-zinc-500">—</span>;
}

function FeedbackDetailDialog({ row, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-theme-bg-secondary border border-theme-modal-border rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/10">
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {row.feedbackScore === true ? (
                <span className="flex items-center gap-1.5 text-green-400 font-semibold text-sm">
                  <ThumbsUp size={18} weight="fill" />
                  Positive Response
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 font-semibold text-sm">
                  <ThumbsDown size={18} weight="fill" />
                  Negative Response
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-theme-text-secondary">
              <span>
                <span className="text-theme-text-primary font-medium">User:</span>{" "}
                {row.username ?? (row.userId == null ? "Unassigned" : "—")}
              </span>
              <span>
                <span className="text-theme-text-primary font-medium">Workspace:</span>{" "}
                {row.workspaceName || row.workspaceSlug || row.workspaceId}
              </span>
              <span>
                <span className="text-theme-text-primary font-medium">Date:</span>{" "}
                {new Date(row.createdAt).toLocaleString()}
              </span>
            </div>
            {row.feedbackComment && (
              <div className="text-sm">
                <span className="text-theme-text-secondary text-xs font-medium uppercase tracking-wide">
                  Feedback
                </span>
                <p className="mt-1 text-theme-text-primary bg-theme-bg-primary rounded-lg p-3 text-sm">
                  {row.feedbackComment}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white ml-4 mt-0.5 flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body: prompt + response */}
        <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden min-h-0">
          <div className="flex-shrink-0">
            <p className="text-xs font-medium uppercase tracking-wide text-theme-text-secondary mb-2">
              User Prompt
            </p>
            <div className="bg-theme-bg-primary rounded-lg p-4 max-h-44 overflow-y-auto">
              <span
                className="markdown flex flex-col gap-y-1 text-sm text-white light:text-slate-900"
                dangerouslySetInnerHTML={{
                  __html: row.prompt
                    ? DOMPurify.sanitize(renderMarkdown(row.prompt))
                    : "—",
                }}
              />
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-xs font-medium uppercase tracking-wide text-theme-text-secondary mb-2 flex-shrink-0">
              AI Response
            </p>
            <div className="bg-theme-bg-primary rounded-lg p-4 flex-1 overflow-y-auto min-h-0">
              <span
                className="markdown flex flex-col gap-y-1 text-sm text-white light:text-slate-900"
                dangerouslySetInnerHTML={{
                  __html: row.response
                    ? DOMPurify.sanitize(renderMarkdown(row.response))
                    : "—",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
