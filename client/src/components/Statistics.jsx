import React, { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  ListTodo,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Clock,
  CircleDashed,
  AlertCircle,
  RefreshCw,
  Search,
  CalendarDays,
  Users,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Check,
  FileText,
} from "lucide-react";
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";
import { useTheme } from "../context/ThemeContext";
import UserAvatar from "./UserAvatar";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIODS = [
  { id: "today", label: "Hôm nay" },
  { id: "7days", label: "7 ngày qua" },
  { id: "30days", label: "30 ngày qua" },
  { id: "month", label: "Tháng này" },
  { id: "all", label: "Tất cả" },
];

function hexToRgba(hex, alpha) {
  const clean = (hex || "#10B981").replace("#", "");
  if (clean.length !== 6) return `rgba(16, 185, 129, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Statistics({
  tasks = [],
  categories = [],
  setCurrentPage,
  setStatusPage,
  setSelectedTask,
}) {
  const { theme, accent, accentOptions } = useTheme();

  const goToStatus = (status) => {
    if (setStatusPage && setCurrentPage) {
      setStatusPage(status);
      setCurrentPage("status");
    }
  };

  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Completed Task Execution Inspector state
  const [completedSearch, setCompletedSearch] = useState("");
  const [inspectedTaskId, setInspectedTaskId] = useState(null);
  const [inspectedComments, setInspectedComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.isArchived && (t.status === "Hoàn thành" || Number(t.progress) === 100))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [tasks]);

  const filteredCompletedTasks = useMemo(() => {
    const q = completedSearch.trim().toLowerCase();
    if (!q) return completedTasks;
    return completedTasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.board?.name?.toLowerCase().includes(q)
    );
  }, [completedTasks, completedSearch]);

  const inspectedTask = useMemo(() => {
    if (completedTasks.length === 0) return null;
    const found = completedTasks.find((t) => t.id === inspectedTaskId);
    return found || completedTasks[0];
  }, [completedTasks, inspectedTaskId]);

  useEffect(() => {
    if (!inspectedTask?.id) {
      setInspectedComments([]);
      return;
    }
    let cancelled = false;
    const loadComments = async () => {
      try {
        setLoadingComments(true);
        const res = await fetch(API_ENDPOINTS.taskComments(inspectedTask.id), {
          headers: getAuthHeaders(),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setInspectedComments(Array.isArray(data) ? data : data.comments || []);
        }
      } catch {
        if (!cancelled) setInspectedComments([]);
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
    };
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [inspectedTask?.id]);

  const getCategoryName = (categoryId) => {
    const found = categories.find((c) => Number(c.id) === Number(categoryId));
    return found ? found.name : "Chưa phân loại";
  };

  const evaluateCompletionTiming = (task) => {
    if (!task) return { label: "—", tone: "neutral", durationText: "—" };
    const finishedDate = task.completedAt
      ? new Date(task.completedAt)
      : task.updatedAt
      ? new Date(task.updatedAt)
      : new Date();
    const startRef = task.startDate
      ? new Date(task.startDate)
      : task.createdAt
      ? new Date(task.createdAt)
      : finishedDate;

    const diffMs = Math.max(0, finishedDate.getTime() - startRef.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const durationText =
      diffDays >= 1 ? `${diffDays} ngày` : diffHours <= 24 ? `${diffHours} giờ` : "Trong ngày";

    if (!task.dueDate) {
      return { label: "Không đặt hạn", tone: "neutral", durationText };
    }

    const dueEnd = new Date(task.dueDate);
    dueEnd.setHours(23, 59, 59, 999);
    const deltaDays = Math.floor((dueEnd.getTime() - finishedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (deltaDays > 0) {
      return { label: `Sớm ${deltaDays} ngày`, tone: "good", durationText };
    }
    if (deltaDays === 0) {
      return { label: "Đúng hạn", tone: "good", durationText };
    }
    return { label: `Trễ ${Math.abs(deltaDays)} ngày`, tone: "late", durationText };
  };

  const formatViDate = (val, includeTime = false) => {
    if (!val) return "Chưa đặt";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return includeTime
      ? d.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : d.toLocaleDateString("vi-VN");
  };

  const fetchStats = async (period = selectedPeriod) => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_ENDPOINTS.stats}?period=${period}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Không thể tải dữ liệu thống kê từ máy chủ!");
      const data = await res.json();
      setStatsData(data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu thống kê:", err);
      setError(err.message || "Lỗi lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedPeriod);
  }, [selectedPeriod, tasks.length]);

  // Resolve real canvas colors for Chart.js from current ThemeContext
  const chartColors = useMemo(() => {
    const activeAccentHex =
      theme === "tet"
        ? "#F97316"
        : accentOptions.find((a) => a.id === accent)?.color || "#2563EB";

    if (theme === "light") {
      return {
        textPrimary: "#0F172A",
        textSecondary: "#64748B",
        gridColor: "rgba(15, 23, 42, 0.07)",
        accent: activeAccentHex,
        accentFill: hexToRgba(activeAccentHex, 0.12),
      };
    }
    if (theme === "tet") {
      return {
        textPrimary: "#F3EDE6",
        textSecondary: "#A99B94",
        gridColor: "rgba(212, 169, 106, 0.09)",
        accent: activeAccentHex,
        accentFill: hexToRgba(activeAccentHex, 0.14),
      };
    }
    return {
      textPrimary: "#FAFAFA",
      textSecondary: "#A1A1AA",
      gridColor: "rgba(255, 255, 255, 0.06)",
      accent: activeAccentHex,
      accentFill: hexToRgba(activeAccentHex, 0.14),
    };
  }, [theme, accent, accentOptions]);

  const overview = useMemo(() => {
    if (statsData?.overview) return statsData.overview;
    const completed = tasks.filter(
      (t) => t.status === "Hoàn thành" || t.progress === 100
    ).length;
    const inProg = tasks.filter(
      (t) =>
        t.status === "Đang thực hiện" ||
        t.status === "Đang làm" ||
        (t.progress > 0 && t.progress < 100)
    ).length;
    const notStart = tasks.filter(
      (t) => t.status === "Chưa bắt đầu" && (!t.progress || t.progress === 0)
    ).length;
    return {
      totalTasks: tasks.length,
      completedCount: completed,
      inProgressCount: inProg,
      notStartedCount: notStart,
      overdueCount: 0,
      completionRate:
        tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      averageProgress:
        tasks.length > 0
          ? Math.round(
              tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length
            )
          : 0,
      urgentCount: tasks.filter((t) => t.priority === "Khẩn cấp").length,
      highPriorityCount: tasks.filter(
        (t) => t.priority === "Cao" || t.priority === "Khẩn cấp"
      ).length,
    };
  }, [statsData, tasks]);

  const byStatus = useMemo(() => {
    return (
      statsData?.byStatus || {
        completed: overview.completedCount,
        inProgress: overview.inProgressCount,
        waiting: 0,
        notStarted: overview.notStartedCount,
        overdue: overview.overdueCount,
      }
    );
  }, [statsData, overview]);

  const byPriority = useMemo(() => {
    return (
      statsData?.byPriority || {
        urgent: tasks.filter((t) => t.priority === "Khẩn cấp").length,
        high: tasks.filter((t) => t.priority === "Cao").length,
        medium: tasks.filter((t) => t.priority === "Trung bình" || !t.priority).length,
        low: tasks.filter((t) => t.priority === "Thấp").length,
      }
    );
  }, [statsData, tasks]);

  const byCategory = useMemo(() => statsData?.byCategory || [], [statsData]);
  const lineChartDataRaw = useMemo(() => statsData?.lineChart || [], [statsData]);
  const byMember = useMemo(() => {
    if (Array.isArray(statsData?.byMember)) return statsData.byMember;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map();
    tasks.forEach((t) => {
      if (t.isArchived) return;
      const isDone = t.status === "Hoàn thành" || t.progress === 100;
      const isOverdue = !isDone && t.dueDate && new Date(t.dueDate).setHours(0, 0, 0, 0) < today.getTime();
      const isUrgent = !isDone && (t.priority === "Khẩn cấp" || t.priority === "Cao");
      (t.assignees || []).forEach((u) => {
        if (!map.has(u.id)) {
          map.set(u.id, {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            total: 0,
            active: 0,
            completed: 0,
            overdue: 0,
            urgent: 0,
          });
        }
        const row = map.get(u.id);
        row.total++;
        if (isDone) row.completed++;
        else row.active++;
        if (isOverdue) row.overdue++;
        if (isUrgent) row.urgent++;
      });
    });
    return [...map.values()]
      .map((m) => ({
        ...m,
        completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
        loadLevel: m.active >= 5 || m.overdue >= 2 ? "overloaded" : m.active >= 3 ? "busy" : "balanced",
      }))
      .sort((a, b) => b.active - a.active || b.total - a.total);
  }, [statsData, tasks]);

  const unassignedStats = useMemo(() => {
    if (statsData?.unassignedStats) return statsData.unassignedStats;
    const unassigned = tasks.filter((t) => !t.isArchived && (!t.assignees || t.assignees.length === 0));
    return {
      total: unassigned.length,
      active: unassigned.filter((t) => t.status !== "Hoàn thành" && t.progress !== 100).length,
    };
  }, [statsData, tasks]);

  // 1. Doughnut Chart (borderWidth: 0)
  const doughnutData = {
    labels: ["Hoàn thành", "Đang thực hiện", "Đang chờ", "Chưa bắt đầu", "Quá hạn"],
    datasets: [
      {
        data: [
          byStatus.completed || 0,
          byStatus.inProgress || 0,
          byStatus.waiting || 0,
          byStatus.notStarted || 0,
          byStatus.overdue || 0,
        ],
        backgroundColor: ["#10B981", "#3B82F6", "#F59E0B", "#71717A", "#EF4444"],
        hoverBackgroundColor: ["#059669", "#2563EB", "#D97706", "#52525B", "#DC2626"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 12, weight: 500 },
          padding: 14,
          boxWidth: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const val = context.raw || 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return ` ${context.label}: ${val} việc (${pct}%)`;
          },
        },
      },
    },
    cutout: "72%",
  };

  // 2. Bar Chart: Category
  const barData = {
    labels: byCategory.length > 0 ? byCategory.map((c) => c.name) : ["Chưa có danh mục"],
    datasets: [
      {
        label: "Tổng công việc",
        data: byCategory.length > 0 ? byCategory.map((c) => c.total) : [0],
        backgroundColor: chartColors.accent,
        borderRadius: 6,
      },
      {
        label: "Đã hoàn thành",
        data: byCategory.length > 0 ? byCategory.map((c) => c.completed) : [0],
        backgroundColor: "#3B82F6",
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 12, weight: 500 },
          boxWidth: 10,
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: chartColors.textSecondary, font: { family: "Be Vietnam Pro", size: 11.5 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartColors.gridColor },
        border: { display: false },
        ticks: {
          stepSize: 1,
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 11.5 },
        },
      },
    },
  };

  // 3. Line Chart: 30-day completion trend
  const lineLabels = lineChartDataRaw.map((d) => {
    const parts = d.date.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
  });

  const lineData = {
    labels: lineLabels.length > 0 ? lineLabels : ["Không có dữ liệu"],
    datasets: [
      {
        label: "Công việc hoàn thành",
        data: lineChartDataRaw.map((d) => d.count),
        fill: true,
        borderColor: chartColors.accent,
        backgroundColor: chartColors.accentFill,
        tension: 0.35,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        pointBackgroundColor: chartColors.accent,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Hoàn thành: ${ctx.raw} công việc`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          maxTicksLimit: 10,
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartColors.gridColor },
        border: { display: false },
        ticks: {
          stepSize: 1,
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 11.5 },
        },
      },
    },
  };

  // 4. Priority Horizontal Bar Chart
  const priorityData = {
    labels: ["Khẩn cấp", "Cao", "Trung bình", "Thấp"],
    datasets: [
      {
        label: "Số lượng",
        data: [
          byPriority.urgent || 0,
          byPriority.high || 0,
          byPriority.medium || 0,
          byPriority.low || 0,
        ],
        backgroundColor: ["#EF4444", "#EA580C", "#3B82F6", "#10B981"],
        borderRadius: 6,
      },
    ],
  };

  const priorityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          stepSize: 1,
          color: chartColors.textSecondary,
          font: { family: "Be Vietnam Pro", size: 11.5 },
        },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: chartColors.textPrimary,
          font: { family: "Be Vietnam Pro", size: 12, weight: 500 },
        },
      },
    },
  };

  // Productivity assessment (dark-friendly translucent tones)
  let productivityLevel = "Ổn định";
  let productivityStyle = {
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.25)",
    color: theme === "light" ? "#047857" : "#6EE7B7",
  };
  let productivityAdvice =
    "Nhóm đang duy trì tiến độ công việc đều đặn và đúng kế hoạch.";

  if (overview.overdueCount > 2 || overview.completionRate < 30) {
    productivityLevel = "Cần cải thiện";
    productivityStyle = {
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.25)",
      color: theme === "light" ? "#B91C1C" : "#FCA5A5",
    };
    productivityAdvice =
      "Hãy tập trung xử lý các đầu việc quá hạn và sắp xếp lại mức độ ưu tiên hàng ngày.";
  } else if (overview.completionRate >= 75 && overview.overdueCount === 0) {
    productivityLevel = "Xuất sắc";
    productivityStyle = {
      bg: "rgba(217, 119, 6, 0.12)",
      border: "rgba(217, 119, 6, 0.25)",
      color: theme === "light" ? "#B45309" : "#FCD34D",
    };
    productivityAdvice =
      "Hiệu suất làm việc rất cao — phần lớn nhiệm vụ đều hoàn thành đúng hạn.";
  }

  if (loading && !statsData) {
    return (
      <section className="statistics-page page-enter">
        <header className="page-header">
          <div className="page-header-left">
            <h1>Thống kê & Hiệu suất</h1>
            <p>Đang tổng hợp dữ liệu báo cáo từ hệ thống...</p>
          </div>
        </header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: 112 }} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="statistics-page page-enter">
      {/* HEADER & PERIOD FILTER */}
      <header
        className="page-header"
        style={{ alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}
      >
        <div className="page-header-left">
          <h1>Thống kê & Báo cáo hiệu suất</h1>
          <p>Phân tích tiến độ, phân bổ danh mục và xu hướng hoàn thành công việc</p>
        </div>

        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: 9,
            padding: 3,
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPeriod(p.id)}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: selectedPeriod === p.id ? 600 : 500,
                background:
                  selectedPeriod === p.id ? "var(--accent-color)" : "transparent",
                color:
                  selectedPeriod === p.id
                    ? "var(--accent-fg)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.14s ease",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* ERROR BAR — DARK TRANSLUCENT RED */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: theme === "light" ? "#B91C1C" : "#FCA5A5",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <AlertTriangle size={16} strokeWidth={1.75} />
            {error}
          </span>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => fetchStats(selectedPeriod)}
          >
            <RefreshCw size={13} strokeWidth={1.75} />
            Thử lại
          </button>
        </div>
      )}

      {/* 4 VERTICAL KPI CARDS (Label -> 28px Bold Number -> Subtext) */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          className="card card-hoverable"
          onClick={() => goToStatus("all")}
          style={{
            padding: "18px 20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
              Tổng công việc
            </span>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ListTodo size={15} strokeWidth={1.75} />
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15 }}>
            {overview.totalTasks}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {overview.completedCount} hoàn thành · {overview.inProgressCount} đang làm
          </span>
        </button>

        <button
          type="button"
          className="card card-hoverable"
          onClick={() => goToStatus("completed")}
          style={{
            padding: "18px 20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
              Tỷ lệ hoàn thành
            </span>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={15} strokeWidth={1.75} />
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15 }}>
            {overview.completionRate}%
          </div>
          <div className="progress-bar-wrap" style={{ height: 5, marginTop: 4 }}>
            <div
              className="progress-bar-fill success"
              style={{ width: `${overview.completionRate}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          className="card card-hoverable"
          onClick={() => goToStatus("doing")}
          style={{
            padding: "18px 20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
              Tiến độ trung bình
            </span>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "var(--accent-soft)",
                color: "var(--accent-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={15} strokeWidth={1.75} />
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15 }}>
            {overview.averageProgress}%
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Trung bình trên toàn bộ nhiệm vụ
          </span>
        </button>

        <button
          type="button"
          className="card card-hoverable"
          onClick={() => goToStatus("urgent")}
          style={{
            padding: "18px 20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
              Cần xử lý gấp
            </span>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={15} strokeWidth={1.75} />
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: overview.overdueCount > 0 ? "#F87171" : "var(--text-primary)",
              lineHeight: 1.15,
            }}
          >
            {overview.overdueCount + overview.urgentCount}
          </div>
          <span style={{ fontSize: 12, color: "#F87171" }}>
            {overview.overdueCount} quá hạn · {overview.urgentCount} khẩn cấp
          </span>
        </button>
      </section>

      {/* 5 STATUS BREAKDOWN PILLS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 10,
          marginBottom: 22,
        }}
      >
        {[
          { key: "completed", label: "Hoàn thành", count: byStatus.completed || 0, color: "#10B981", icon: <CheckCircle2 size={14} strokeWidth={1.75} /> },
          { key: "doing", label: "Đang thực hiện", count: byStatus.inProgress || 0, color: "#3B82F6", icon: <Zap size={14} strokeWidth={1.75} /> },
          { key: "waiting", label: "Đang chờ", count: byStatus.waiting || 0, color: "#F59E0B", icon: <Clock size={14} strokeWidth={1.75} /> },
          { key: "not_started", label: "Chưa bắt đầu", count: byStatus.notStarted || 0, color: "var(--text-secondary)", icon: <CircleDashed size={14} strokeWidth={1.75} /> },
          { key: "overdue", label: "Quá hạn", count: byStatus.overdue || 0, color: "#EF4444", icon: <AlertCircle size={14} strokeWidth={1.75} /> },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className="card"
            onClick={() => goToStatus(item.key)}
            style={{
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: item.color }}>
              {item.icon}
              {item.label}
            </span>
            <strong style={{ fontSize: 15, color: item.color }}>{item.count}</strong>
          </button>
        ))}
      </div>

      {/* 2x2 CHARTS GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 18,
        }}
      >
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Phân bổ trạng thái công việc
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--text-secondary)" }}>
            Tỷ trọng các nhóm nhiệm vụ hiện tại
          </p>
          <div style={{ height: 250, position: "relative" }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Công việc theo danh mục
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--text-secondary)" }}>
            So sánh tổng số việc và số việc đã hoàn thành
          </p>
          <div style={{ height: 250 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Tiến độ hoàn thành theo thời gian
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--text-secondary)" }}>
            Số công việc hoàn thành qua từng ngày (30 ngày gần nhất)
          </p>
          <div style={{ height: 240 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Phân bổ mức độ ưu tiên
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--text-secondary)" }}>
              Phân cấp mức độ quan trọng của các thẻ công việc
            </p>
            <div style={{ height: 155 }}>
              <Bar data={priorityData} options={priorityOptions} />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 10,
              background: productivityStyle.bg,
              border: `1px solid ${productivityStyle.border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: productivityStyle.color, marginBottom: 3 }}>
              Đánh giá năng suất: {productivityLevel}
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: productivityStyle.color, opacity: 0.92, lineHeight: 1.45 }}>
              {productivityAdvice}
            </p>
          </div>
        </div>
      </section>

      {/* TEAM WORKLOAD / CAPACITY BREAKDOWN */}
      <section className="tech-panel" style={{ marginTop: 18 }}>
        <div className="tech-panel-head">
          <div className="tech-panel-title">
            <Users size={16} strokeWidth={1.85} />
            <h2>Phân bổ khối lượng công việc theo thành viên ({byMember.length})</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {unassignedStats.active > 0 && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(245, 158, 11, 0.14)",
                  color: "#d97706",
                }}
              >
                {unassignedStats.active} việc đang mở chưa phân công
              </span>
            )}
            <span className="tech-module-code">TEAM.WORKLOAD</span>
          </div>
        </div>

        {byMember.length === 0 ? (
          <div style={{ padding: "22px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
            Chưa có công việc nào được gán thành viên phụ trách. Hãy gán thành viên trên thẻ Kanban để theo dõi tải công việc của từng người.
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: 12,
            }}
          >
            {byMember.map((member) => {
              const loadBadge =
                member.loadLevel === "overloaded"
                  ? { label: "Quá tải", bg: "rgba(239,68,68,0.14)", color: "#ef4444" }
                  : member.loadLevel === "busy"
                  ? { label: "Đang bận", bg: "rgba(245,158,11,0.14)", color: "#d97706" }
                  : { label: "Cân bằng", bg: "rgba(16,185,129,0.14)", color: "#10b981" };
              const donePct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
              const overduePct = member.total > 0 ? Math.round((member.overdue / member.total) * 100) : 0;
              const activeNormalPct = Math.max(0, 100 - donePct - overduePct);

              return (
                <div
                  key={member.id}
                  style={{
                    padding: 14,
                    borderRadius: 11,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <UserAvatar avatar={member.avatar} name={member.name} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {member.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          {member.total} việc · Hoàn thành {member.completionRate}%
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: loadBadge.bg,
                        color: loadBadge.color,
                        flexShrink: 0,
                      }}
                    >
                      {loadBadge.label}
                    </span>
                  </div>

                  {/* Stacked Workload Bar */}
                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: "var(--border-color)",
                      overflow: "hidden",
                      display: "flex",
                    }}
                    title={`Hoàn thành: ${member.completed} | Đang làm: ${Math.max(0, member.active - member.overdue)} | Quá hạn: ${member.overdue}`}
                  >
                    <div style={{ width: `${donePct}%`, background: "#10B981" }} />
                    <div style={{ width: `${activeNormalPct}%`, background: "#3B82F6" }} />
                    <div style={{ width: `${overduePct}%`, background: "#EF4444" }} />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      fontSize: 11.5,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ padding: "5px 4px", borderRadius: 7, background: "var(--bg-surface)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Đang mở</div>
                      <strong style={{ color: "#3B82F6" }}>{member.active}</strong>
                    </div>
                    <div style={{ padding: "5px 4px", borderRadius: 7, background: "var(--bg-surface)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Xong</div>
                      <strong style={{ color: "#10B981" }}>{member.completed}</strong>
                    </div>
                    <div style={{ padding: "5px 4px", borderRadius: 7, background: "var(--bg-surface)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Quá hạn</div>
                      <strong style={{ color: member.overdue > 0 ? "#EF4444" : "var(--text-primary)" }}>
                        {member.overdue}
                      </strong>
                    </div>
                    <div style={{ padding: "5px 4px", borderRadius: 7, background: "var(--bg-surface)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 10.5 }}>Ưu tiên</div>
                      <strong style={{ color: member.urgent > 0 ? "#F59E0B" : "var(--text-primary)" }}>
                        {member.urgent}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMPLETED TASK EXECUTION AUDIT INSPECTOR */}
      <section className="tech-panel stats-completed-panel">
        <div className="tech-panel-head">
          <div className="tech-panel-title">
            <CheckCircle2 size={16} strokeWidth={1.85} />
            <h2>Phân tích chi tiết công việc đã hoàn thành ({completedTasks.length})</h2>
          </div>

          <div className="stats-audit-head-right">
            {completedTasks.length > 0 && (
              <select
                className="stats-completed-select"
                value={inspectedTask?.id || ""}
                onChange={(e) => setInspectedTaskId(Number(e.target.value))}
                aria-label="Chọn nhanh công việc đã hoàn thành"
              >
                {completedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
            <span className="tech-module-code">COMPLETED.AUDIT</span>
          </div>
        </div>

        {completedTasks.length === 0 ? (
          <div className="stats-audit-empty">
            <div className="stats-audit-empty-icon">
              <CheckCircle2 size={22} strokeWidth={1.75} />
            </div>
            <h3>Chưa có công việc nào hoàn thành</h3>
            <p>
              Khi bạn hoàn thành một công việc (đạt 100% hoặc chuyển sang cột Hoàn thành), toàn bộ lịch sử thực hiện, bước con và đánh giá đúng hạn sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="stats-audit-workbench">
            {/* LEFT LIST: SELECT ANY COMPLETED TASK */}
            <div className="stats-audit-list-col">
              <div className="stats-audit-search">
                <Search size={14} strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Tìm công việc đã hoàn thành..."
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                />
              </div>

              <div className="stats-audit-list">
                {filteredCompletedTasks.length === 0 ? (
                  <div className="stats-audit-no-match">Không tìm thấy công việc phù hợp.</div>
                ) : (
                  filteredCompletedTasks.map((task) => {
                    const isSelected = inspectedTask?.id === task.id;
                    const timing = evaluateCompletionTiming(task);
                    const totalSteps = task.progressSteps?.length || 0;
                    const doneSteps = task.progressSteps?.filter((s) => s.completed).length || 0;

                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={`stats-audit-item ${isSelected ? "active" : ""}`}
                        onClick={() => setInspectedTaskId(task.id)}
                      >
                        <div className="stats-audit-item-top">
                          <span className="stats-audit-item-title">{task.title}</span>
                          <span className={`stats-timing-pill is-${timing.tone}`}>
                            {timing.label}
                          </span>
                        </div>

                        <div className="stats-audit-item-meta">
                          <span>{task.board?.name || getCategoryName(task.categoryId)}</span>
                          <span>
                            {totalSteps > 0 ? `${doneSteps}/${totalSteps} bước` : "100%"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT DETAIL REPORT: HOW THIS TASK WAS COMPLETED */}
            {inspectedTask && (() => {
              const timing = evaluateCompletionTiming(inspectedTask);
              const steps = inspectedTask.progressSteps || [];
              const doneStepsCount = steps.filter((s) => s.completed).length;
              const assignees = inspectedTask.assignees || [];

              return (
                <div className="stats-audit-detail">
                  {/* TOP TITLE & ACTION */}
                  <div className="stats-audit-detail-head">
                    <div>
                      <div className="stats-audit-badges">
                        <span className="stats-done-chip">
                          <Check size={12} strokeWidth={2.5} />
                          Hoàn thành 100%
                        </span>
                        <span className={`stats-timing-pill is-${timing.tone}`}>
                          {timing.label}
                        </span>
                        {inspectedTask.priority && (
                          <span className="stats-meta-chip">Ưu tiên: {inspectedTask.priority}</span>
                        )}
                        {inspectedTask.board && (
                          <span className="stats-meta-chip">
                            <i
                              style={{
                                background: inspectedTask.board.coverColor || "var(--accent-color)",
                              }}
                            />
                            {inspectedTask.board.name}
                          </span>
                        )}
                      </div>
                      <h3>{inspectedTask.title}</h3>
                    </div>

                    {setSelectedTask && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedTask(inspectedTask)}
                      >
                        <ExternalLink size={14} strokeWidth={1.85} />
                        Mở chi tiết thẻ
                      </button>
                    )}
                  </div>

                  {/* 4 EXECUTION METRIC CELLS */}
                  <div className="stats-audit-kpi-row">
                    <div className="stats-audit-kpi">
                      <span>Đánh giá tiến độ</span>
                      <strong className={`tone-${timing.tone}`}>{timing.label}</strong>
                    </div>
                    <div className="stats-audit-kpi">
                      <span>Thời gian xử lý</span>
                      <strong>{timing.durationText}</strong>
                    </div>
                    <div className="stats-audit-kpi">
                      <span>Bước con đã hoàn tất</span>
                      <strong>
                        {steps.length > 0 ? `${doneStepsCount}/${steps.length} bước` : "Hoàn tất trực tiếp"}
                      </strong>
                    </div>
                    <div className="stats-audit-kpi">
                      <span>Cộng tác &amp; Tài liệu</span>
                      <strong>
                        {inspectedTask.commentCount || inspectedComments.length} trao đổi ·{" "}
                        {inspectedTask.attachmentCount || 0} tệp
                      </strong>
                    </div>
                  </div>

                  {/* TIMELINE MILESTONES */}
                  <div className="stats-audit-timeline">
                    <div className="stats-timeline-node">
                      <CalendarDays size={14} strokeWidth={1.75} />
                      <div>
                        <span>Bắt đầu / Khởi tạo</span>
                        <strong>{formatViDate(inspectedTask.startDate || inspectedTask.createdAt)}</strong>
                      </div>
                    </div>
                    <div className="stats-timeline-node">
                      <Clock size={14} strokeWidth={1.75} />
                      <div>
                        <span>Hạn chót đặt ra</span>
                        <strong>{formatViDate(inspectedTask.dueDate)}</strong>
                      </div>
                    </div>
                    <div className="stats-timeline-node is-done">
                      <CheckCircle2 size={14} strokeWidth={1.85} />
                      <div>
                        <span>Thời gian hoàn thành</span>
                        <strong>{formatViDate(inspectedTask.completedAt || inspectedTask.updatedAt, true)}</strong>
                      </div>
                    </div>
                    <div className="stats-timeline-node">
                      <Users size={14} strokeWidth={1.75} />
                      <div>
                        <span>Sửa đổi gần nhất</span>
                        <strong>
                          {inspectedTask.lastModifiedBy?.name ||
                            inspectedTask.lastModifiedByName ||
                            inspectedTask.creator?.name ||
                            "Người dùng"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* STEPS BREAKDOWN + PARTICIPANTS / NOTES */}
                  <div className="stats-audit-columns">
                    <div className="stats-audit-box">
                      <div className="stats-audit-box-title">
                        <ListTodo size={14} strokeWidth={1.85} />
                        <span>Các bước thực hiện ({steps.length})</span>
                      </div>

                      {steps.length === 0 ? (
                        <p className="stats-audit-muted">
                          Công việc này không chia bước con và đã được đánh dấu hoàn thành 100% trực tiếp.
                        </p>
                      ) : (
                        <div className="stats-steps-list">
                          {steps.map((s, idx) => (
                            <div key={s.id || idx} className={`stats-step-item ${s.completed ? "done" : ""}`}>
                              <span className={`stats-step-check ${s.completed ? "checked" : ""}`}>
                                {s.completed && <Check size={11} strokeWidth={2.6} />}
                              </span>
                              <span className="stats-step-num">#{idx + 1}</span>
                              <span className="stats-step-text">{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="stats-audit-box">
                      <div className="stats-audit-box-title">
                        <Users size={14} strokeWidth={1.85} />
                        <span>Người thực hiện &amp; Ghi chú</span>
                      </div>

                      <div className="stats-assignees-wrap">
                        {assignees.length > 0 ? (
                          assignees.map((member) => (
                            <div key={member.id} className="stats-member-chip">
                              <UserAvatar avatar={member.avatar} name={member.name} size={22} />
                              <span>{member.name}</span>
                            </div>
                          ))
                        ) : inspectedTask.creator ? (
                          <div className="stats-member-chip">
                            <UserAvatar
                              avatar={inspectedTask.creator.avatar}
                              name={inspectedTask.creator.name}
                              size={22}
                            />
                            <span>{inspectedTask.creator.name} (Người tạo)</span>
                          </div>
                        ) : (
                          <span className="stats-audit-muted">Thực hiện cá nhân</span>
                        )}
                      </div>

                      {(inspectedTask.description || inspectedTask.notes) && (
                        <div className="stats-audit-notes">
                          {inspectedTask.description && (
                            <div className="stats-note-block">
                              <strong>
                                <FileText size={12} strokeWidth={1.85} /> Mô tả công việc
                              </strong>
                              <p>{inspectedTask.description}</p>
                            </div>
                          )}
                          {inspectedTask.notes && (
                            <div className="stats-note-block">
                              <strong>
                                <Paperclip size={12} strokeWidth={1.85} /> Ghi chú đúc kết
                              </strong>
                              <p>{inspectedTask.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RECENT COMMENTS LOG ON THIS COMPLETED TASK */}
                  <div className="stats-audit-box">
                    <div className="stats-audit-box-title">
                      <MessageSquare size={14} strokeWidth={1.85} />
                      <span>Nhật ký trao đổi trong quá trình làm ({inspectedComments.length})</span>
                    </div>

                    {loadingComments ? (
                      <p className="stats-audit-muted">Đang tải lịch sử trao đổi...</p>
                    ) : inspectedComments.length === 0 ? (
                      <p className="stats-audit-muted">Chưa có bình luận nào trên công việc này.</p>
                    ) : (
                      <div className="stats-comments-list">
                        {inspectedComments.slice(-4).map((c) => (
                          <div key={c.id} className="stats-comment-row">
                            <UserAvatar avatar={c.user?.avatar} name={c.user?.name} size={26} />
                            <div className="stats-comment-body">
                              <div className="stats-comment-meta">
                                <strong>{c.user?.name || "Thành viên"}</strong>
                                <span>{formatViDate(c.createdAt, true)}</span>
                              </div>
                              <p>{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </section>
  );
}

export default Statistics;
