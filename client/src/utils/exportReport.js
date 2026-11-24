/**
 * Xuất báo cáo công việc ra tệp CSV chuẩn UTF-8 BOM (mở trực tiếp bằng Microsoft Excel không lỗi tiếng Việt)
 * và xuất bản in PDF trực quan
 */
function escapeCsvCell(val) {
  const str = String(val ?? "").replace(/"/g, '""');
  return `"${str}"`;
}

export function exportTasksToCsv(tasks = [], reportName = "BaoCaoCongViec") {
  const headers = [
    "Mã",
    "Tên công việc",
    "Trạng thái",
    "Mức độ ưu tiên",
    "Tiến độ (%)",
    "Ngày bắt đầu",
    "Hạn chót",
    "Lặp định kỳ",
    "Thành viên phụ trách",
    "Nhãn bảng",
    "Cập nhật gần nhất bởi",
  ];

  const rows = tasks.map((t) => [
    t.id,
    t.title,
    t.status || "",
    t.priority || "",
    t.progress ?? 0,
    t.startDate || "",
    t.dueDate || "",
    t.recurrence && t.recurrence !== "none" ? t.recurrence : "Không",
    (t.assignees || []).map((a) => a.name).join(", "),
    (t.labels || []).map((l) => l.name).join(", "),
    t.lastModifiedByName || "",
  ]);

  const csvLines = [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.map(escapeCsvCell).join(","))];
  const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printTasksReportPdf(tasks = [], boardTitle = "Báo Cáo Tiến Độ Công Việc") {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100).length;
  const avgProgress = total > 0 ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${boardTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 28px; }
    h1 { margin: 0 0 6px; font-size: 22px; color: #0f172a; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 18px; }
    .kpis { display: flex; gap: 14px; margin-bottom: 20px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
    .kpi strong { display: block; font-size: 20px; color: #0f766e; }
    .kpi span { font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${boardTitle}</h1>
  <div class="meta">Ngày xuất báo cáo: ${new Date().toLocaleString("vi-VN")} — Hệ thống Sổ Việc Nhóm</div>
  <div class="kpis">
    <div class="kpi"><strong>${total}</strong><span>Tổng công việc</span></div>
    <div class="kpi"><strong>${done}</strong><span>Đã hoàn thành</span></div>
    <div class="kpi"><strong>${avgProgress}%</strong><span>Tiến độ trung bình</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Tên công việc</th>
        <th>Trạng thái</th>
        <th>Ưu tiên</th>
        <th>Tiến độ</th>
        <th>Hạn chót</th>
        <th>Người phụ trách</th>
      </tr>
    </thead>
    <tbody>
      ${tasks
        .map(
          (t, i) => `<tr>
            <td>${i + 1}</td>
            <td>${String(t.title || "").replace(/</g, "&lt;")}</td>
            <td>${t.status || ""}</td>
            <td>${t.priority || ""}</td>
            <td>${t.progress ?? 0}%</td>
            <td>${t.dueDate || "—"}</td>
            <td>${(t.assignees || []).map((a) => a.name).join(", ") || "—"}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
