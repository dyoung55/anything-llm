import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { CanViewChatHistory } from "@/components/CanViewChatHistory";
import Admin from "@/models/admin";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { DownloadSimple } from "@phosphor-icons/react";
import { saveAs } from "file-saver";
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

// Bold, distinct colors for workspace visualization (50 colors)
const WORKSPACE_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#A9DFBF",
  "#F1948A", "#D7BDE2", "#76D7C4", "#FAD7A0", "#A3E4D7",
  "#F5B7B1", "#D5A6BD", "#52BE80", "#F4D03F", "#7FB3D5",
  "#EC7063", "#9B59B6", "#3498DB", "#E59866", "#52BE80",
  "#F39C12", "#8E44AD", "#1ABC9C", "#E74C3C", "#34495E",
  "#16A085", "#D35400", "#2980B9", "#C0392B", "#27AE60",
  "#2C3E50", "#E67E22", "#8B4513", "#9A8B73", "#00CED1",
  "#FF69B4", "#6A5ACD", "#20B2AA", "#FFD700", "#DC143C",
  "#00FA9A", "#FF8C00", "#9932CC", "#32CD32", "#FF1493"
];

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

export default function UsageDashboard() {
  return (
    <CanViewChatHistory>
      <UsageDashboardInner />
    </CanViewChatHistory>
  );
}

