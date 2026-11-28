const express = require("express");
const fs = require("fs");
const path = require("path");
const authenticateToken = require("../middleware/auth");
const { Task, Category, AiChatSession, Op } = require("../models");
const { buildAccessibleTasksWhere } = require("../utils/boardAccess");

const router = express.Router();
router.use(authenticateToken);

const MAX_AI_SESSIONS_PER_USER = 3;
const MAX_MESSAGES_PER_SESSION = 80;

function parseSessionMessages(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeSession(row) {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    id: plain.id,
    userId: plain.userId,
    title: plain.title || "Cuộc trò chuyện mới",
    messages: parseSessionMessages(plain.messagesJson),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function deriveSessionTitle(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Cuộc trò chuyện mới";
  return clean.length > 56 ? `${clean.slice(0, 56)}…` : clean;
}

async function getAndPruneUserSessions(userId) {
  const rows = await AiChatSession.findAll({
    where: { userId },
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
  });

  if (rows.length > MAX_AI_SESSIONS_PER_USER) {
    const staleIds = rows.slice(MAX_AI_SESSIONS_PER_USER).map((r) => r.id);
    if (staleIds.length > 0) {
      await AiChatSession.destroy({
        where: { id: { [Op.in]: staleIds }, userId },
      });
    }
  }

  return rows.slice(0, MAX_AI_SESSIONS_PER_USER).map(serializeSession);
}

// ==================================================
// AI CONFIGURATION — loaded from environment variables (mutable)
// ==================================================
let AI_PROVIDER = process.env.AI_PROVIDER || "gemini"; // 'gemini' | 'openai'
let AI_API_KEY = process.env.AI_API_KEY || "";
let AI_MODEL_GEMINI = process.env.AI_MODEL || "gemini-3.1-flash-lite";
let AI_MODEL_OPENAI = process.env.AI_MODEL || "gpt-4o-mini";

// ==================================================
// GET /api/ai/status — Check if AI is configured
// ==================================================
router.get("/status", (req, res) => {
  const isConfigured = !!AI_API_KEY;
  res.json({
    configured: isConfigured,
    provider: isConfigured ? AI_PROVIDER : null,
    model: isConfigured
      ? AI_PROVIDER === "openai"
        ? AI_MODEL_OPENAI
        : AI_MODEL_GEMINI
      : null,
    message: isConfigured
      ? `AI thật đang hoạt động với ${AI_PROVIDER === "openai" ? "OpenAI" : "Google Gemini"}`
      : "Đang ở chế độ Phân tích Nội bộ. Hãy nhập API Key để kích hoạt AI thật.",
  });
});

// ==================================================
// POST /api/ai/config — Cập nhật API Key (CHỈ QUẢN TRỊ VIÊN HỆ THỐNG)
// ==================================================
router.post("/config", async (req, res) => {
  try {
    if (req.user?.systemRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Quản trị viên hệ thống (systemRole: admin) mới được thay đổi cấu hình AI dùng chung!",
      });
    }
    const { apiKey, provider, model } = req.body;

    if (apiKey !== undefined) {
      AI_API_KEY = (apiKey || "").trim();
      process.env.AI_API_KEY = AI_API_KEY;
    }
    if (provider) {
      AI_PROVIDER = provider;
      process.env.AI_PROVIDER = provider;
    }
    if (model) {
      if (AI_PROVIDER === "openai") {
        AI_MODEL_OPENAI = model;
      } else {
        AI_MODEL_GEMINI = model;
      }
      process.env.AI_MODEL = model;
    }

    // Ghi vào file .env để lưu vĩnh viễn
    try {
      const envPath = path.join(__dirname, "../.env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("AI_API_KEY=")) {
          envContent = envContent.replace(/^AI_API_KEY=.*$/m, `AI_API_KEY=${AI_API_KEY}`);
        } else {
          envContent += `\nAI_API_KEY=${AI_API_KEY}`;
        }
        if (provider) {
          if (envContent.includes("AI_PROVIDER=")) {
            envContent = envContent.replace(/^AI_PROVIDER=.*$/m, `AI_PROVIDER=${AI_PROVIDER}`);
          } else {
            envContent += `\nAI_PROVIDER=${AI_PROVIDER}`;
          }
        }
        if (model) {
          if (envContent.includes("AI_MODEL=")) {
            envContent = envContent.replace(/^AI_MODEL=.*$/m, `AI_MODEL=${model}`);
          } else {
            envContent += `\nAI_MODEL=${model}`;
          }
        }
        fs.writeFileSync(envPath, envContent, "utf8");
      }
    } catch (fsErr) {
      console.warn("Không thể ghi file .env:", fsErr.message);
    }

    // Kiểm tra kết nối nhanh với API Key nếu có
    let testSuccess = false;
    let testError = null;

    if (AI_API_KEY) {
      try {
        const testPrompt = "Bạn là trợ lý AI.";
        if (AI_PROVIDER === "openai") {
          await callOpenAI(testPrompt, "Xin chào", AI_API_KEY, AI_MODEL_OPENAI);
        } else {
          await callGemini(testPrompt, "Xin chào", AI_API_KEY, AI_MODEL_GEMINI);
        }
        testSuccess = true;
      } catch (testErr) {
        testError = testErr.message;
        console.warn("Kiểm tra API Key cảnh báo:", testErr.message);
      }
    }

    const isConfigured = !!AI_API_KEY;
    return res.json({
      success: true,
      configured: isConfigured,
      testSuccess,
      testError,
      provider: isConfigured ? AI_PROVIDER : null,
      model: isConfigured
        ? AI_PROVIDER === "openai"
          ? AI_MODEL_OPENAI
          : AI_MODEL_GEMINI
        : null,
      message: isConfigured
        ? testSuccess
          ? `Kích hoạt thành công AI thật với ${AI_PROVIDER === "openai" ? "OpenAI" : "Google Gemini"}!`
          : `Đã lưu API Key (${AI_PROVIDER === "openai" ? "OpenAI" : "Google Gemini"}), nhưng test kết nối báo: ${testError}`
        : "Đã chuyển về chế độ phân tích nội bộ.",
    });
  } catch (error) {
    console.error("Lỗi cấu hình AI:", error);
    res.status(500).json({ success: false, message: "Không thể lưu cấu hình AI!" });
  }
});

// ==================================================
// GET /api/ai/sessions — Lấy 3 cuộc trò chuyện gần nhất của đúng tài khoản hiện tại
// ==================================================
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await getAndPruneUserSessions(req.user.id);
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error("Lỗi lấy lịch sử AI chat:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử trò chuyện AI!" });
  }
});

// ==================================================
// POST /api/ai/sessions — Tạo phiên trò chuyện mới (tự động giữ tối đa 3 phiên gần nhất)
// ==================================================
router.post("/sessions", async (req, res) => {
  try {
    const now = new Date();
    const title = deriveSessionTitle(req.body?.title || "Cuộc trò chuyện mới");
    const created = await AiChatSession.create({
      userId: req.user.id,
      title,
      messagesJson: "[]",
      createdAt: now,
      updatedAt: now,
    });

    const sessions = await getAndPruneUserSessions(req.user.id);
    return res.status(201).json({
      success: true,
      session: serializeSession(created),
      sessions,
    });
  } catch (error) {
    console.error("Lỗi tạo phiên AI chat:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo cuộc trò chuyện mới!" });
  }
});

// ==================================================
// DELETE /api/ai/sessions/:id — Xóa một phiên trò chuyện thuộc tài khoản hiện tại
// ==================================================
router.delete("/sessions/:id", async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId)) {
      return res.status(400).json({ success: false, message: "ID cuộc trò chuyện không hợp lệ!" });
    }

    const deletedCount = await AiChatSession.destroy({
      where: { id: sessionId, userId: req.user.id },
    });
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cuộc trò chuyện!" });
    }

    const sessions = await getAndPruneUserSessions(req.user.id);
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error("Lỗi xóa phiên AI chat:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa cuộc trò chuyện!" });
  }
});

