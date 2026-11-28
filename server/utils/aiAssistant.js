/**
 * SHARED AI ASSISTANT ENGINE FOR KANOFLOW
 * Dùng chung cho:
 * 1. Trợ lý ảo cá nhân (/api/ai/chat)
 * 2. @troliao trong Bình luận từng công việc (/api/tasks/:taskId/comments)
 * 3. @troliao trong Phòng Chat nhóm dự án (/api/boards/:boardId/messages)
 */

const AI_BOT_AUTHOR = Object.freeze({
  id: 0,
  name: "Trợ lý ảo KanoFlow",
  email: "ai@kanoflow.local",
  avatar: null,
  isAi: true,
});

// Nhận diện @troliao, @ troliao, @trolyao, @troly, @ai (không phân biệt hoa thường)
const AI_MENTION_REGEX = /(?:^|\s)@\s*(?:troliao|trolyao|troly|ai)(?=$|[\s,.;:!?])/i;

function hasAiMention(text) {
  if (!text || typeof text !== "string") return false;
  return AI_MENTION_REGEX.test(text);
}

function stripAiMention(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/@\s*(?:troliao|trolyao|troly|ai)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAiRuntimeConfig() {
  const provider = process.env.AI_PROVIDER || "gemini";
  const apiKey = (process.env.AI_API_KEY || "").trim();
  const model =
    process.env.AI_MODEL ||
    (provider === "openai" ? "gpt-4o-mini" : "gemini-3.1-flash-lite");
  return { provider, apiKey, model };
}

async function callGeminiSimple(systemPrompt, userMessage, apiKey, model) {
  const modelsToTry = [
    model || "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError = null;
  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 1200 },
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini ${m} (${response.status}): ${errText.slice(0, 140)}`);
        continue;
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) return text.trim();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Gemini không phản hồi");
}

async function callOpenAISimple(systemPrompt, userMessage, apiKey, model) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.65,
      max_tokens: 1200,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI (${response.status}): ${errText.slice(0, 140)}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI trả phản hồi trống");
  return text.trim();
}

function buildLocalTaskFallback({ task, steps = [], assignees = [], recentComments = [], prompt, requesterName }) {
  const cleanQ = stripAiMention(prompt) || "Phân tích và gợi ý bước tiếp theo cho công việc này";
  const doneSteps = steps.filter((s) => s.completed);
  const pendingSteps = steps.filter((s) => !s.completed);
  const pct = steps.length > 0 ? Math.round((doneSteps.length / steps.length) * 100) : task.progress || 0;

  let deadlineNote = "Chưa đặt hạn chót — nhóm nên chốt deadline rõ ràng để tránh trôi việc.";
  if (task.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / 86400000);
    if (pct === 100 || task.status === "Hoàn thành") {
      deadlineNote = `Công việc đã hoàn thành (hạn ${task.dueDate}).`;
    } else if (diffDays < 0) {
      deadlineNote = `Đã quá hạn ${Math.abs(diffDays)} ngày (hạn ${task.dueDate}) — cần ưu tiên xử lý gấp!`;
    } else if (diffDays === 0) {
      deadlineNote = `Đến hạn NGAY HÔM NAY (${task.dueDate}) — cần chốt bàn giao trong ngày.`;
    } else {
      deadlineNote = `Còn ${diffDays} ngày đến hạn (${task.dueDate}).`;
    }
  }

  const assigneeNames = assignees.length > 0 ? assignees.map((a) => a.name).join(", ") : "Chưa gán người phụ trách";
  const nextStepsText =
    pendingSteps.length > 0
      ? pendingSteps
          .slice(0, 3)
          .map((s, idx) => `${idx + 1}. ${s.title}`)
          .join("\n")
      : pct === 100
      ? "Toàn bộ bước con đã xong — nhóm có thể rà soát cuối và chuyển thẻ sang cột Hoàn thành."
      : "1. Chia nhỏ công việc thành 2–4 bước cụ thể trong Checklist.\n2. Phân rõ người chịu trách nhiệm chính cho từng bước.\n3. Cập nhật tiến độ và chốt kiểm thử trước hạn 24h.";

  return [
    `Chào ${requesterName || "nhóm"}, mình đã phân tích thẻ "${task.title}" theo yêu cầu: "${cleanQ}"`,
    ``,
    `• Hiện trạng: ${task.status || "Đang mở"} (${pct}%) | Ưu tiên: ${task.priority || "Trung bình"} | Phụ trách: ${assigneeNames}`,
    `• Đánh giá hạn chót: ${deadlineNote}`,
    `• Gợi ý hành động tiếp theo:\n${nextStepsText}`,
    recentComments.length > 0
      ? `• Đã tổng hợp từ ${recentComments.length} trao đổi gần nhất của nhóm trên thẻ này.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLocalBoardFallback({ board, columns = [], tasks = [], members = [], prompt, requesterName }) {
  const cleanQ = stripAiMention(prompt) || "Tóm tắt tình hình và gợi ý ưu tiên cho cả dự án";
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });
  const urgent = tasks.filter(
    (t) => (t.priority === "Khẩn cấp" || t.priority === "Cao") && t.status !== "Hoàn thành" && t.progress !== 100
  );
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const colSummary = columns
    .map((c) => `${c.title}: ${tasks.filter((t) => Number(t.columnId) === Number(c.id)).length}`)
    .join(" | ");

  const focusList = [...overdue, ...urgent]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, 3)
    .map((t, i) => `${i + 1}. ${t.title} (${t.priority}${t.dueDate ? ` · hạn ${t.dueDate}` : ""})`)
    .join("\n");

  return [
    `Chào ${requesterName || "cả nhóm"}, đây là phân tích nhanh cho dự án "${board.name}" (${cleanQ}):`,
    ``,
    `• Tiến độ chung: ${completed}/${total} công việc hoàn thành (${rate}%) | Thành viên: ${members.length}`,
    colSummary ? `• Phân bổ cột: ${colSummary}` : "",
    overdue.length > 0
      ? `• Cảnh báo: Có ${overdue.length} công việc đã quá hạn cần xử lý ngay.`
      : `• Rất tốt: Hiện chưa có công việc nào quá hạn trong dự án.`,
    focusList
      ? `• Đề xuất ưu tiên ngay cho nhóm:\n${focusList}`
      : `• Gợi ý: Nhóm có thể tạo thêm đầu việc cho tuần tới và phân bổ đều theo thành viên.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateTaskAiReply({ task, steps = [], assignees = [], recentComments = [], prompt, requesterName }) {
  const { provider, apiKey, model } = getAiRuntimeConfig();
  const cleanQ = stripAiMention(prompt) || "Hãy phân tích tình trạng hiện tại và đề xuất các bước thực hiện tối ưu cho công việc này.";

  if (!apiKey) {
    return buildLocalTaskFallback({ task, steps, assignees, recentComments, prompt: cleanQ, requesterName });
  }

  const stepsText =
    steps.length > 0
      ? steps.map((s) => `- [${s.completed ? "x" : " "}] ${s.title}`).join("\n")
      : "(Chưa có bước checklist)";
  const assigneesText =
    assignees.length > 0 ? assignees.map((a) => a.name).join(", ") : "(Chưa phân công)";
  const commentsText =
    recentComments.length > 0
      ? recentComments
          .slice(-6)
          .map((c) => `- ${c.authorName}: ${c.content}`)
          .join("\n")
      : "(Chưa có bình luận trước đó)";

  const systemPrompt = `Bạn là "Trợ lý ảo KanoFlow" đang tham gia hỗ trợ trực tiếp trong phần bình luận của một công việc nhóm.
Trả lời bằng tiếng Việt ngắn gọn, rõ ràng, thực tế, có gạch đầu dòng dễ đọc để TẤT CẢ thành viên trong công việc cùng xem và áp dụng ngay (tối đa khoảng 180 từ).

NGỮ CẢNH CÔNG VIỆC HIỆN TẠI:
- Tên công việc: ${task.title}
- Mô tả: ${task.description || "Không có"}
- Trạng thái: ${task.status} | Tiến độ: ${task.progress || 0}% | Ưu tiên: ${task.priority}
- Bắt đầu: ${task.startDate || "Chưa đặt"} | Hạn chót: ${task.dueDate || "Chưa đặt"}
- Người phụ trách: ${assigneesText}
- Ghi chú: ${task.notes || "Không có"}
- Checklist các bước:
${stepsText}
- Trao đổi gần đây của nhóm:
${commentsText}`;

  const userMsg = `${requesterName || "Một thành viên"} vừa gọi @troliao và hỏi: ${cleanQ}`;

  try {
    if (provider === "openai") {
      return await callOpenAISimple(systemPrompt, userMsg, apiKey, model);
    }
    return await callGeminiSimple(systemPrompt, userMsg, apiKey, model);
  } catch (err) {
    console.warn("Task @troliao AI fallback:", err.message);
    return buildLocalTaskFallback({ task, steps, assignees, recentComments, prompt: cleanQ, requesterName });
  }
}

async function generateBoardAiReply({ board, columns = [], tasks = [], members = [], recentMessages = [], prompt, requesterName }) {
  const { provider, apiKey, model } = getAiRuntimeConfig();
  const cleanQ = stripAiMention(prompt) || "Hãy phân tích tình hình dự án hiện tại và đề xuất những việc nhóm cần ưu tiên nhất.";

  if (!apiKey) {
    return buildLocalBoardFallback({ board, columns, tasks, members, prompt: cleanQ, requesterName });
  }

  const colMap = new Map(columns.map((c) => [c.id, c.title]));
  const tasksSummary =
    tasks.length > 0
      ? tasks
          .slice(0, 25)
          .map(
            (t) =>
              `- "${t.title}" | Cột: ${colMap.get(t.columnId) || t.status} | Ưu tiên: ${t.priority} | Tiến độ: ${t.progress || 0}% | Hạn: ${t.dueDate || "chưa đặt"}`
          )
          .join("\n")
      : "(Chưa có công việc nào trong bảng)";

  const membersText = members.map((m) => `${m.name} (${m.role})`).join(", ") || "(1 thành viên)";
  const chatHistory =
    recentMessages.length > 0
      ? recentMessages
          .slice(-6)
          .map((m) => `- ${m.authorName}: ${m.content}`)
          .join("\n")
      : "(Chưa có tin nhắn trước đó)";

  const systemPrompt = `Bạn là "Trợ lý ảo KanoFlow" đang hỗ trợ trực tiếp trong phòng chat nhóm của dự án "${board.name}".
Trả lời bằng tiếng Việt súc tích, thực tế, dễ hành động cho TẤT CẢ thành viên dự án cùng theo dõi (tối đa khoảng 200 từ).

NGỮ CẢNH DỰ ÁN:
- Tên dự án: ${board.name}
- Mô tả: ${board.description || "Không có"}
- Thành viên: ${membersText}
- Các cột Kanban: ${columns.map((c) => c.title).join(" → ")}
- Danh sách công việc (${tasks.length}):
${tasksSummary}
- Tin nhắn gần đây của nhóm:
${chatHistory}`;

  const userMsg = `${requesterName || "Một thành viên"} vừa gọi @troliao trong phòng chat nhóm: ${cleanQ}`;

  try {
    if (provider === "openai") {
      return await callOpenAISimple(systemPrompt, userMsg, apiKey, model);
    }
    return await callGeminiSimple(systemPrompt, userMsg, apiKey, model);
  } catch (err) {
    console.warn("Board @troliao AI fallback:", err.message);
    return buildLocalBoardFallback({ board, columns, tasks, members, prompt: cleanQ, requesterName });
  }
}

module.exports = {
  AI_BOT_AUTHOR,
  hasAiMention,
  stripAiMention,
  generateTaskAiReply,
  generateBoardAiReply,
};