function UsageDashboardInner() {
  const { t } = useTranslation();
  const defaults = defaultDateRange();
  const [workspaceId, setWorkspaceId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [userFilter, setUserFilter] = useState("");
  const [viaApi, setViaApi] = useState("all");
  const [chartMetric, setChartMetric] = useState("chats");
  const [groupBy, setGroupBy] = useState("workspace");

  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);

  const [series, setSeries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableOffset, setTableOffset] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const pageSize = 20;

  const buildPayload = useCallback(() => {
    const p = {};
    if (workspaceId) p.workspaceId = Number(workspaceId);
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (userFilter === "unassigned") p.unassignedUser = true;
    else if (userFilter) p.userId = Number(userFilter);
    if (viaApi === "yes") p.viaApi = true;
    else if (viaApi === "no") p.viaApi = false;
    return p;
  }, [workspaceId, dateFrom, dateTo, userFilter, viaApi]);

  const loadTable = useCallback(
    async (offset, payload) => {
      setTableLoading(true);
      const r = await System.usageAnalyticsRows({
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

  const refreshSummary = useCallback(async () => {
    const payload = buildPayload();
    setSummaryLoading(true);
    setSummaryError(null);
    const res = await System.usageAnalytics(payload);
    if (res.error) {
      setSummaryError(res.error?.error || t("usageAnalytics.errorGeneric"));
      setSeries([]);
      setTotals(null);
      setSummaryLoading(false);
      showToast(
        typeof res.error === "object" && res.error?.error
          ? res.error.error
          : t("usageAnalytics.errorGeneric"),
        "error"
      );
      return;
    }
    setSeries(res.series || []);
    setTotals(res.totals || null);
    setSummaryLoading(false);
    await loadTable(0, payload);
  }, [buildPayload, loadTable, t]);

  useEffect(() => {
    async function loadLists() {
      const [ws, us] = await Promise.all([
        Admin.workspaces(),
        Admin.users(),
      ]);
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
    refreshSummary();
  }, [listsLoading, refreshSummary]);

  const handleApply = () => {
    refreshSummary();
  };

  const handleExport = async () => {
    const payload = buildPayload();
    const res = await System.usageAnalyticsExport(payload);
    if (res.error) {
      showToast(
        res.error?.error || t("usageAnalytics.exportFailed"),
        "error"
      );
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `anythingllm-usage-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(t("usageAnalytics.exportSuccess"), "success");
  };

  const allWorkspaceIds = useMemo(() => {
    const ids = new Set();
    (series || []).forEach((s) =>
      Object.keys(s.workspaceBreakdown || {}).forEach((id) => ids.add(id))
    );
    return Array.from(ids);
  }, [series]);

  // Only show stacked bars if the actual series data has multiple workspaces
  // This prevents the chart from changing until Apply is clicked
  const isAllWorkspaces = allWorkspaceIds.length > 1;

  const wsNameMap = useMemo(
    () => Object.fromEntries(workspaces.map((w) => [String(w.id), w.name])),
    [workspaces]
  );

  const allUserIds = useMemo(() => {
    const ids = new Set();
    (series || []).forEach((s) =>
      Object.keys(s.userBreakdown || {}).forEach((id) => ids.add(id))
    );
    return Array.from(ids);
  }, [series]);

  const isAllUsers = allUserIds.length > 1;

  const userNameMap = useMemo(() => {
    const map = {};
    for (const s of series || []) {
      for (const [uId, entry] of Object.entries(s.userBreakdown || {})) {
        if (!map[uId])
          map[uId] =
            entry.username ??
            (uId === "unassigned" ? "Unassigned" : `User ${uId}`);
      }
    }
    return map;
  }, [series]);

  const chartData = (series || []).map((s) => {
    const entry = {
      name: s.periodStart.slice(0, 10),
      chatCount: s.chatCount,
      totalTokens: s.totalTokens,
      promptTokens: s.promptTokens,
      completionTokens: s.completionTokens,
    };
    if (groupBy === "workspace" && isAllWorkspaces) {
      for (const wsId of allWorkspaceIds) {
        const wb = s.workspaceBreakdown?.[wsId];
        entry[`ws_${wsId}_chats`] = wb?.chatCount ?? 0;
        entry[`ws_${wsId}_tokens`] = wb?.totalTokens ?? 0;
      }
    } else if (groupBy === "user" && isAllUsers) {
      for (const uId of allUserIds) {
        const ub = s.userBreakdown?.[uId];
        entry[`usr_${uId}_chats`] = ub?.chatCount ?? 0;
        entry[`usr_${uId}_tokens`] = ub?.totalTokens ?? 0;
      }
    }
    return entry;
  });

  const dataKey = chartMetric === "chats" ? "chatCount" : "totalTokens";
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.floor(tableOffset / pageSize) + 1;

  return (
    <div className="w-full h-full overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("usageAnalytics.title")}
              </p>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-x-2 px-4 py-1 rounded-lg bg-primary-button hover:light:bg-theme-bg-primary hover:text-theme-text-primary text-xs font-semibold hover:bg-secondary shadow-[0_4px_14px_rgba(0,0,0,0.25)] h-[34px] w-fit"
              >
                <DownloadSimple size={18} weight="bold" />
                {t("usageAnalytics.exportCsv")}
              </button>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("usageAnalytics.description")}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                {t("usageAnalytics.filterWorkspace")}
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[180px]"
                >
                  <option value="">{t("usageAnalytics.allWorkspaces")}</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                {t("usageAnalytics.filterFrom")}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                {t("usageAnalytics.filterTo")}
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                {t("usageAnalytics.filterUser")}
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[160px]"
                >
                  <option value="">{t("usageAnalytics.allUsers")}</option>
                  <option value="unassigned">
                    {t("usageAnalytics.unassignedUser")}
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-theme-text-secondary">
                {t("usageAnalytics.filterViaApi")}
                <select
                  value={viaApi}
                  onChange={(e) => setViaApi(e.target.value)}
                  className="bg-theme-bg-primary border border-white/10 light:border-theme-border-primary rounded-lg px-3 py-2 text-sm text-theme-text-primary min-w-[140px]"
                >
                  <option value="all">{t("usageAnalytics.viaApiAll")}</option>
                  <option value="no">{t("usageAnalytics.viaApiUi")}</option>
                  <option value="yes">{t("usageAnalytics.viaApiApi")}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-lg bg-theme-bg-primary border border-white/20 text-theme-text-primary text-sm font-semibold hover:bg-white/10"
              >
                {t("usageAnalytics.apply")}
              </button>
            </div>

            {totals && !summaryError && (
              <div className="flex flex-col gap-2 text-sm text-theme-text-secondary">
                <p className="text-xs leading-relaxed max-w-3xl">
                  {t("usageAnalytics.tokensDisclaimer")}
                </p>
                <div className="flex flex-wrap gap-4">
                  <span>
                    {t("usageAnalytics.totalChats")}:{" "}
                    <strong className="text-theme-text-primary">
                      {totals.chatCount}
                    </strong>
                  </span>
                  <span>
                    {t("usageAnalytics.totalTokens")}:{" "}
                    <strong className="text-theme-text-primary">
                      {totals.totalTokens}
                    </strong>
                  </span>
                  <span>
                    {t("usageAnalytics.chatsWithMetrics")}:{" "}
                    {totals.chatsWithMetrics}
                  </span>
                  <span>
                    {t("usageAnalytics.chatsMissingMetrics")}:{" "}
                    {totals.chatsMissingMetrics}
                  </span>
                  <span>
                    {t("usageAnalytics.chatsWithEstimatedTokens")}:{" "}
                    {totals.chatsWithEstimatedTokens ?? 0}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs text-theme-text-secondary">
                  {t("usageAnalytics.chartMetric")}
                </span>
                <div className="flex rounded-lg border border-white/10 light:border-theme-border-primary overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setChartMetric("chats")}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      chartMetric === "chats"
                        ? "bg-primary-button text-white"
                        : "bg-theme-bg-primary text-theme-text-secondary"
                    }`}
                  >
                    {t("usageAnalytics.metricChats")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("tokens")}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      chartMetric === "tokens"
                        ? "bg-primary-button text-white"
                        : "bg-theme-bg-primary text-theme-text-secondary"
                    }`}
                  >
                    {t("usageAnalytics.metricTokens")}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs text-theme-text-secondary">
                  {t("usageAnalytics.groupBy")}
                </span>
                <div className="flex rounded-lg border border-white/10 light:border-theme-border-primary overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGroupBy("workspace")}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      groupBy === "workspace"
                        ? "bg-primary-button text-white"
                        : "bg-theme-bg-primary text-theme-text-secondary"
                    }`}
                  >
                    {t("usageAnalytics.groupByWorkspace")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupBy("user")}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      groupBy === "user"
                        ? "bg-primary-button text-white"
                        : "bg-theme-bg-primary text-theme-text-secondary"
                    }`}
                  >
                    {t("usageAnalytics.groupByUser")}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-theme-bg-primary rounded-xl border border-white/10 light:border-theme-border-primary p-4 min-h-[340px]">
              {summaryLoading ? (
                <Skeleton.default
                  height={300}
                  width="100%"
                  highlightColor="var(--theme-bg-secondary)"
                  baseColor="var(--theme-bg-primary)"
                />
              ) : summaryError ? (
                <p className="text-sm text-red-400">{summaryError}</p>
              ) : chartData.length === 0 ? (
                <p className="text-sm text-theme-text-secondary">
                  {t("usageAnalytics.noData")}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--theme-sidebar-border)"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "var(--theme-text-secondary)",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{
                        fill: "var(--theme-text-secondary)",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--theme-bg-secondary)",
                        border: "1px solid var(--theme-border-primary)",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "var(--theme-text-primary)" }}
                    />
                    {groupBy === "workspace" && isAllWorkspaces && allWorkspaceIds.length > 0 ? (
                      <>
                        {allWorkspaceIds.map((wsId, i) => (
                          <Bar
                            key={wsId}
                            dataKey={`ws_${wsId}_${
                              chartMetric === "chats" ? "chats" : "tokens"
                            }`}
                            stackId="a"
                            fill={WORKSPACE_COLORS[i % WORKSPACE_COLORS.length]}
                            name={wsNameMap[wsId] ?? `Workspace ${wsId}`}
                            radius={
                              i === allWorkspaceIds.length - 1
                                ? [4, 4, 0, 0]
                                : [0, 0, 0, 0]
                            }
                          />
                        ))}
                        <Legend
                          wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                          contentStyle={{
                            color: "var(--theme-text-primary)",
                            fontSize: 12,
                          }}
                        />
                      </>
                    ) : groupBy === "user" && isAllUsers && allUserIds.length > 0 ? (
                      <>
                        {allUserIds.map((uId, i) => (
                          <Bar
                            key={uId}
                            dataKey={`usr_${uId}_${
                              chartMetric === "chats" ? "chats" : "tokens"
                            }`}
                            stackId="a"
                            fill={WORKSPACE_COLORS[i % WORKSPACE_COLORS.length]}
                            name={userNameMap[uId] ?? `User ${uId}`}
                            radius={
                              i === allUserIds.length - 1
                                ? [4, 4, 0, 0]
                                : [0, 0, 0, 0]
                            }
                          />
                        ))}
                        <Legend
                          wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                          contentStyle={{
                            color: "var(--theme-text-primary)",
                            fontSize: 12,
                          }}
                        />
                      </>
                    ) : (
                      <Bar
                        dataKey={dataKey}
                        fill="#6b8afd"
                        radius={[4, 4, 0, 0]}
                        name={
                          chartMetric === "chats"
                            ? t("usageAnalytics.metricChats")
                            : t("usageAnalytics.metricTokens")
                        }
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="overflow-x-auto">
              <p className="text-sm font-semibold text-theme-text-primary mb-2">
                {t("usageAnalytics.tableTitle")}
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
                        <th className="py-2 pr-4">
                          {t("usageAnalytics.colDate")}
                        </th>
                        <th className="py-2 pr-4">
                          {t("usageAnalytics.colWorkspace")}
                        </th>
                        <th className="py-2 pr-4">
                          {t("usageAnalytics.colUser")}
                        </th>
                        <th className="py-2 pr-4">
                          {t("usageAnalytics.colViaApi")}
                        </th>
                        <th className="py-2 pr-4">
                          {t("usageAnalytics.colTokenSource")}
                        </th>
                        <th className="py-2 pr-4 text-right">
                          {t("usageAnalytics.colPromptTokens")}
                        </th>
                        <th className="py-2 pr-4 text-right">
                          {t("usageAnalytics.colCompletionTokens")}
                        </th>
                        <th className="py-2 pr-4 text-right">
                          {t("usageAnalytics.colTotalTokens")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="py-2 pr-4 whitespace-nowrap text-theme-text-primary">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-theme-text-primary">
                            {r.workspaceName || r.workspaceSlug || r.workspaceId}
                          </td>
                          <td className="py-2 pr-4 text-theme-text-primary">
                            {r.username ||
                              (r.userId == null
                                ? t("usageAnalytics.unassignedUser")
                                : "—")}
                          </td>
                          <td className="py-2 pr-4">
                            {r.viaApi
                              ? t("usageAnalytics.yes")
                              : t("usageAnalytics.no")}
                          </td>
                          <td className="py-2 pr-4 text-theme-text-primary">
                            {r.tokenSource === "estimated"
                              ? t("usageAnalytics.tokenSourceEstimated")
                              : t("usageAnalytics.tokenSourceReported")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {r.promptTokens}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {r.completionTokens}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {r.totalTokens}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length === 0 && (
                    <p className="text-sm text-theme-text-secondary py-4">
                      {t("usageAnalytics.noRows")}
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
                        {t("usageAnalytics.prev")}
                      </button>
                      <span className="text-theme-text-secondary">
                        {t("usageAnalytics.pageOf", {
                          current: currentPage,
                          total: totalPages,
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={tableOffset + pageSize >= totalCount}
                        onClick={() =>
                          loadTable(tableOffset + pageSize, buildPayload())
                        }
                        className="px-3 py-1 rounded-lg bg-theme-bg-primary border border-white/10 text-theme-text-primary font-medium hover:bg-white/10 disabled:opacity-40"
                      >
                        {t("usageAnalytics.next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