// ==================================================
// POST /api/ai/chat — Send message to AI & persist into user's 3-session history
// Body: { message: string, history?: Array<{role, content}>, sessionId?: number }
// ==================================================
router.post("/chat", async (req, res) => {
  try {
    const { message, history, sessionId } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Vui lòng nhập câu hỏi!" });
    }

    const trimmedMessage = message.trim();

    // Tải hoặc tạo mới phiên trò chuyện của đúng user hiện tại
    let session = null;
    if (sessionId && Number.isInteger(Number(sessionId))) {
      session = await AiChatSession.findOne({
        where: { id: Number(sessionId), userId: req.user.id },
      });
    }
    if (!session) {
      const now = new Date();
      session = await AiChatSession.create({
        userId: req.user.id,
        title: deriveSessionTitle(trimmedMessage),
        messagesJson: "[]",
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingMessages = parseSessionMessages(session.messagesJson);
    const effectiveHistory =
      Array.isArray(history) && history.length > 0
        ? history
        : existingMessages.map((m) => ({ role: m.role, content: m.content }));

    // Fetch user's real task data (personal + team boards)
    const taskWhere = await buildAccessibleTasksWhere(req.user.id, { isArchived: false });
    const tasks = await Task.findAll({
      where: taskWhere,
      attributes: [
        "id", "title", "description", "priority", "status",
        "startDate", "dueDate", "progress", "categoryId", "boardId", "createdAt",
      ],
    });

    const categories = await Category.findAll({
      where: { userId: req.user.id },
      attributes: ["id", "name", "color"],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build context summary
    const taskSummary = buildTaskSummary(tasks, categories, today);
    const systemPrompt = buildSystemPrompt(taskSummary);

    let reply = "";
    let source = "local";

    if (AI_API_KEY) {
      try {
        if (AI_PROVIDER === "openai") {
          reply = await callOpenAI(systemPrompt, trimmedMessage, AI_API_KEY, AI_MODEL_OPENAI, effectiveHistory);
        } else {
          reply = await callGemini(systemPrompt, trimmedMessage, AI_API_KEY, AI_MODEL_GEMINI, effectiveHistory);
        }
        source = "ai";
      } catch (aiError) {
        console.error("AI API error:", aiError.message);
        const fallbackReply = generateRuleBasedReply(trimmedMessage, tasks, categories, today);
        reply = fallbackReply + "\n\n_(Lưu ý: AI Cloud tạm thời không phản hồi, đang dùng bộ máy phân tích nội bộ)_";
        source = "fallback";
      }
    } else {
      reply = generateRuleBasedReply(trimmedMessage, tasks, categories, today);
      source = "local";
    }

    // Lưu tin nhắn user + phản hồi AI vào SQL Server và giữ tối đa 3 đoạn gần nhất cho tài khoản này
    const nowIso = new Date().toISOString();
    const updatedMessages = [
      ...existingMessages,
      { role: "user", content: trimmedMessage, timestamp: nowIso },
      { role: "assistant", content: reply, source, timestamp: nowIso },
    ].slice(-MAX_MESSAGES_PER_SESSION);

    if (!session.title || session.title === "Cuộc trò chuyện mới") {
      session.title = deriveSessionTitle(trimmedMessage);
    }
    session.messagesJson = JSON.stringify(updatedMessages);
    session.updatedAt = new Date();
    await session.save();

    const sessions = await getAndPruneUserSessions(req.user.id);
    return res.json({
      success: true,
      reply,
      source,
      session: serializeSession(session),
      sessions,
    });
  } catch (error) {
    console.error("Lỗi AI chat:", error);
    res.status(500).json({ success: false, message: "Không thể xử lý yêu cầu!" });
  }
});

// ==================================================
// GOOGLE GEMINI API CALL (with auto-fallback models)
// ==================================================
async function callGemini(systemPrompt, userMessage, apiKey, model, history = []) {
  const modelsToTry = [
    model || "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest"
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const contents = [];

  // Gắn lịch sử trò chuyện nếu có
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    recent.forEach((item) => {
      if (item && item.content && typeof item.content === "string") {
        contents.push({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.content }],
        });
      }
    });
  }

  // Gắn câu hỏi hiện tại
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  let lastError = null;
  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return reply;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${m} failed: ${err.message}, trying next...`);
    }
  }

  throw lastError || new Error("Không nhận được phản hồi từ các model Gemini.");
}

// ==================================================
// OPENAI API CALL
// ==================================================
async function callOpenAI(systemPrompt, userMessage, apiKey, model, history = []) {
  const messages = [{ role: "system", content: systemPrompt }];

  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    recent.forEach((item) => {
      if (item && item.content && typeof item.content === "string") {
        messages.push({
          role: item.role === "user" ? "user" : "assistant",
          content: item.content,
        });
      }
    });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content || "Không nhận được phản hồi từ AI."
  );
}

// ==================================================
// BUILD SYSTEM PROMPT WITH TASK CONTEXT & BROAD KNOWLEDGE
// ==================================================
function buildSystemPrompt(taskSummary) {
  return `Bạn là Trợ lý AI Quản lý Công việc & Cố vấn Chiến lược Lập kế hoạch Cao cấp (Task Manager & Strategic Planning Specialist).

VAI TRÒ & PHẠM VI NĂNG LỰC TOÀN DIỆN CỦA BẠN:
1. CHUYÊN GIA LẬP KẾ HOẠCH & CỐ VẤN CHI TIẾT (NĂNG LỰC CỐT LÕI):
   - Bạn có khả năng trả lời RỘNG RÃI, LINH HOẠT và SÂU SẮC cho MỌI câu hỏi người dùng đưa ra: từ công việc cá nhân, học tập, nghiên cứu, đồ án tốt nghiệp, công nghệ phần mềm, kinh doanh, tổ chức sự kiện đến quản trị thời gian và năng suất.
   - KHI NGƯỜI DÙNG YÊU CẦU LẬP KẾ HOẠCH CHO BẤT KỲ CÔNG VIỆC HAY DỰ ÁN NÀO (kể cả công việc chưa có trong hệ thống):
     Hãy chủ động xây dựng một BẢN KẾ HOẠCH HÀNH ĐỘNG TOÀN DIỆN, BÀI BẢN, THỰC TẾ với cấu trúc chuyên nghiệp:
     * 🎯 1. Mục tiêu cụ thể & Tiêu chuẩn hoàn thành (Objectives & Definition of Done)
     * ⏱️ 2. Lộ trình thời gian & Các mốc quan trọng (Timeline & Milestones theo từng giai đoạn)
     * 📋 3. Kế hoạch hành động chi tiết (Action Plan): chia thành các giai đoạn rõ ràng (Khảo sát/Chuẩn bị -> Triển khai cốt lõi -> Rà soát/Kiểm thử -> Hoàn thiện/Bàn giao) kèm danh sách các đầu việc con (Sub-tasks) cụ thể, khả thi mà người dùng có thể thêm ngay vào Task Manager để theo dõi.
     * ⚠️ 4. Rủi ro tiềm ẩn & Giải pháp dự phòng (Risk Mitigation)
     * 💡 5. Phương pháp & Mẹo tối ưu năng suất (Pomodoro, Time Blocking, Checklist, lưu ý then chốt).

2. CỐ VẤN QUẢN LÝ CÔNG VIỆC DỰA TRÊN DỮ LIỆU THỰC TẾ HỆ THỐNG:
   - Bạn nắm rõ dữ liệu công việc hiện tại của người dùng trong hệ thống (được cung cấp bên dưới).
   - Khi người dùng hỏi về công việc, tiến độ, deadline, thứ tự ưu tiên của bản thân: hãy phân tích dữ liệu thực tế này, phát hiện việc quá hạn/nguy cơ trễ hạn, và đưa ra khuyến nghị chính xác.
   - Nếu công việc người dùng muốn lập kế hoạch trùng với một task trong hệ thống, hãy kết hợp thông tin task đó (deadline, tiến độ) vào bản kế hoạch!

3. TƯ VẤN NĂNG SUẤT & PHƯƠNG PHÁP LÀM VIỆC THÔNG MINH:
   - Sẵn sàng hướng dẫn chi tiết các phương pháp: Ma trận Eisenhower, Kỹ thuật Pomodoro, Nguyên lý Pareto 80/20, Quy tắc 2 phút, Time Boxing, Phương pháp SMART, OKRs, v.v.
   - Giúp giải tỏa trì hoãn, vượt qua cảm giác ngợp việc và xây dựng thói quen làm việc kỷ luật.

DỮ LIỆU CÔNG VIỆC HIỆN TẠI CỦA NGƯỜI DÙNG TRONG HỆ THỐNG:
${taskSummary}

QUY TẮC PHẢN HỒI:
- Luôn trả lời bằng tiếng Việt chuẩn xác, mạch lạc, tích cực và tràn đầy năng lượng hỗ trợ.
- Định dạng Markdown đẹp mắt, có tiêu đề rõ ràng, gạch đầu dòng (bullet points), in đậm các từ khóa quan trọng và checklist dạng [ ] nếu phù hợp.
- Tuyệt đối KHÔNG từ chối trả lời khi người dùng hỏi các câu hỏi mở rộng, lập kế hoạch mới hoặc hỏi kiến thức chung. Hãy phát huy tối đa kiến thức chuyên gia để lập kế hoạch chi tiết, thực tế và giá trị nhất cho người dùng!`;
}

// ==================================================
// BUILD TASK SUMMARY FOR CONTEXT
// ==================================================
function buildTaskSummary(tasks, categories, today) {
  const catMap = {};
  categories.forEach((c) => { catMap[c.id] = c.name; });

  const completed = tasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100);
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const urgent = tasks.filter((t) => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành");
  const inProgress = tasks.filter(
    (t) => (t.status === "Đang thực hiện" || t.status === "Đang làm") && t.progress < 100
  );

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let summary = `Ngày hôm nay: ${todayStr}\n`;
  summary += `Tổng số công việc: ${tasks.length}\n`;
  summary += `Đã hoàn thành: ${completed.length}\n`;
  summary += `Đang thực hiện: ${inProgress.length}\n`;
  summary += `Quá hạn: ${overdue.length}\n`;
  summary += `Khẩn cấp: ${urgent.length}\n\n`;

  if (overdue.length > 0) {
    summary += `CÔNG VIỆC QUÁ HẠN:\n`;
    overdue.slice(0, 10).forEach((t) => {
      summary += `- "${t.title}" | Hạn: ${t.dueDate} | Tiến độ: ${t.progress}%\n`;
    });
    summary += "\n";
  }

  if (urgent.length > 0) {
    summary += `CÔNG VIỆC KHẨN CẤP:\n`;
    urgent.slice(0, 5).forEach((t) => {
      summary += `- "${t.title}" | Hạn: ${t.dueDate || "Chưa đặt"} | Tiến độ: ${t.progress}%\n`;
    });
    summary += "\n";
  }

  if (inProgress.length > 0) {
    summary += `ĐANG THỰC HIỆN:\n`;
    inProgress.slice(0, 10).forEach((t) => {
      const cat = t.categoryId ? catMap[t.categoryId] || "Chưa phân loại" : "Chưa phân loại";
      summary += `- "${t.title}" | ${cat} | Tiến độ: ${t.progress}% | Hạn: ${t.dueDate || "Chưa đặt"}\n`;
    });
    summary += "\n";
  }

  if (tasks.length > 0) {
    summary += `TẤT CẢ CÔNG VIỆC (tối đa 20):\n`;
    tasks.slice(0, 20).forEach((t) => {
      const cat = t.categoryId ? catMap[t.categoryId] || "Chưa phân loại" : "Chưa phân loại";
      summary += `- "${t.title}" | ${t.status} | ${t.priority} | ${cat} | Tiến độ: ${t.progress}% | Hạn: ${t.dueDate || "Chưa đặt"}\n`;
    });
  }

  return summary;
}

// ==================================================
// SMART DETAILED PLANNER & FALLBACK ENGINE
// ==================================================

/**
 * Xây dựng bản kế hoạch hành động toàn diện, bài bản theo từng giai đoạn
 */
function generateDetailedPlan(text, tasks, categories, today) {
  const lower = text.toLowerCase();

  // 1. Kiểm tra yêu cầu định dạng (ngắn gọn / súc tích / tóm tắt)
  const isBrief =
    lower.includes("ngắn gọn") ||
    lower.includes("súc tích") ||
    lower.includes("tóm tắt") ||
    lower.includes("ngắn thôi") ||
    lower.includes("vắn tắt") ||
    lower.includes("nhanh");

  // 2. Nhận diện số ngày (ví dụ: 3 ngày, 7 ngày, 5 ngày...)
  const dayMatch = lower.match(/(?:trong\s+)?(\d+)\s+ngày/i);
  const requestedDays = dayMatch ? parseInt(dayMatch[1], 10) : null;

  // 3. Làm sạch và trích xuất chủ đề cốt lõi
  let cleaned = text
    .replace(/(?:trả\s+lời\s+)?(?:ngắn\s+gọn|súc\s+tích|tóm\s+tắt|ngắn\s+thôi|vắn\s+tắt|nhanh\s+nhất|chi\s+tiết)/gi, "")
    .replace(/(?:trong\s+)?\d+\s+ngày/gi, "")
    .replace(/(?:cho\s+tôi|cho\s+mình|hãy\s+cho\s+tôi|gợi\s+ý\s+(?:cho\s+tôi|cho\s+mình)?|hướng\s+dẫn(?:\s+cho\s+tôi)?|giúp\s+tôi|giúp\s+mình)/gi, "")
    .replace(/(?:1\s+quá\s+trình|một\s+quá\s+trình|quá\s+trình|1\s+lộ\s+trình|một\s+lộ\s+trình|lộ\s+trình|kế\s+hoạch|các\s+bước)/gi, "")
    .replace(/(nhé|nha|với|ạ|ơi|đi|được\s+không)$/gi, "")
    .trim();

  let targetName = cleaned;
  if (!targetName || targetName.length < 2) {
    const pMatch = text.match(/(?:học|làm|ôn|rèn\s+luyện)\s+([^?.!]+)/i);
    if (pMatch && pMatch[1]) {
      targetName = pMatch[1]
        .replace(/(?:trả\s+lời\s+)?(?:ngắn\s+gọn|súc\s+tích|tóm\s+tắt)/gi, "")
        .replace(/(?:trong\s+)?\d+\s+ngày/gi, "")
        .trim();
    }
  }

  // Chuẩn hóa tên tiêu đề hiển thị
  let effectiveTitle = targetName ? targetName.charAt(0).toUpperCase() + targetName.slice(1) : "Quá Trình Rèn Luyện";

  // Tìm task trong database khớp với tên này nếu có
  let matchedTask = null;
  if (tasks.length > 0 && targetName) {
    matchedTask = tasks.find((t) =>
      t.title.toLowerCase().includes(targetName.toLowerCase()) ||
      targetName.toLowerCase().includes(t.title.toLowerCase())
    );
  }

  const topicLower = (effectiveTitle + " " + lower).toLowerCase();

  // 4. Nhận diện Lĩnh vực (Domain) chính xác, tách biệt môn học với đồ án luận văn:
  let domain = "general";
  if (
    topicLower.includes("toán") || topicLower.includes("math") || topicLower.includes("đại số") ||
    topicLower.includes("hình học") || topicLower.includes("giải tích") || topicLower.includes("lý") ||
    topicLower.includes("vật lý") || topicLower.includes("hóa") || topicLower.includes("sinh học") ||
    topicLower.includes("lịch sử") || topicLower.includes("địa lý") || topicLower.includes("văn học")
  ) {
    domain = "subject_study"; // Môn học lý thuyết / tự nhiên
  } else if (
    topicLower.includes("tiếng anh") || topicLower.includes("english") || topicLower.includes("ielts") ||
    topicLower.includes("toeic") || topicLower.includes("ngoại ngữ") || topicLower.includes("học anh") ||
    topicLower.includes("giao tiếp") || topicLower.includes("từ vựng") || topicLower.includes("phát âm")
  ) {
    domain = "language";
  } else if (
    topicLower.includes("đồ án") || topicLower.includes("luận văn") || topicLower.includes("khóa luận") ||
    topicLower.includes("tiểu luận") || topicLower.includes("nghiên cứu khoa học") || topicLower.includes("dacs")
  ) {
    domain = "academic_thesis"; // Chỉ khi là đề tài đồ án tốt nghiệp
  } else if (
    topicLower.includes("web") || topicLower.includes("app") || topicLower.includes("phần mềm") ||
    topicLower.includes("code") || topicLower.includes("lập trình") || topicLower.includes("frontend") ||
    topicLower.includes("backend") || topicLower.includes("api") || topicLower.includes("database") ||
    topicLower.includes("hệ thống") || topicLower.includes("triển khai") || topicLower.includes("it")
  ) {
    domain = "software";
  } else if (
    topicLower.includes("kinh doanh") || topicLower.includes("bán hàng") || topicLower.includes("marketing") ||
    topicLower.includes("khởi nghiệp") || topicLower.includes("quán") || topicLower.includes("shop") ||
    topicLower.includes("sản phẩm") || topicLower.includes("quảng cáo") || topicLower.includes("doanh thu")
  ) {
    domain = "business";
  } else if (
    topicLower.includes("sự kiện") || topicLower.includes("event") || topicLower.includes("hội thảo") ||
    topicLower.includes("workshop") || topicLower.includes("tiệc") || topicLower.includes("du lịch") ||
    topicLower.includes("sinh nhật") || topicLower.includes("team building")
  ) {
    domain = "event";
  } else if (
    topicLower.includes("thói quen") || topicLower.includes("tập gym") || topicLower.includes("giảm cân") ||
    topicLower.includes("chạy bộ") || topicLower.includes("sức khỏe") || topicLower.includes("dậy sớm") ||
    topicLower.includes("đọc sách")
  ) {
    domain = "lifestyle";
  }

  return renderPlanTemplate(effectiveTitle, domain, matchedTask, requestedDays, isBrief);
}

function renderPlanTemplate(title, domain, matchedTask, requestedDays, isBrief) {
  let contextHeader = "";
  if (matchedTask) {
    contextHeader = `📌 **Liên kết công việc trong hệ thống:**\n• Tên Task: **"${matchedTask.title}"**\n• Trạng thái: **${matchedTask.status}** | Mức độ ưu tiên: **${matchedTask.priority}**\n• Tiến độ hiện tại: **${matchedTask.progress}%** | Hạn chót: **${matchedTask.dueDate || "Chưa đặt hạn"}**\n\n---\n\n`;
  }

  const durationStr = requestedDays ? `TRONG ${requestedDays} NGÀY` : "";

  // ==========================================
  // CASE 1: MÔN HỌC (TOÁN, LÝ, HÓA...)
  // ==========================================
  if (domain === "subject_study") {
    if (isBrief) {
      return `${contextHeader}🎯 **LỘ TRÌNH ÔN TẬP ${title.toUpperCase()} ${durationStr} (NGẮN GỌN & TRỌNG TÂM)**

• **Ngày 1 (Lý thuyết & Bảng công thức cốt lõi)**:
  - Tóm tắt toàn bộ công thức, định lý quan trọng ra 1 trang A4 (Cheat-sheet).
  - Hiểu rõ điều kiện áp dụng từng công thức, tránh học vẹt.

• **Ngày 2 (Luyện giải các dạng bài tập trọng tâm)**:
  - Chọn 3-5 dạng bài tập then chốt chiếm 70-80% điểm trong đề.
  - Giải từ bài mẫu cơ bản đến bài tự luyện, chú ý các bẫy thường gặp.

• **Ngày 3 (Thực chiến bấm giờ & Lấp lỗ hổng kiến thức)**:
  - Bấm giờ giải 1-2 đề thi thử chuẩn cấu trúc.
  - Rà soát lại tất cả các câu làm sai để ghi nhớ và khắc phục ngay.

💡 **Lời khuyên thực chiến**: *"Hiểu sâu bản chất công thức + Luyện chắc bài mẫu"*, tránh sa đà vào các câu quá khó làm mất nhiều thời gian!`;
    }

    return `${contextHeader}📚 **KẾ HOẠCH HỌC TẬP & ÔN LUYỆN ${title.toUpperCase()} ${durationStr} HIỆU QUẢ**

🎯 **1. MỤC TIÊU CỐT LÕI**
• Nắm vững toàn bộ hệ thống lý thuyết, công thức và phương pháp giải trọng tâm.
• Rèn luyện kỹ năng phân tích đề, nhận dạng bài toán nhanh và chính xác.
• Đạt điểm số mục tiêu trong kỳ kiểm tra/kỳ thi sắp tới.

⏱️ **2. LỘ TRÌNH THỰC HIỆN THEO TỪNG GIAI ĐOẠN**
• **Giai đoạn 1 (Ngày 1): Củng cố kiến thức nền tảng**
  - Hệ thống hóa các chuyên đề lý thuyết và công thức quan trọng.
  - Làm bài tập nhận biết và thông hiểu để nhớ công thức.
• **Giai đoạn 2 (Ngày 2): Làm chủ các dạng bài tập vận dụng**
  - Phân loại bài tập theo từng dạng và phương pháp giải mẫu.
  - Tự giải bài tập có đối chiếu đáp án chi tiết.
• **Giai đoạn 3 (Ngày 3 trở đi): Luyện đề thực chiến & Tổng kết**
  - Giải đề thi thử có bấm giờ nghiêm túc như thi thật.
  - Phân tích lỗi sai (tính toán nhầm, đọc thiếu đề, áp dụng sai công thức) và khắc phục.

💡 **3. CHECKLIST CẦN LÀM:**
[ ] Lập bảng tóm tắt công thức trọng tâm
[ ] Hoàn thành 100% bài tập ví dụ mẫu
[ ] Giải ít nhất 2 đề thi thử và tự chấm điểm`;
  }

  // ==========================================
  // CASE 2: TIẾNG ANH / NGOẠI NGỮ
  // ==========================================
  if (domain === "language") {
    if (isBrief) {
      return `${contextHeader}📚 **LỘ TRÌNH HỌC ${title.toUpperCase()} ${durationStr} (NGẮN GỌN & THỰC CHIẾN)**

• **Giai đoạn 1 (Phát âm & Bảng âm IPA)**:
  - Chuẩn hóa các âm dễ sai và âm đuôi quan trọng (/s/, /ed/, /θ/, /ð/).
  - Bắt chước khẩu hình người bản xứ để nói tự nhiên hơn.

• **Giai đoạn 2 (Từ vựng theo cụm & Kỹ thuật Shadowing)**:
  - Học từ vựng theo cụm câu giao tiếp (Collocations), ngừng dịch ngầm từng từ trong đầu.
  - Nghe audio ngắn 2-3 phút và bắt chước nói đuổi (Shadowing) để luyện ngữ điệu.

• **Giai đoạn 3 (Phản xạ & Nói tự do)**:
  - Tự quay video 1-2 phút nói về một chủ đề quen thuộc (bản thân, sở thích, công việc).
  - Tự tin nói trôi chảy, ưu tiên sự lưu loát trước độ chính xác.

💡 **Mẹo**: Dành 30-45 phút mỗi ngày chia đều Sáng - Tối để duy trì phản xạ tốt nhất!`;
    }

    return `${contextHeader}📚 **LỘ TRÌNH 7 NGÀY BỨT PHÁ TIẾNG ANH THỰC CHIẾN (CHUYÊN SÂU)**

Chào bạn! Dưới đây là chương trình luyện tập thực chiến trong 7 ngày được thiết kế theo phương pháp **Comprehensible Input (Tiếp nhận hiểu được)** kết hợp **Shadowing (Bắt chước ngữ điệu)**, giúp bạn nhanh chóng phá vỡ rào cản sợ nói, làm chủ phản xạ và tự tin giao tiếp mà không cần dịch ngầm trong đầu.

🎯 **1. MỤC TIÊU CỐT LÕI SAU 7 NGÀY (Core Milestones)**
• Chuẩn hóa 44 âm trong bảng IPA (International Phonetic Alphabet), phát âm chuẩn người bản xứ.
• Nạp và sử dụng nhuần nhuyễn 150+ cụm từ (Collocations / Phrases) thông dụng nhất trong đời sống.
• Rèn luyện phản xạ nói liên tục 2 phút không ngập ngừng về chủ đề quen thuộc.
• Xây dựng kỷ luật học tiếng Anh bền vững mỗi ngày.

⏱️ **2. PHÂN BỔ THỜI LƯỢNG MỖI NGÀY (Tổng 90 phút/ngày)**
• **Buổi sáng (30 phút)**: Phát âm & Nạp cụm từ vựng theo ngữ cảnh (Contextual Vocabulary).
• **Buổi trưa/chiều (30 phút)**: Luyện nghe chủ động & Bắt chước ngữ điệu (Shadowing Technique).
• **Buổi tối (30 phút)**: Tự nói phản xạ (Self-talk / Speaking practice) & Viết nhật ký 5 câu.

---

📅 **3. KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT TỪNG NGÀY (DAY 1 - DAY 7)**

🔹 **NGÀY 1: ĐẬP TAN NỖI SỢ PHÁT ÂM & LÀM CHỦ BẢNG IPA**
• **Mục tiêu**: Sửa triệt để các lỗi phát âm người Việt hay mắc (âm đuôi /s/, /ed/, âm /θ/, /ð/, /ʃ/, /tʃ/).
• **Buổi sáng (30p)**: Xem video hướng dẫn khẩu hình 12 nguyên âm đơn và 8 nguyên âm đôi trên YouTube (kênh BBC Learning English hoặc Rachel's English).
• **Buổi trưa (30p)**: Đứng trước gương, phát âm to rõ 30 từ vựng cơ bản và kiểm tra âm đuôi (Ending sounds).
• **Buổi tối (30p)**: Cài đặt ứng dụng Elsa Speak hoặc Cambridge Dictionary để tra cứu và đọc lại 20 câu giao tiếp ngắn.
• *Checklist Day 1*: [ ] Thuộc khẩu hình âm /θ/ và /s/ | [ ] Ghi âm lại 1 đoạn đọc ngắn để nghe lại lỗi sai.

🔹 **NGÀY 2: CHIẾN LƯỢC 50 CỤM TỪ THỰC CHIẾN (NGỪNG DỊCH NGẦM TRONG ĐẦU)**
• **Mục tiêu**: Ngừng dịch từng từ đơn lẻ (Word-by-word); học theo cụm từ (Chunks of Language).
• **Buổi sáng (30p)**: Học 25 cụm từ chào hỏi, mở đầu câu chuyện và bày tỏ quan điểm (*In my opinion, As far as I know, Could you please...*).
• **Buổi trưa (30p)**: Đặt 2 câu ví dụ thực tế cho mỗi cụm từ vừa học gắn liền với công việc/cuộc sống của bạn.
• **Buổi tối (30p)**: Áp dụng kỹ thuật Spaced Repetition (Lặp lại ngắt quãng) ôn lại toàn bộ 50 cụm từ trước khi ngủ.
• *Checklist Day 2*: [ ] Ghi nhớ 50 cụm từ | [ ] Đặt 10 câu ví dụ liên quan đến bản thân.

🔹 **NGÀY 3: ĐỘT PHÁ KỸ NĂNG NGHE VỚI KỸ THUẬT SHADOWING**
• **Mục tiêu**: Bắt kịp tốc độ nói tự nhiên của người bản ngữ, nhận biết hiện tượng nối âm (Linking sounds).
• **Buổi sáng (30p)**: Chọn 1 đoạn audio ngắn 2-3 phút trên *BBC 6 Minute English* hoặc *Spotlight English*. Nghe lần 1 không nhìn transcript để nắm ý chính.
• **Buổi trưa (30p)**: Vừa nghe vừa nhìn transcript, gạch chân các từ nối âm và từ mới.
• **Buổi tối (30p)**: **Kỹ thuật Shadowing**: Bật audio và nói đuổi theo người bản ngữ từng câu một, bắt chước 100% ngữ điệu, ngắt nghỉ và cảm xúc. Lặp lại 5 lần.
• *Checklist Day 3*: [ ] Hoàn thành 1 bài Shadowing 3 phút | [ ] Thuộc cách nối âm cơ bản.

🔹 **NGÀY 4: NGỮ PHÁP ỨNG DỤNG CHO NÓI (KHÔNG HỌC VẸT CÔNG THỨC)**
• **Mục tiêu**: Làm chủ 3 thì cốt lõi chiếm 85% giao tiếp: Hiện tại đơn, Quá khứ đơn, Tương lai gần.
• **Buổi sáng (30p)**: Ôn luyện thì Quá khứ đơn: Kể lại 5 việc bạn đã làm ngày hôm qua bằng tiếng Anh.
• **Buổi trưa (30p)**: Luyện thì Tương lai gần (*be going to / will*): Lập danh sách 5 dự định cho cuối tuần này.
• **Buổi tối (30p)**: Tự quay video 1 phút bằng điện thoại: "Kể về một kỷ niệm đáng nhớ của bạn". Đừng lo lắng về lỗi sai, hãy tập trung vào sự trôi chảy!
• *Checklist Day 4*: [ ] Quay video 1 phút tự nói tiếng Anh | [ ] Nắm vững cách dùng 3 thì cơ bản.

🔹 **NGÀY 5: TỪ VỰNG CHUYÊN SÂU THEO CHỦ ĐỀ CÔNG VIỆC & ĐỜI SỐNG**
• **Mục tiêu**: Tự tin trao đổi về chuyên ngành, công việc hoặc sở thích của mình.
• **Buổi sáng (30p)**: Lập danh sách 20 từ vựng + cụm từ chuyên môn bạn hay dùng nhất trong công việc hàng ngày.
• **Buổi trưa (30p)**: Đọc 1 bài viết ngắn chuyên ngành trên Medium, LinkedIn hoặc BBC News.
• **Buổi tối (30p)**: Đóng vai (Role-play) tình huống: "Giới thiệu bản thân và công việc hiện tại trong 90 giây".
• *Checklist Day 5*: [ ] Nạp 20 từ vựng công việc | [ ] Hoàn thành bài nói Elevator Pitch 90 giây.

🔹 **NGÀY 6: PHẢN XẠ HỘI THOẠI & ĐỐI THOẠI TÌNH HUỐNG (REAL-LIFE SIMULATION)**
• **Mục tiêu**: Loại bỏ khoảng thời gian chết (hesitation) khi giao tiếp thực tế.
• **Buổi sáng (30p)**: Học các câu "câu giờ thông minh" khi chưa kịp nghĩ ra từ (*Well, let me see... / That's an interesting question... / To be honest...*).
• **Buổi trưa (30p)**: Tham gia 1 nhóm luyện nói online (Discord, Cambly, Free4Talk) hoặc nói chuyện trực tiếp với AI.
• **Buổi tối (30p)**: Trò chuyện tự do 15-20 phút với bạn học hoặc tự độc thoại trước gương về chủ đề "Kế hoạch tương lai của tôi".
• *Checklist Day 6*: [ ] 15 phút nói chuyện thực tế | [ ] Áp dụng thành thạo 5 cụm từ đệm tự nhiên.

🔹 **NGÀY 7: TỔNG KẾT ĐÁNH GIÁ, TEST NĂNG LỰC & LẬP LỘ TRÌNH 30 NGÀY**
• **Mục tiêu**: Đo lường sự tiến bộ và thiết lập thói quen dài hạn.
• **Buổi sáng (30p)**: Nghe lại video/audio đã ghi âm ngày 1 và so sánh với ngày 6 để thấy rõ sự tiến bộ về phát âm và độ lưu loát.
• **Buổi trưa (30p)**: Làm một bài mini-test từ vựng và ngữ pháp trên Duolingo hoặc trang Cambridge English.
• **Buổi tối (30p)**: Viết 1 trang nhật ký bằng tiếng Anh tổng kết 7 ngày vừa qua. Lên kế hoạch duy trì 30 phút mỗi ngày cho tuần tiếp theo.
• *Checklist Day 7*: [ ] So sánh ghi âm ngày 1 vs ngày 7 | [ ] Lên lịch học cố định cho 30 ngày tới.

---

🛠️ **4. TOP NGUỒN HỌC MIỄN PHÍ CHẤT LƯỢNG CAO:**
1. **Phát âm**: *Rachel's English*, *BBC Learning English - Tim's Pronunciation Workshop* (YouTube).
2. **Luyện nghe & Shadowing**: *BBC 6 Minute English*, *TED-Ed*, *Spotlight English*.
3. **Từ vựng & Ngữ cảnh**: *Oxford 3000 Core Vocabulary*, *Cambridge Online Dictionary*.
4. **Luyện phản xạ**: *Free4talk.com*, *Elsa Speak*, hoặc *trò chuyện với Trợ lý AI*.

💡 **BÍ QUYẾT THEN CHỐT:**
*"Fluency over Accuracy"* — Hãy ưu tiên **sự lưu loát và tự tin trước**, ngữ pháp và từ vựng nâng cao sẽ hoàn thiện dần theo thời gian. Bạn có thể thêm 7 đầu việc trên vào Task Manager để nhận nhắc nhở mỗi ngày nhé!`;
  }

  // ==========================================
  // CASE 3: ĐỒ ÁN / LUẬN VĂN TỐT NGHIỆP
  // ==========================================
  if (domain === "academic_thesis") {
    return `${contextHeader}📋 **BẢN KẾ HOẠCH ĐỒ ÁN / LUẬN VĂN: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU & KẾT QUẢ CẦN ĐẠT (Definition of Done)**
• Hoàn thành đầy đủ nội dung nghiên cứu theo đúng đề cương được phê duyệt.
• Có sản phẩm minh chứng rõ ràng (báo cáo hoàn chỉnh, demo hệ thống đạt chuẩn).
• Tránh trễ deadline và sẵn sàng bảo vệ tự tin trước hội đồng giảng viên.

⏱️ **2. LỘ TRÌNH 5 GIAI ĐOẠN CHI TIẾT**
🔹 **Giai đoạn 1: Khảo sát & Chuẩn bị đề tài (Tuần 1 - 2)**
• Thu thập 5-10 tài liệu, bài báo khoa học liên quan.
• Xác định phạm vi giới hạn của đề tài và hoàn thành đề cương chi tiết.
🔹 **Giai đoạn 2: Thiết kế giải pháp & Thu thập dữ liệu (Tuần 3 - 4)**
• Lập sơ đồ kiến trúc giải pháp / phương pháp nghiên cứu.
• Chuẩn bị công cụ và dữ liệu thực nghiệm.
🔹 **Giai đoạn 3: Triển khai thực nghiệm & Xây dựng sản phẩm (Tuần 5 - 8)**
• Bắt tay vào phần việc cốt lõi: code tính năng chính / xử lý dữ liệu.
🔹 **Giai đoạn 4: Viết báo cáo hoàn chỉnh (Tuần 9 - 10)**
• Soạn thảo đầy đủ các chương, rà soát đạo văn và trích dẫn chuẩn mực.
🔹 **Giai đoạn 5: Chuẩn bị slide & Bảo vệ thử (Tuần 11 - 12)**
• Thiết kế Slide ngắn gọn, trực quan và luyện tập thuyết trình thử.`;
  }


  if (domain === "software") {
    return `${contextHeader}💻 **BẢN KẾ HOẠCH CHI TIẾT DỰ ÁN PHẦN MỀM: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU & KẾT QUẢ ĐẦU RA (Deliverables)**
• Xây dựng hệ thống ổn định, giao diện mượt mà, đầy đủ các tính năng then chốt (Core Features).
• Mã nguồn sạch (Clean Code), bảo mật cơ bản và hiệu năng phản hồi tốt.
• Có tài liệu API và sẵn sàng triển khai thực tế.

⏱️ **2. LỘ TRÌNH TRIỂN KHAI THEO CHUẨN AGILE / SCRUM**

🔹 **Giai đoạn 1: Phân tích yêu cầu & Thiết kế hệ thống (Sprint 1)**
• Liệt kê toàn bộ User Stories và xác định các tính năng cốt lõi (MVP).
• Thiết kế Cơ sở dữ liệu (Database Schema / ERD) chuẩn hóa.
• Phác thảo giao diện Wireframe / Figma cho các trang quan trọng.
• Lựa chọn Tech-stack và khởi tạo repository mã nguồn.

🔹 **Giai đoạn 2: Phát triển Cơ sở dữ liệu & API Backend (Sprint 2)**
• Thiết lập database kết nối, migrate bảng và quan hệ giữa các thực thể.
• Xây dựng module Xác thực người dùng (Authentication, JWT/Sessions).
• Viết các RESTful API cho CRUD dữ liệu cốt lõi và kiểm tra bằng Postman.

🔹 **Giai đoạn 3: Phát triển Giao diện Frontend & Tích hợp (Sprint 3)**
• Xây dựng hệ thống Components dùng chung (Header, Sidebar, Modal, Buttons).
• Tích hợp gọi API Backend, xử lý State Management và kiểm tra luồng dữ liệu.
• Bổ sung các trạng thái Loading, Empty State, Error Alert và thông báo tương tác.
• Tối ưu hiển thị Responsive trên cả máy tính và điện thoại di động.

🔹 **Giai đoạn 4: Kiểm thử, Tối ưu & Vá lỗi (Sprint 4)**
• Kiểm thử toàn diện các luồng nghiệp vụ (End-to-End Testing).
• Kiểm tra bảo mật cơ bản: chống SQL Injection, XSS, mã hóa mật khẩu và phân quyền.
• Tối ưu tốc độ tải trang, kích thước gói bundle và truy vấn cơ sở dữ liệu.

🔹 **Giai đoạn 5: Triển khai (Deployment) & Viết tài liệu (Sprint 5)**
• Cấu hình biến môi trường production (.env).
• Triển khai Backend và Frontend lên server/cloud hosting (Vercel, Render, AWS, Docker...).
• Viết file README.md hướng dẫn cài đặt, chạy dự án và danh mục API.

💡 **3. CHECKLIST ĐẦU VIỆC BẠN CÓ THỂ THÊM VÀO TASK MANAGER:**
[ ] Thiết kế Database Schema & ERD
[ ] Khởi tạo dự án & cấu hình Git/Repo
[ ] Xây dựng Authentication (Đăng ký, Đăng nhập, Phân quyền)
[ ] Lập trình các API chính
[ ] Xây dựng giao diện Frontend và ghép nối API
[ ] Tối ưu Responsive và fix toàn bộ bugs
[ ] Triển khai ứng dụng lên server thực tế

⚠️ **4. RỦI RO & PHÒNG NGỪA**
• **Scope Creep (Tính năng phình to)**: Kiên quyết hoàn thành bản MVP trước, chỉ thêm tính năng phụ sau khi lõi đã chạy mượt.
• **Bug đột xuất trước ngày ra mắt**: Luôn đóng băng tính năng (Feature Freeze) trước deadline ít nhất 3 ngày để tập trung kiểm thử.`;
  }

  if (domain === "business") {
    return `${contextHeader}📈 **BẢN KẾ HOẠCH CHI TIẾT KINH DOANH / MARKETING: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU & CHỈ SỐ THEN CHỐT (KPIs)**
• Xác thực nhu cầu thị trường và thu hút nhóm khách hàng tiềm năng đầu tiên.
• Tối ưu chi phí đầu tư ban đầu và đạt điểm hòa vốn trong thời gian dự kiến.
• Xây dựng quy trình vận hành và bán hàng bài bản.

⏱️ **2. QUY TRÌNH TRIỂN KHAI 5 BƯỚC**

🔹 **Bước 1: Nghiên cứu thị trường & Chân dung khách hàng (Tuần 1)**
• Khảo sát đối thủ cạnh tranh trực tiếp và gián tiếp (giá cả, ưu - nhược điểm).
• Xác định chân dung khách hàng mục tiêu: độ tuổi, sở thích, nỗi đau (pain points).
• Định vị giá trị độc nhất (USP) giúp sản phẩm nổi bật.

🔹 **Bước 2: Chuẩn bị sản phẩm / dịch vụ & Định giá (Tuần 2)**
• Chuẩn bị nguồn hàng / phát triển gói dịch vụ hoàn thiện.
• Tính toán chi phí biến đổi, chi phí cố định để thiết lập bảng giá hợp lý.
• Xây dựng chính sách ưu đãi, bảo hành và cam kết chất lượng.

🔹 **Bước 3: Xây dựng kênh bán hàng & Truyền thông (Tuần 3)**
• Thiết lập các kênh tiếp cận: Fanpage, Website, TikTok, sàn TMĐT hoặc mặt bằng.
• Chuẩn bị bộ nhận diện và nội dung bán hàng: hình ảnh, video, bài viết giới thiệu.
• Lên kế hoạch chiến dịch ra mắt (Launch Campaign) thu hút sự chú ý.

🔹 **Bước 4: Chạy thử nghiệm & Đo lường phản hồi (Tuần 4)**
• Bán thử cho tệp khách hàng quen hoặc người dùng đầu tiên (Early Adopters).
• Lắng nghe phản hồi thực tế để tinh chỉnh sản phẩm và trải nghiệm khách hàng.
• Đo lường tỷ lệ chuyển đổi, chi phí thu hút khách hàng (CAC).

🔹 **Bước 5: Mở rộng & Tối ưu hóa quy trình (Tuần 5 trở đi)**
• Đẩy mạnh các kênh quảng cáo mang lại hiệu quả cao nhất.
• Thiết lập quy trình chăm sóc khách hàng cũ (tăng tỷ lệ quay lại mua hàng).
• Quản lý dòng tiền chặt chẽ theo tuần.

💡 **3. CHECKLIST ĐẦU VIỆC BẠN CÓ THỂ THÊM VÀO TASK MANAGER:**
[ ] Khảo sát 3-5 đối thủ cạnh tranh chính
[ ] Hoàn thành bảng tính chi phí và kế hoạch giá
[ ] Chuẩn bị sản phẩm / dịch vụ mẫu
[ ] Xây dựng kênh truyền thông & nội dung quảng bá
[ ] Chạy thử nghiệm bán hàng đợt 1
[ ] Tổng kết phản hồi và cải thiện chất lượng`;
  }

  if (domain === "event") {
    return `${contextHeader}🎉 **BẢN KẾ HOẠCH TỔ CHỨC SỰ KIỆN: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU SỰ KIỆN**
• Tổ chức sự kiện thành công, chỉn chu, đúng ngân sách và tiến độ đề ra.
• Mang lại trải nghiệm ấn tượng và hài lòng cho toàn bộ khách tham dự.

⏱️ **2. KẾ HOẠCH HÀNH ĐỘNG THEO DÒNG THỜI GIAN**

🔹 **Giai đoạn 1: Ý tưởng & Lập ngân sách (Trước sự kiện 3-4 tuần)**
• Xác định mục tiêu, số lượng người tham dự, thời gian và địa điểm tổ chức.
• Lập bảng dự toán ngân sách chi tiết (thuê địa điểm, âm thanh, tiệc, quà tặng).
• Phân chia ban tổ chức và trách nhiệm cụ thể từng mảng.

🔹 **Giai đoạn 2: Lên kịch bản chi tiết & Hậu cần (Trước sự kiện 2 tuần)**
• Soạn kịch bản chương trình theo từng phút (Timeline Run-sheet).
• Liên hệ diễn giả, khách mời, MC và đối tác cung cấp dịch vụ.
• Thiết kế ấn phẩm: thư mời, backdrop, banner, quà tặng lưu niệm.

🔹 **Giai đoạn 3: Truyền thông & Xác nhận khách mời (Trước sự kiện 1 tuần)**
• Gửi thư mời và gọi điện xác nhận danh sách người tham gia (RSVP).
• Hoàn tất khâu in ấn, chuẩn bị quà tặng và đạo cụ kỹ thuật.
• Chuẩn bị phương án dự phòng (mưa bão, sự cố âm thanh, điện...).

🔹 **Giai đoạn 4: Tổng duyệt & Thực thi ngày sự kiện**
• Chạy tổng duyệt (Rehearsal) trước giờ G ít nhất 2 tiếng.
• Phân công trực check-in đón khách, điều phối âm thanh ánh sáng và kịch bản sân khấu.
• Hỗ trợ xử lý nhanh các phát sinh trong suốt sự kiện.

🔹 **Giai đoạn 5: Tổng kết & Hậu sự kiện**
• Dọn dẹp trả mặt bằng, kiểm kê tài sản.
• Gửi thư cảm ơn khách mời và chia sẻ hình ảnh đẹp của sự kiện.
• Họp rút kinh nghiệm và quyết toán tài chính.

💡 **3. CHECKLIST CẦN LÀM:**
[ ] Chốt địa điểm và ngân sách dự toán
[ ] Soạn kịch bản chi tiết (Timeline Agenda)
[ ] Hoàn thiện thiết kế Backdrop & thiệp mời
[ ] Chốt danh sách người tham gia
[ ] Chuẩn bị thiết bị âm thanh, ánh sáng và quà tặng
[ ] Tổng duyệt và điều phối ngày diễn ra`;
  }

  if (domain === "lifestyle") {
    return `${contextHeader}🌱 **BẢN KẾ HOẠCH RÈN LUYỆN & PHÁT TRIỂN: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU (Nguyên tắc SMART)**
• Xây dựng thói quen bền vững, cải thiện rõ rệt thể chất/tinh thần sau 30 ngày.
• Bắt đầu từ những bước nhỏ nhất để không bao giờ bỏ cuộc giữa chừng.

⏱️ **2. LỘ TRÌNH 30 NGÀY HÌNH THÀNH THÓI QUEN**

🔹 **Tuần 1: Khởi động vi mô (Micro-habits)**
• Đặt mục tiêu cực kỳ dễ dàng (ví dụ: tập 10 phút/ngày, đọc 5 trang sách/ngày).
• Gắn thói quen mới vào sau một thói quen cũ đã có sẵn (Habit Stacking).
• Chuẩn bị sẵn không gian và công cụ từ tối hôm trước để giảm ma sát hành vi.

🔹 **Tuần 2: Thiết lập kỷ luật & Chuỗi liên tục (Don't Break The Chain)**
• Đánh dấu tick hoàn thành vào ứng dụng hoặc lịch mỗi ngày.
• Nếu lỡ quên 1 ngày, tuyệt đối không được bỏ ngày thứ hai liên tiếp.
• Tăng nhẹ cường độ lên 15-20% so với tuần đầu.

🔹 **Tuần 3: Vượt qua điểm nản (The Dip)**
• Đây là giai đoạn cảm giác hào hứng ban đầu giảm bớt; hãy nhắc lại lý do bắt đầu.
• Tìm một người bạn đồng hành hoặc tự thưởng cho bản thân một phần quà nhỏ khi đạt mốc 21 ngày.

🔹 **Tuần 4: Ổn định & Biến thành lối sống tự nhiên**
• Đánh giá kết quả đo lường được (chỉ số cơ thể, lượng kiến thức tích lũy).
• Tinh chỉnh lịch trình phù hợp với nhịp sinh học lâu dài.

💡 **3. CHECKLIST HÀNH ĐỘNG HÀNG NGÀY:**
[ ] Chuẩn bị đồ dùng từ tối hôm trước
[ ] Thực hiện thói quen vào khung giờ cố định trong ngày
[ ] Đánh dấu hoàn thành trên Task Manager
[ ] Ghi chép cảm nhận ngắn 1 câu vào nhật ký`;
  }

  // General Plan
  return `${contextHeader}📋 **BẢN KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT: "${title.toUpperCase()}"**

🎯 **1. MỤC TIÊU & TIÊU CHUẨN HOÀN THÀNH (Definition of Done)**
• Hoàn thành toàn diện công việc với chất lượng cao nhất, đúng hạn chót đề ra.
• Kiểm soát chặt chẽ từng đầu việc nhỏ, không bị bỏ sót khâu quan trọng nào.

⏱️ **2. LỘ TRÌNH TRIỂN KHAI 5 GIAI ĐOẠN CHUẨN QUẢN TRỊ DỰ ÁN**

🔹 **Giai đoạn 1: Khởi động & Nghiên cứu chuẩn bị (10 - 15% thời lượng)**
• Xác định rõ kết quả cuối cùng cần đạt được và tiêu chí đánh giá thành công.
• Thu thập thông tin, tài liệu tham khảo và công cụ cần thiết.
• Lập danh sách những việc cần làm và thứ tự ưu tiên.

🔹 **Giai đoạn 2: Lập kế hoạch chi tiết & Phân bổ nguồn lực (10% thời lượng)**
• Chia nhỏ dự án thành các gói công việc cụ thể (Work Breakdown Structure).
• Ước lượng thời gian cho từng bước và ấn định deadline cụ thể.
• Xác định các rủi ro có thể xảy ra và chuẩn bị phương án dự phòng.

🔹 **Giai đoạn 3: Thực thi cốt lõi (50 - 60% thời lượng)**
• Tập trung giải quyết 20% công việc quan trọng nhất tạo ra 80% giá trị (Pareto 80/20).
• Làm việc theo từng khối thời gian tập trung (Time Blocking 60-90 phút), loại bỏ xao nhãng.
• Cập nhật tiến độ hàng ngày lên Task Manager để kiểm soát vận tốc.

🔹 **Giai đoạn 4: Rà soát, Kiểm tra & Tinh chỉnh (15% thời lượng)**
• Đối chiếu kết quả thực tế với mục tiêu ban đầu đặt ra.
• Khắc phục các sai sót, tinh chỉnh chi tiết để đạt tiêu chuẩn cao nhất.
• Nhờ người có chuyên môn hoặc đồng nghiệp góp ý khách quan.

🔹 **Giai đoạn 5: Bàn giao, Nghiệm thu & Đúc kết (5% thời lượng)**
• Đóng gói sản phẩm/kết quả cuối cùng và bàn giao đúng hạn.
• Lưu trữ tài liệu gọn gàng để dễ tái sử dụng về sau.
• Đúc kết 2 điều đã làm tốt và 1 bài học cần cải thiện cho dự án tiếp theo.

💡 **3. CHECKLIST ĐẦU VIỆC BẠN CÓ THỂ THÊM VÀO TASK MANAGER:**
[ ] Thu thập tài liệu và chuẩn bị công cụ cần thiết
[ ] Hoàn thành phần việc cốt lõi quan trọng nhất
[ ] Rà soát chất lượng và sửa đổi các điểm chưa hoàn thiện
[ ] Kiểm tra lần cuối cùng và đánh dấu hoàn thành 100%

🚀 **4. MẸO NĂNG SUẤT ĐỀ XUẤT**
• Áp dụng kỹ thuật Pomodoro (25 phút tập trung cao độ, 5 phút nghỉ ngơi).
• Đừng chần chừ tìm kiếm sự hoàn hảo ngay từ bước đầu; hãy hoàn thành bản nháp trước, tinh chỉnh sau!`;
}

// ==================================================
// RULE-BASED FALLBACK ANALYSIS (when no AI API key)
// ==================================================
function generateRuleBasedReply(question, tasks, categories, today) {
  const text = question.toLowerCase().trim();
  const catMap = {};
  categories.forEach((c) => { catMap[c.id] = c.name; });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100);
  const inProgress = tasks.filter(
    (t) =>
      (t.status === "Đang thực hiện" || t.status === "Đang làm" || (t.progress > 0 && t.progress < 100)) &&
      t.status !== "Hoàn thành"
  );
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dueToday = tasks.filter((t) => t.dueDate === todayStr && t.status !== "Hoàn thành" && t.progress !== 100);
  const urgent = tasks.filter((t) => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành");

  // Sắp xếp theo urgency score
  const getSortScore = (t) => {
    let score = 0;
    if (t.priority === "Khẩn cấp") score += 40;
    else if (t.priority === "Cao") score += 30;
    else if (t.priority === "Trung bình") score += 20;
    else score += 10;

    if (t.dueDate) {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due - today) / 86400000);
      if (diffDays < 0) score += 50;
      else if (diffDays === 0) score += 35;
      else if (diffDays <= 2) score += 25;
      else if (diffDays <= 7) score += 15;
    }

    score += (100 - (t.progress || 0)) / 10;
    return score;
  };

  const sorted = [...tasks]
    .filter((t) => t.status !== "Hoàn thành" && t.progress !== 100)
    .sort((a, b) => getSortScore(b) - getSortScore(a));

  // ==================================================
  // INTENT 1: LẬP KẾ HOẠCH CHI TIẾT CHO CÔNG VIỆC / DỰ ÁN
  // (Ưu tiên cao nhất khi người dùng yêu cầu lập kế hoạch)
  // ==================================================
  // ==================================================
  // INTENT 1: LẬP KẾ HOẠCH & LỘ TRÌNH CHI TIẾT
  // (Nhận diện mọi yêu cầu: quá trình, lộ trình, gợi ý, học, kế hoạch, hướng dẫn)
  // ==================================================
  const isPlanningRequest =
    text.includes("kế hoạch") ||
    text.includes("quá trình") ||
    text.includes("lộ trình") ||
    text.includes("gợi ý") ||
    text.includes("tiếng anh") ||
    text.includes("english") ||
    text.includes("học") ||
    text.includes("rèn luyện") ||
    text.includes("ôn thi") ||
    text.includes("hướng dẫn") ||
    text.includes("các bước") ||
    text.includes("cách làm") ||
    text.includes("làm sao") ||
    text.includes("lên lịch") ||
    text.includes("chiến lược") ||
    text.includes("phương pháp") ||
    text.includes("plan");

  if (isPlanningRequest) {
    return generateDetailedPlan(question, tasks, categories, today);
  }

  // ==================================================
  // INTENT KIỂM TRA LỊCH CÔNG VIỆC TRONG HỆ THỐNG
  // (Chỉ chạy khi người dùng hỏi đích danh về task/deadline của họ)
  // ==================================================
  const isWeeklySchedule =
    text.includes("deadline của tôi") ||
    text.includes("lịch làm việc của tôi") ||
    text.includes("việc tuần này của tôi") ||
    text.includes("task tuần này") ||
    text.includes("deadline tuần này");

  if (isWeeklySchedule) {
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingWeek = tasks.filter((t) => {
      if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due >= today && due <= sevenDaysLater;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    let reply = `📋 **Lịch trình công việc 7 ngày tới của bạn:**\n\n`;
    if (overdue.length > 0) {
      reply += `🔴 **Cần xử lý ngay (${overdue.length} việc quá hạn):**\n`;
      overdue.slice(0, 3).forEach((t) => {
        reply += `• "${t.title}"\n`;
      });
      reply += "\n";
    }
    if (upcomingWeek.length > 0) {
      reply += `📅 **Deadline trong 7 ngày tới:**\n`;
      upcomingWeek.slice(0, 7).forEach((t) => {
        reply += `• ${t.dueDate}: **"${t.title}"** [${t.priority}]\n`;
      });
    } else {
      reply += "Không có công việc nào có deadline trong 7 ngày tới.\n";
    }
    return reply;
  }

  // ==================================================
  // INTENT 2: CHÀO HỎI / GIỚI THIỆU KHẢ NĂNG
  // ==================================================
  if (
    text === "xin chào" || text === "hello" || text === "hi" ||
    text.includes("bạn là ai") || text.includes("bạn làm được gì") || text.includes("giới thiệu")
  ) {
    return `👋 **Xin chào! Tôi là Trợ lý AI Quản lý & Lập Kế hoạch Công việc của bạn.**

Tôi có thể hỗ trợ bạn ở phạm vi rất rộng, bao gồm:
1. 📝 **Lập kế hoạch hành động chi tiết**: Chỉ cần bạn nói tên bất kỳ công việc nào (Ví dụ: *"Lập kế hoạch làm đồ án tốt nghiệp"*, *"Kế hoạch xây dựng website"*), tôi sẽ lập lộ trình từng giai đoạn và danh sách checklist cụ thể!
2. 🎯 **Xác định công việc ưu tiên**: Phân tích danh sách việc của bạn để chọn ra việc cần làm ngay.
3. ⚠️ **Cảnh báo rủi ro trễ hạn**: Nhắc nhở các việc sắp đến hạn hoặc tiến độ chậm.
4. 🧩 **Chia nhỏ việc phức tạp**: Tách một task lớn thành các sub-task khả thi.
5. 🚀 **Tư vấn năng suất**: Phương pháp Pomodoro, Ma trận Eisenhower, Time Boxing giúp bạn vượt qua trì hoãn.

💬 Hãy thử gõ một yêu cầu như: *"Lập kế hoạch chi tiết cho một công việc"* hoặc *"Tôi nên làm gì trước?"* nhé!`;
  }

  // ==================================================
  // INTENT 3: TƯ VẤN PHƯƠNG PHÁP QUẢN LÝ THỜI GIAN & NĂNG SUẤT
  // ==================================================
  if (
    text.includes("pomodoro") || text.includes("eisenhower") || text.includes("quản lý thời gian") ||
    text.includes("trì hoãn") || text.includes("tập trung") || text.includes("lười") ||
    text.includes("hiệu suất") || text.includes("năng suất") || text.includes("mẹo làm việc")
  ) {
    return `🚀 **CẨM NANG NÂNG CAO NĂNG SUẤT & ĐÁNH BẠI TRÌ HOÃN**

Dưới đây là 4 phương pháp quản lý thời gian kinh điển đã được chứng minh hiệu quả:

1. 🍅 **Kỹ thuật Pomodoro (25 phút tập trung / 5 phút nghỉ)**
• Làm việc tập trung cao độ trong 25 phút không xao nhãng (tắt thông báo điện thoại).
• Sau 25 phút, nghỉ ngơi 5 phút (uống nước, vươn vai).
• Cứ sau 4 hiệp Pomodoro, nghỉ dài 15-20 phút.

2. ⚖️ **Ma trận Eisenhower (Ưu tiên theo 4 góc phần tư)**
• **Khẩn cấp & Quan trọng**: Xử lý ngay lập tức (Deadline hôm nay, sự cố khẩn).
• **Quan trọng nhưng Không khẩn cấp**: Lên lịch làm việc chủ động (Học tập, rèn luyện kỹ năng, lập kế hoạch).
• **Khẩn cấp nhưng Không quan trọng**: Ủy quyền hoặc giải quyết thật nhanh (Email thông thường, họp không cần thiết).
• **Không khẩn cấp & Không quan trọng**: Loại bỏ hoàn toàn (Lướt mạng vô định).

3. ⚡ **Quy tắc 2 phút (David Allen - Getting Things Done)**
• Nếu một công việc chỉ mất dưới 2 phút để hoàn thành (trả lời nhanh tin nhắn, gửi file, dọn bàn), hãy làm NGAY LẬP TỨC.

4. 🐸 **Chiến lược "Ăn con ếch vào buổi sáng" (Eat That Frog)**
• Chọn ra việc khó nhất, quan trọng nhất hoặc việc bạn đang cảm thấy ngại nhất để làm đầu tiên vào buổi sáng. Khi xong việc này, cả ngày bạn sẽ thấy nhẹ nhõm và tràn đầy năng lượng!`;
  }

  // ==================================================
  // INTENT 4: CHIA NHỎ CÔNG VIỆC THÀNH BƯỚC CON (SUB-TASKS)
  // ==================================================
  if (
    text.includes("chia") || text.includes("subtask") || text.includes("sub-task") ||
    text.includes("bước con") || text.includes("bước nhỏ") || text.includes("phân rã")
  ) {
    const candidateTasks = tasks.filter((t) => t.status !== "Hoàn thành" && t.progress < 100);
    let targetTask = candidateTasks.find((t) => text.includes(t.title.toLowerCase()));
    if (!targetTask) {
      targetTask = sorted[0] || candidateTasks[0];
    }

    if (!targetTask) {
      return `🧩 **Hướng dẫn chia nhỏ công việc bất kỳ thành 5 bước con hiệu quả:**

1. **Khảo sát & Chuẩn bị**: Xác định rõ mục tiêu cuối cùng, thu thập tài liệu và công cụ cần thiết (15-30 phút).
2. **Thiết kế khung / Dàn ý**: Xây dựng cấu trúc các phần chính cần giải quyết.
3. **Thực hiện phần cốt lõi**: Bắt tay vào phần việc quan trọng nhất mà không để bị phân tâm.
4. **Rà soát & Hoàn thiện**: Kiểm tra lại toàn bộ chi tiết, sửa lỗi và tinh chỉnh theo tiêu chuẩn.
5. **Đánh dấu hoàn thành**: Lưu trữ tài liệu và cập nhật tiến độ lên hệ thống.

💡 _Bạn có thể áp dụng 5 bước này cho bất kỳ công việc nào khi tạo mới trong Task Manager!_`;
    }

    return `🧩 **Đề xuất chia nhỏ công việc: "${targetTask.title}"**

Để hoàn thành công việc này hiệu quả và không bị quá tải, bạn nên thực hiện theo các bước con sau:

1. **Khảo sát & Chuẩn bị**: Xác định rõ mục tiêu cuối cùng, thu thập tài liệu và công cụ cần thiết (ước tính 15-30 phút).
2. **Lập dàn ý / Thiết kế khung**: Xây dựng cấu trúc chính hoặc phác thảo các phần cần giải quyết.
3. **Thực hiện phần cốt lõi**: Bắt tay vào phần việc quan trọng nhất mà không để bị phân tâm.
4. **Rà soát & Hoàn thiện**: Kiểm tra lại toàn bộ chi tiết, sửa lỗi và tinh chỉnh theo tiêu chuẩn.
5. **Bàn giao / Đánh dấu hoàn thành**: Lưu trữ tài liệu liên quan và cập nhật tiến độ lên 100%.

💡 _Mẹo: Bạn có thể vào chi tiết công việc này và thêm từng bước vào mục "Tiến trình thực hiện" để theo dõi tự động!_`;
  }

  // ==================================================
  // INTENT 5: CÁC CÂU HỎI LIÊN QUAN ĐẾN DANH SÁCH TASK CỦA USER
  // ==================================================

  // Ưu tiên / Nên làm gì trước
  if (
    text.includes("nên làm") || text.includes("ưu tiên") || text.includes("làm trước") ||
    text.includes("quan trọng") || text.includes("bắt đầu") || text.includes("recommend")
  ) {
    if (total === 0) {
      return "Bạn chưa có công việc nào trong hệ thống. Hãy tạo công việc đầu tiên hoặc yêu cầu tôi: *'Lập kế hoạch chi tiết cho một công việc'* để bắt đầu!";
    }
    if (sorted.length === 0) {
      return "✅ Bạn đã hoàn thành tất cả công việc trong danh sách! Bạn có thể nghỉ ngơi hoặc tạo thêm mục tiêu mới.";
    }
    let reply = `🚀 **Tôi đề xuất bạn xử lý theo thứ tự này:**\n\n`;
    sorted.slice(0, 6).forEach((t, i) => {
      const cat = t.categoryId ? catMap[t.categoryId] || "" : "";
      const catStr = cat ? ` | ${cat}` : "";
      const dueStr = t.dueDate ? ` | Hạn: ${t.dueDate}` : "";
      const progressStr = t.progress > 0 ? ` | ${t.progress}%` : "";
      reply += `${i + 1}. **"${t.title}"** [${t.priority}]${catStr}${dueStr}${progressStr}\n`;
    });
    reply += `\n📌 Dựa trên: deadline, mức độ ưu tiên và tiến độ hiện tại.`;
    return reply;
  }

  // Công việc quá hạn
  if (text.includes("quá hạn") || text.includes("trễ hạn") || text.includes("overdue")) {
    if (total === 0) {
      return "Bạn chưa có công việc nào trong hệ thống để kiểm tra quá hạn.";
    }
    if (overdue.length === 0) {
      return "✅ Tuyệt vời! Bạn không có công việc nào quá hạn. Hãy tiếp tục duy trì nhịp độ làm việc này!";
    }
    let reply = `⚠️ **Bạn có ${overdue.length} công việc quá hạn cần xử lý gấp:**\n\n`;
    overdue.slice(0, 8).forEach((t, i) => {
      const due = new Date(t.dueDate);
      const daysLate = Math.abs(Math.ceil((due - today) / 86400000));
      reply += `${i + 1}. **"${t.title}"** — Trễ **${daysLate} ngày** | Tiến độ: ${t.progress}%\n`;
    });
    reply += `\n💡 **Gợi ý:** Hãy dành đầu ngày hôm nay để xử lý dứt điểm các công việc này trước.`;
    return reply;
  }

  // Tình hình hôm nay
  if (text.includes("hôm nay") || text.includes("today")) {
    if (total === 0) {
      return "Hôm nay bạn chưa có công việc nào được ghi nhận. Hãy tạo công việc mới để bắt đầu một ngày làm việc hiệu quả!";
    }
    if (dueToday.length === 0) {
      return `📅 Hôm nay bạn không có công việc nào có hạn chót. ${overdue.length > 0 ? `Nhưng bạn có **${overdue.length}** công việc quá hạn cần xử lý ngay!` : "Hãy tranh thủ giải quyết các việc đang thực hiện!"}`;
    }
    let reply = `📅 **Hôm nay bạn có ${dueToday.length} công việc cần hoàn thành:**\n\n`;
    dueToday.forEach((t, i) => {
      reply += `${i + 1}. **"${t.title}"** [${t.priority}] — Tiến độ: ${t.progress}%\n`;
    });
    return reply;
  }

  // Nguy cơ trễ / Rủi ro
  if (text.includes("nguy cơ") || text.includes("rủi ro") || text.includes("sắp trễ") || text.includes("cảnh báo")) {
    const atRisk = tasks.filter((t) => {
      if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due - today) / 86400000);
      if (diffDays < 0) return false;
      if (diffDays <= 2 && t.progress < 50) return true;
      if (diffDays <= 5 && t.progress < 25) return true;
      return false;
    });

    if (atRisk.length === 0) {
      return "✅ An toàn! Hiện tại không có công việc nào có nguy cơ bị trễ hạn trong những ngày tới.";
    }
    let reply = `⚠️ **${atRisk.length} công việc có nguy cơ trễ hạn:**\n\n`;
    atRisk.forEach((t, i) => {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due - today) / 86400000);
      reply += `${i + 1}. **"${t.title}"** — còn **${diffDays} ngày** | Tiến độ: ${t.progress}%\n`;
    });
    reply += `\n💡 Hãy tăng tốc cho các công việc này để tránh bị quá hạn!`;
    return reply;
  }

  // (Lịch tuần đã được kiểm tra ở phần trên)

  // Tình hình / Tổng quan
  if (text.includes("tình hình") || text.includes("tổng quan") || text.includes("hiện tại") || text.includes("overview")) {
    if (total === 0) {
      return "Hiện tại hệ thống chưa có dữ liệu công việc. Bạn hãy tạo công việc mới hoặc yêu cầu tôi lập kế hoạch cho một việc cụ thể nhé!";
    }
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    let reply = `📊 **Tổng quan công việc của bạn:**\n\n`;
    reply += `• Tổng cộng: **${total}** công việc\n`;
    reply += `• Đã hoàn thành: **${completed.length}** (${rate}%)\n`;
    reply += `• Đang thực hiện: **${inProgress.length}**\n`;
    reply += `• Quá hạn: **${overdue.length}**\n`;
    reply += `• Hạn hôm nay: **${dueToday.length}**\n`;
    if (overdue.length > 0) {
      reply += `\n⚠️ Bạn có **${overdue.length}** công việc quá hạn cần xử lý ngay!`;
    } else if (rate >= 75) {
      reply += `\n🎉 Tuyệt vời! Bạn đang duy trì tiến độ rất tốt.`;
    } else {
      reply += `\n💪 Hãy tiếp tục tập trung hoàn thành các mục tiêu đang dang dở.`;
    }
    return reply;
  }

  // Tiến độ
  if (text.includes("tiến độ") || text.includes("progress")) {
    if (total === 0) {
      return "Bạn chưa có công việc nào để tính toán tiến độ.";
    }
    const avgProgress = Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total);
    const rate = Math.round((completed.length / total) * 100);
    let reply = `📈 **Tiến độ tổng thể:**\n\n`;
    reply += `• Tỷ lệ hoàn thành: **${rate}%** (${completed.length}/${total} công việc)\n`;
    reply += `• Tiến độ trung bình: **${avgProgress}%**\n\n`;
    if (inProgress.length > 0) {
      reply += `🔄 **Đang thực hiện (${inProgress.length}):**\n`;
      inProgress.slice(0, 5).forEach((t) => {
        reply += `• "${t.title}" — ${t.progress}%\n`;
      });
    }
    return reply;
  }

  // Danh mục
  if (text.includes("danh mục") || text.includes("category")) {
    if (categories.length === 0) {
      return "Bạn chưa tạo danh mục nào. Hãy tạo danh mục (Học tập, Công việc, Cá nhân...) để phân loại task ngăn nắp!";
    }
    let reply = `📁 **Công việc theo danh mục (${categories.length} danh mục):**\n\n`;
    categories.forEach((cat) => {
      const catTasks = tasks.filter((t) => t.categoryId === cat.id);
      const catDone = catTasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100).length;
      reply += `• **${cat.name}**: ${catTasks.length} việc, ${catDone} đã hoàn thành\n`;
    });
    return reply;
  }

  // Tổng kết / Báo cáo
  if (text.includes("tổng kết") || text.includes("báo cáo") || text.includes("summary")) {
    if (total === 0) {
      return "Bạn chưa có công việc nào để tạo báo cáo tổng kết.";
    }
    const avgProgress = Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / total);
    const rate = Math.round((completed.length / total) * 100);
    let reply = `📋 **BÁO CÁO TỔNG KẾT CÔNG VIỆC**\n\n`;
    reply += `• **Tổng số nhiệm vụ**: ${total} công việc\n`;
    reply += `• **Đã hoàn thành**: ${completed.length} (${rate}%)\n`;
    reply += `• **Đang thực hiện**: ${inProgress.length}\n`;
    reply += `• **Quá hạn**: ${overdue.length}\n`;
    reply += `• **Tiến độ trung bình**: ${avgProgress}%\n\n`;
    if (rate >= 80 && overdue.length === 0) {
      reply += `🏆 **Đánh giá**: Xuất sắc! Bạn quản lý thời gian rất kỷ luật.\n`;
    } else if (overdue.length > 0) {
      reply += `⚠️ **Lưu ý**: Hãy ưu tiên giải quyết ${overdue.length} việc quá hạn để tránh tồn đọng.\n`;
    } else {
      reply += `💪 **Đánh giá**: Tiến độ ổn định. Hãy tiếp tục duy trì nhịp độ này!\n`;
    }
    return reply;
  }

  // Default: Trả lời thông minh & Gợi ý kế hoạch hành động
  return `Tôi đã tiếp nhận yêu cầu của bạn: *"${question}"*

💡 **Gợi ý hướng xử lý:**
1. Nếu bạn muốn **lập kế hoạch chi tiết cho một việc cụ thể**, hãy hỏi:
   • *"Lập kế hoạch chi tiết cho [tên công việc của bạn]"*
   • Ví dụ: *"Lập kế hoạch chi tiết cho đồ án tốt nghiệp"*, *"Kế hoạch làm website"*
2. Nếu bạn muốn **quản lý công việc hiện tại**:
   • *"Tôi nên ưu tiên làm gì trước?"*
   • *"Công việc nào có nguy cơ trễ hạn?"*
   • *"Chia nhỏ công việc thành các bước con"*
3. Nếu bạn muốn **cải thiện phương pháp làm việc**:
   • *"Tư vấn cách quản lý thời gian Pomodoro"*`;
}

module.exports = router;
