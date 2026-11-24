import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Settings2,
  X,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  MessageSquare,
  Send,
  ChevronDown,
  FileText,
  Target,
  Layers,
  CalendarDays,
  Timer,
  TrendingUp,
  ClipboardList,
  Gauge,
} from "lucide-react";
import "./AI.css";
import { API_ENDPOINTS, getAuthHeaders } from "./config/api";

function AI({ tasks = [], categories: _categories = [] }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Xin chào! Tôi là trợ lý AI của Task Manager. Tôi có thể giúp bạn phân tích công việc, đánh giá rủi ro trễ hạn, ưu tiên nhiệm vụ và lên kế hoạch làm việc hiệu quả.",
      source: "system",
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    provider: null,
    model: null,
    message: "Đang kiểm tra trạng thái AI...",
  });
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [inputApiKey, setInputApiKey] = useState("");
  const [inputProvider, setInputProvider] = useState("gemini");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState(null);
  const [isQuickQuestionsOpen, setIsQuickQuestionsOpen] = useState(() => {
    const saved = localStorage.getItem("ai_quick_questions_open");
    return saved !== null ? saved === "true" : true;
  });

  const toggleQuickQuestions = () => {
    setIsQuickQuestionsOpen((prev) => {
      const next = !prev;
      localStorage.setItem("ai_quick_questions_open", String(next));
      return next;
    });
  };

  // Ref khu vực chat
  const messagesEndRef = useRef(null);

  // Check AI backend status
  const checkAiStatus = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.aiStatus, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data);
      }
    } catch {
      setAiStatus({
        configured: false,
        provider: null,
        model: null,
        message: "Chế độ phân tích dữ liệu nội bộ",
      });
    }
  };

  useEffect(() => {
    checkAiStatus();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!inputApiKey.trim()) {
      setConfigFeedback({ type: "error", message: "Vui lòng nhập API Key!" });
      return;
    }
    setIsSavingConfig(true);
    setConfigFeedback(null);
    try {
      const res = await fetch(API_ENDPOINTS.aiConfig, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          apiKey: inputApiKey.trim(),
          provider: inputProvider,
          model: inputProvider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiStatus({
          configured: data.configured,
          provider: data.provider,
          model: data.model,
          message: data.message,
        });
        setConfigFeedback({
          type: data.testSuccess ? "success" : "warning",
          message: data.message,
        });
        if (data.testSuccess) {
          setInputApiKey("");
          setTimeout(() => setShowConfigGuide(false), 2500);
        }
      } else {
        setConfigFeedback({ type: "error", message: data.message || "Không thể lưu cấu hình" });
      }
    } catch {
      setConfigFeedback({ type: "error", message: "Lỗi kết nối đến máy chủ" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Tự động cuộn xuống
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  // Câu hỏi nhanh đa dạng cho các tính năng phân tích & lập kế hoạch
  const quickQuestions = [
    {
      Icon: FileText,
      text: "Lập kế hoạch chi tiết cho một công việc",
    },
    {
      Icon: Target,
      text: "Tôi nên ưu tiên công việc nào trước?",
    },
    {
      Icon: Layers,
      text: "Chia nhỏ công việc lớn thành các sub-task",
    },
    {
      Icon: AlertTriangle,
      text: "Công việc nào có nguy cơ trễ hạn?",
    },
    {
      Icon: CalendarDays,
      text: "Hôm nay tôi cần làm những gì?",
    },
    {
      Icon: Timer,
      text: "Tư vấn phương pháp quản lý thời gian Pomodoro",
    },
    {
      Icon: TrendingUp,
      text: "Tiến độ công việc hiện tại thế nào?",
    },
    {
      Icon: ClipboardList,
      text: "Tổng kết kết quả công việc",
    },
    {
      Icon: Gauge,
      text: "Đề xuất cách cải thiện hiệu suất làm việc",
    },
  ];

  // Client-side rule-based fallback response
  const generateClientFallbackResponse = (question) => {
    const text = question.toLowerCase().trim();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Hoàn thành" || t.progress === 100).length;
    const doingTasks = tasks.filter(
      (t) => (t.status === "Đang làm" || t.status === "Đang thực hiện") && t.progress < 100
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueList = tasks.filter((task) => {
      if (!task.dueDate || task.status === "Hoàn thành" || task.progress === 100) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    // 1. LẬP KẾ HOẠCH & LỘ TRÌNH CHI TIẾT (ƯU TIÊN CAO NHẤT)
    const isPlan =
      text.includes("kế hoạch") ||
      text.includes("quá trình") ||
      text.includes("lộ trình") ||
      text.includes("gợi ý") ||
      text.includes("tiếng anh") ||
      text.includes("english") ||
      text.includes("học") ||
      text.includes("rèn luyện") ||
      text.includes("hướng dẫn") ||
      text.includes("các bước") ||
      text.includes("cách làm") ||
      text.includes("làm sao") ||
      text.includes("phương pháp");

    if (isPlan) {
      if (
        text.includes("tiếng anh") ||
        text.includes("english") ||
        text.includes("ielts") ||
        text.includes("toeic") ||
        text.includes("giao tiếp") ||
        text.includes("ngoại ngữ")
      ) {
        return `**LỘ TRÌNH 7 NGÀY BỨT PHÁ TIẾNG ANH THỰC CHIẾN (CHUYÊN SÂU)**

Chào bạn! Dưới đây là chương trình luyện tập thực chiến trong 7 ngày được thiết kế theo phương pháp **Comprehensible Input (Tiếp nhận hiểu được)** kết hợp **Shadowing (Bắt chước ngữ điệu)**, giúp bạn nhanh chóng phá vỡ rào cản sợ nói, làm chủ phản xạ và tự tin giao tiếp mà không cần dịch ngầm trong đầu.

**1. MỤC TIÊU CỐT LÕI SAU 7 NGÀY (Core Milestones)**
• Chuẩn hóa 44 âm trong bảng IPA (International Phonetic Alphabet), phát âm chuẩn người bản xứ.
• Nạp và sử dụng nhuần nhuyễn 150+ cụm từ (Collocations / Phrases) thông dụng nhất trong đời sống.
• Rèn luyện phản xạ nói liên tục 2 phút không ngập ngừng về chủ đề quen thuộc.
• Xây dựng kỷ luật học tiếng Anh bền vững mỗi ngày.

**2. PHÂN BỔ THỜI LƯỢNG MỖI NGÀY (Tổng 90 phút/ngày)**
• **Buổi sáng (30 phút)**: Phát âm & Nạp cụm từ vựng theo ngữ cảnh (Contextual Vocabulary).
• **Buổi trưa/chiều (30 phút)**: Luyện nghe chủ động & Bắt chước ngữ điệu (Shadowing Technique).
• **Buổi tối (30 phút)**: Tự nói phản xạ (Self-talk / Speaking practice) & Viết nhật ký 5 câu.

---

**3. KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT TỪNG NGÀY (DAY 1 - DAY 7)**

**NGÀY 1: ĐẬP TAN NỖI SỢ PHÁT ÂM & LÀM CHỦ BẢNG IPA**
• **Mục tiêu**: Sửa triệt để các lỗi phát âm người Việt hay mắc (âm đuôi /s/, /ed/, âm /θ/, /ð/, /ʃ/, /tʃ/).
• **Buổi sáng (30p)**: Xem video hướng dẫn khẩu hình 12 nguyên âm đơn và 8 nguyên âm đôi trên YouTube (kênh BBC Learning English hoặc Rachel's English).
• **Buổi trưa (30p)**: Đứng trước gương, phát âm to rõ 30 từ vựng cơ bản và kiểm tra âm đuôi (Ending sounds).
• **Buổi tối (30p)**: Cài đặt ứng dụng Elsa Speak hoặc Cambridge Dictionary để tra cứu và đọc lại 20 câu giao tiếp ngắn.
• *Checklist Day 1*: [ ] Thuộc khẩu hình âm /θ/ và /s/ | [ ] Ghi âm lại 1 đoạn đọc ngắn để nghe lại lỗi sai.

**NGÀY 2: CHIẾN LƯỢC 50 CỤM TỪ THỰC CHIẾN (NGỪNG DỊCH NGẦM TRONG ĐẦU)**
• **Mục tiêu**: Ngừng dịch từng từ đơn lẻ (Word-by-word); học theo cụm từ (Chunks of Language).
• **Buổi sáng (30p)**: Học 25 cụm từ chào hỏi, mở đầu câu chuyện và bày tỏ quan điểm (*In my opinion, As far as I know, Could you please...*).
• **Buổi trưa (30p)**: Đặt 2 câu ví dụ thực tế cho mỗi cụm từ vừa học gắn liền với công việc/cuộc sống của bạn.
• **Buổi tối (30p)**: Áp dụng kỹ thuật Spaced Repetition (Lặp lại ngắt quãng) ôn lại toàn bộ 50 cụm từ trước khi ngủ.
• *Checklist Day 2*: [ ] Ghi nhớ 50 cụm từ | [ ] Đặt 10 câu ví dụ liên quan đến bản thân.

**NGÀY 3: ĐỘT PHÁ KỸ NĂNG NGHE VỚI KỸ THUẬT SHADOWING**
• **Mục tiêu**: Bắt kịp tốc độ nói tự nhiên của người bản ngữ, nhận biết hiện tượng nối âm (Linking sounds).
• **Buổi sáng (30p)**: Chọn 1 đoạn audio ngắn 2-3 phút trên *BBC 6 Minute English* hoặc *Spotlight English*. Nghe lần 1 không nhìn transcript để nắm ý chính.
• **Buổi trưa (30p)**: Vừa nghe vừa nhìn transcript, gạch chân các từ nối âm và từ mới.
• **Buổi tối (30p)**: **Kỹ thuật Shadowing**: Bật audio và nói đuổi theo người bản ngữ từng câu một, bắt chước 100% ngữ điệu, ngắt nghỉ và cảm xúc. Lặp lại 5 lần.
• *Checklist Day 3*: [ ] Hoàn thành 1 bài Shadowing 3 phút | [ ] Thuộc cách nối âm cơ bản.

**NGÀY 4: NGỮ PHÁP ỨNG DỤNG CHO NÓI (KHÔNG HỌC VẸT CÔNG THỨC)**
• **Mục tiêu**: Làm chủ 3 thì cốt lõi chiếm 85% giao tiếp: Hiện tại đơn, Quá khứ đơn, Tương lai gần.
• **Buổi sáng (30p)**: Ôn luyện thì Quá khứ đơn: Kể lại 5 việc bạn đã làm ngày hôm qua bằng tiếng Anh.
• **Buổi trưa (30p)**: Luyện thì Tương lai gần (*be going to / will*): Lập danh sách 5 dự định cho cuối tuần này.
• **Buổi tối (30p)**: Tự quay video 1 phút bằng điện thoại: "Kể về một kỷ niệm đáng nhớ của bạn". Đừng lo lắng về lỗi sai, hãy tập trung vào sự trôi chảy!
• *Checklist Day 4*: [ ] Quay video 1 phút tự nói tiếng Anh | [ ] Nắm vững cách dùng 3 thì cơ bản.

**NGÀY 5: TỪ VỰNG CHUYÊN SÂU THEO CHỦ ĐỀ CÔNG VIỆC & ĐỜI SỐNG**
• **Mục tiêu**: Tự tin trao đổi về chuyên ngành, công việc hoặc sở thích của mình.
• **Buổi sáng (30p)**: Lập danh sách 20 từ vựng + cụm từ chuyên môn bạn hay dùng nhất trong công việc hàng ngày.
• **Buổi trưa (30p)**: Đọc 1 bài viết ngắn chuyên ngành trên Medium, LinkedIn hoặc BBC News.
• **Buổi tối (30p)**: Đóng vai (Role-play) tình huống: "Giới thiệu bản thân và công việc hiện tại trong 90 giây".
• *Checklist Day 5*: [ ] Nạp 20 từ vựng công việc | [ ] Hoàn thành bài nói Elevator Pitch 90 giây.

**NGÀY 6: PHẢN XẠ HỘI THOẠI & ĐỐI THOẠI TÌNH HUỐNG (REAL-LIFE SIMULATION)**
• **Mục tiêu**: Loại bỏ khoảng thời gian chết (hesitation) khi giao tiếp thực tế.
• **Buổi sáng (30p)**: Học các câu "câu giờ thông minh" khi chưa kịp nghĩ ra từ (*Well, let me see... / That's an interesting question... / To be honest...*).
• **Buổi trưa (30p)**: Tham gia 1 nhóm luyện nói online (Discord, Cambly, Free4Talk) hoặc nói chuyện trực tiếp với AI.
• **Buổi tối (30p)**: Trò chuyện tự do 15-20 phút với bạn học hoặc tự độc thoại trước gương về chủ đề "Kế hoạch tương lai của tôi".
• *Checklist Day 6*: [ ] 15 phút nói chuyện thực tế | [ ] Áp dụng thành thạo 5 cụm từ đệm tự nhiên.

**NGÀY 7: TỔNG KẾT ĐÁNH GIÁ, TEST NĂNG LỰC & LẬP LỘ TRÌNH 30 NGÀY**
• **Mục tiêu**: Đo lường sự tiến bộ và thiết lập thói quen dài hạn.
• **Buổi sáng (30p)**: Nghe lại video/audio đã ghi âm ngày 1 và so sánh với ngày 6 để thấy rõ sự tiến bộ về phát âm và độ lưu loát.
• **Buổi trưa (30p)**: Làm một bài mini-test từ vựng và ngữ pháp trên Duolingo hoặc trang Cambridge English.
• **Buổi tối (30p)**: Viết 1 trang nhật ký bằng tiếng Anh tổng kết 7 ngày vừa qua. Lên kế hoạch duy trì 30 phút mỗi ngày cho tuần tiếp theo.
• *Checklist Day 7*: [ ] So sánh ghi âm ngày 1 vs ngày 7 | [ ] Lên lịch học cố định cho 30 ngày tới.

---

**4. TOP NGUỒN HỌC MIỄN PHÍ CHẤT LƯỢNG CAO:**
1. **Phát âm**: *Rachel's English*, *BBC Learning English - Tim's Pronunciation Workshop* (YouTube).
2. **Luyện nghe & Shadowing**: *BBC 6 Minute English*, *TED-Ed*, *Spotlight English*.
3. **Từ vựng & Ngữ cảnh**: *Oxford 3000 Core Vocabulary*, *Cambridge Online Dictionary*.
4. **Luyện phản xạ**: *Free4talk.com*, *Elsa Speak*, hoặc *trò chuyện với Trợ lý AI*.

**BÍ QUYẾT THEN CHỐT:**
*"Fluency over Accuracy"* — Hãy ưu tiên **sự lưu loát và tự tin trước**, ngữ pháp và từ vựng nâng cao sẽ hoàn thiện dần theo thời gian. Bạn có thể thêm 7 đầu việc trên vào Task Manager để nhận nhắc nhở mỗi ngày nhé!`;
      }

      const isBrief =
        text.includes("ngắn gọn") ||
        text.includes("súc tích") ||
        text.includes("tóm tắt") ||
        text.includes("ngắn thôi") ||
        text.includes("nhanh");

      const dayMatch = text.match(/(?:trong\s+)?(\d+)\s+ngày/i);
      const requestedDays = dayMatch ? parseInt(dayMatch[1], 10) : null;
      const durationStr = requestedDays ? `TRONG ${requestedDays} NGÀY` : "";

      let targetName = question
        .replace(/(?:trả\s+lời\s+)?(?:ngắn\s+gọn|súc\s+tích|tóm\s+tắt|ngắn\s+thôi|vắn\s+tắt|nhanh\s+nhất|chi\s+tiết)/gi, "")
        .replace(/(?:trong\s+)?\d+\s+ngày/gi, "")
        .replace(/(?:cho\s+tôi|cho\s+mình|hãy\s+cho\s+tôi|gợi\s+ý\s+(?:cho\s+tôi|cho\s+mình)?|hướng\s+dẫn(?:\s+cho\s+tôi)?|giúp\s+tôi|giúp\s+mình)/gi, "")
        .replace(/(?:1\s+quá\s+trình|một\s+quá\s+trình|quá\s+trình|1\s+lộ\s+trình|một\s+lộ\s+trình|lộ\s+trình|kế\s+hoạch|các\s+bước)/gi, "")
        .replace(/(nhé|nha|với|ạ|ơi|đi|được\s+không)$/gi, "")
        .trim();

      if (!targetName || targetName.length < 2) {
        const pMatch = question.match(/(?:học|làm|ôn|rèn\s+luyện)\s+([^?.!]+)/i);
        if (pMatch && pMatch[1]) {
          targetName = pMatch[1]
            .replace(/(?:trả\s+lời\s+)?(?:ngắn\s+gọn|súc\s+tích|tóm\s+tắt)/gi, "")
            .replace(/(?:trong\s+)?\d+\s+ngày/gi, "")
            .trim();
        }
      }

      let matchedTask = null;
      if (targetName && tasks.length > 0) {
        matchedTask = tasks.find(
          (t) =>
            t.title.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(t.title.toLowerCase())
        );
      }

      let title = targetName || (matchedTask ? matchedTask.title : "Học Tập & Rèn Luyện");
      title = title.charAt(0).toUpperCase() + title.slice(1);

      let header = matchedTask
        ? `**Liên kết công việc trong hệ thống:**\n• Task: **"${matchedTask.title}"** | Ưu tiên: **${matchedTask.priority}** | Tiến độ: **${matchedTask.progress}%**\n\n---\n\n`
        : "";

      const topicLower = (title + " " + text).toLowerCase();
      if (
        topicLower.includes("toán") ||
        topicLower.includes("math") ||
        topicLower.includes("lý") ||
        topicLower.includes("hóa")
      ) {
        if (isBrief) {
          return `${header}**LỘ TRÌNH ÔN TẬP ${title.toUpperCase()} ${durationStr} (NGẮN GỌN & TRỌNG TÂM)**

• **Ngày 1 (Lý thuyết & Bảng công thức cốt lõi)**:
  - Tóm tắt toàn bộ công thức, định lý quan trọng ra 1 trang A4 (Cheat-sheet).
  - Hiểu rõ điều kiện áp dụng từng công thức, tránh học vẹt.

• **Ngày 2 (Luyện giải các dạng bài tập trọng tâm)**:
  - Chọn 3-5 dạng bài tập then chốt chiếm 70-80% điểm trong đề.
  - Giải từ bài mẫu cơ bản đến bài tự luyện, chú ý các bẫy thường gặp.

• **Ngày 3 (Thực chiến bấm giờ & Lấp lỗ hổng kiến thức)**:
  - Bấm giờ giải 1-2 đề thi thử chuẩn cấu trúc.
  - Rà soát lại tất cả các câu làm sai để ghi nhớ và khắc phục ngay.

**Lời khuyên thực chiến**: *"Hiểu sâu bản chất công thức + Luyện chắc bài mẫu"*, tránh sa đà vào các câu quá khó làm mất nhiều thời gian!`;
        }
      }

      return `${header}**BẢN KẾ HOẠCH CHI TIẾT: "${title.toUpperCase()}"**

**1. MỤC TIÊU & ĐẦU RA (Definition of Done)**
• Hoàn thành trọn vẹn mục tiêu công việc đúng hạn chót đề ra.
• Đảm bảo chất lượng đầu ra, hạn chế tối đa sai sót và phát sinh.

**2. LỘ TRÌNH TRIỂN KHAI**
• **Giai đoạn 1: Chuẩn bị & Thu thập thông tin**
  - Làm rõ mục tiêu, tiêu chuẩn đánh giá và chuẩn bị tài liệu.
• **Giai đoạn 2: Lập khung kế hoạch chi tiết**
  - Phân tách công việc thành các đầu việc nhỏ (Sub-tasks) và ấn định thời hạn.
• **Giai đoạn 3: Thực thi cốt lõi**
  - Tập trung làm việc quan trọng nhất trước (quy tắc 80/20).
  - Cập nhật % tiến độ liên tục vào hệ thống Task Manager.
• **Giai đoạn 4: Rà soát & Tinh chỉnh**
  - Kiểm tra chất lượng, sửa lỗi hoặc điều chỉnh các điểm chưa đạt.
• **Giai đoạn 5: Hoàn tất & Đúc kết**
  - Bàn giao kết quả, lưu trữ tài liệu và đánh dấu hoàn thành 100%.

**Checklist đề xuất:**
[ ] Khảo sát tài liệu và chuẩn bị công cụ
[ ] Hoàn thành phần việc cốt lõi trọng tâm
[ ] Kiểm tra lại toàn bộ chi tiết và sửa lỗi
[ ] Hoàn thành mục tiêu`;
    }

    // 2. CHÀO HỎI / GIỚI THIỆU
    if (
      text === "xin chào" ||
      text === "hello" ||
      text === "hi" ||
      text.includes("bạn là ai") ||
      text.includes("bạn làm được gì")
    ) {
      return `**Xin chào! Tôi là Trợ lý AI Quản lý & Lập Kế hoạch Công việc.**

Tôi có thể hỗ trợ bạn mọi lúc:
• **Lập kế hoạch hành động chi tiết**: Tạo lộ trình và checklist cho bất kỳ công việc nào bạn yêu cầu.
• **Đề xuất việc cần ưu tiên**: Chọn ra việc khẩn cấp, quan trọng nhất để làm trước.
• **Chia nhỏ task phức tạp**: Tách thành các bước con dễ thực hiện.
• **Cảnh báo nguy cơ trễ hạn**: Nhắc nhở hạn chót và rủi ro chậm trễ.
• **Tư vấn phương pháp năng suất**: Pomodoro, Ma trận Eisenhower, Time Boxing.

Hãy thử hỏi: *"Lập kế hoạch chi tiết cho đồ án"* hoặc *"Tôi nên làm gì trước?"* nhé!`;
    }

    // 3. THỐNG KÊ TÌNH HÌNH
    if (text.includes("thống kê") || text.includes("tình hình") || text.includes("tổng quan")) {
      if (totalTasks === 0) {
        return "Hiện tại bạn chưa có công việc nào trong hệ thống. Hãy thêm công việc hoặc yêu cầu tôi lập kế hoạch cho một việc mới nhé!";
      }
      return `**Tổng quan công việc hiện tại:**\n• Tổng số: **${totalTasks}** công việc\n• Đã hoàn thành: **${completedTasks}** (${Math.round((completedTasks / totalTasks) * 100)}%)\n• Đang thực hiện: **${doingTasks}**\n• Quá hạn: **${overdueList.length}**\n\n${
        overdueList.length > 0
          ? `Bạn có **${overdueList.length}** việc quá hạn, nên ưu tiên xử lý trước!`
          : "Tuyệt vời! Hiện tại không có công việc nào quá hạn."
      }`;
    }

    // 4. QUÁ HẠN
    if (text.includes("quá hạn") || text.includes("trễ hạn")) {
      if (overdueList.length === 0) {
        return "Tuyệt vời! Bạn không có công việc nào bị quá hạn. Hãy duy trì nhịp độ này!";
      }
      return `**Bạn có ${overdueList.length} công việc quá hạn:**\n${overdueList.map((t, idx) => `${idx + 1}. **"${t.title}"** (Hạn: ${t.dueDate || "Không có"})`).join("\n")}\n\nBạn nên tập trung hoàn thành các việc này ngay hôm nay.`;
    }

    // 5. ƯU TIÊN
    if (text.includes("ưu tiên") || text.includes("làm trước") || text.includes("bắt đầu")) {
      const urgent = tasks.filter((t) => t.priority === "Khẩn cấp" && t.status !== "Hoàn thành");
      const high = tasks.filter((t) => t.priority === "Cao" && t.status !== "Hoàn thành");
      const nextTasks = [...overdueList, ...urgent, ...high].slice(0, 5);

      if (nextTasks.length === 0) {
        return "Bạn không có việc nào khẩn cấp hay quá hạn! Bạn có thể chọn bất kỳ công việc nào đang dang dở để thực hiện.";
      }
      return `**Tôi đề xuất bạn ưu tiên xử lý:**\n${nextTasks.map((t, i) => `${i + 1}. **"${t.title}"** [${t.priority}] ${t.dueDate ? `(Hạn: ${t.dueDate})` : ""}`).join("\n")}\n\nƯu tiên dựa trên deadline và mức độ khẩn cấp.`;
    }

    // 6. DEFAULT
    return `Tôi đã nhận câu hỏi: *"${question}"*\n\n**Gợi ý bạn có thể hỏi tôi:**\n• *"Lập kế hoạch chi tiết cho [tên công việc]"*\n• *"Tôi nên ưu tiên làm gì trước?"*\n• *"Chia nhỏ công việc lớn thành các bước con"*\n• *"Tư vấn phương pháp quản lý thời gian Pomodoro"*`;
  };

  // Gửi câu hỏi đến Server Backend AI Route
  const sendMessage = async (question) => {
    if (!question || question.trim() === "") return;

    const userMessage = question.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setIsTyping(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        content: m.content,
      }));

      const res = await fetch(API_ENDPOINTS.aiChat, {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          message: userMessage,
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.reply || "Không có phản hồi.",
            source: data.source || "ai",
          },
        ]);
      } else {
        const fallback = generateClientFallbackResponse(userMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: fallback,
            source: "local",
          },
        ]);
      }
    } catch {
      const fallback = generateClientFallbackResponse(userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: fallback,
          source: "local",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(message);
  };

  const handleQuickQuestion = (q) => {
    if (isTyping) return;
    sendMessage(q);
  };

  // Live workspace metrics for the right telemetry rail
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const totalTaskCount = tasks.length;
  const completedTaskCount = tasks.filter(
    (t) => t.status === "Hoàn thành" || t.progress === 100
  ).length;
  const overdueTaskCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Hoàn thành" || t.progress === 100) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < todayMidnight;
  }).length;
  const activeTaskCount = Math.max(0, totalTaskCount - completedTaskCount);

  return (
    <div className="ai-page page-enter">
      {/* HEADER */}
      <div className="ai-header">
        <div className="ai-header-icon">
          <Bot size={20} strokeWidth={1.85} />
        </div>
        <div className="ai-header-copy">
          <div className="ai-title-row">
            <h1>Trợ lý lập kế hoạch</h1>
            <span className="ai-code-badge">
              {aiStatus.configured ? "ENGINE: CLOUD" : "ENGINE: LOCAL"}
            </span>
          </div>
          <p>Phân tích khối lượng công việc, cảnh báo hạn chót và đề xuất thứ tự ưu tiên theo dữ liệu thật</p>
        </div>

        {/* AI ENGINE STATUS BADGE */}
        <div className="ai-engine-badge-wrap">
          <button
            type="button"
            className={`ai-engine-badge ${aiStatus.configured ? "configured" : "local"}`}
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            title="Nhấn để xem cấu hình AI API"
          >
            <span className="ai-engine-dot"></span>
            <span>
              {aiStatus.configured
                ? `${aiStatus.provider === "openai" ? "OpenAI" : "Google Gemini"} (${aiStatus.model})`
                : "Phân tích nội bộ (Cấu hình API Key)"}
            </span>
            <Settings2 size={14} strokeWidth={1.75} className="ai-engine-info-icon" />
          </button>
        </div>
      </div>

      {/* AI CONFIGURATION GUIDE MODAL/BANNER */}
      {showConfigGuide && (
        <div className="ai-config-banner">
          <div className="ai-config-banner-header">
            <h4>
              <Zap size={15} strokeWidth={1.85} />
              Cấu hình &amp; Kích hoạt AI Cloud (Google Gemini / OpenAI)
            </h4>
            <button
              type="button"
              className="ai-config-close"
              onClick={() => setShowConfigGuide(false)}
              aria-label="Đóng bảng cấu hình"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <p>
            Để trợ lý phân tích và lập kế hoạch chuyên sâu mọi lĩnh vực, bạn có thể kết nối trực tiếp với{" "}
            <strong>Google Gemini (Miễn phí)</strong> hoặc <strong>OpenAI</strong>:
          </p>

          <form onSubmit={handleSaveConfig} className="ai-config-form">
            <div className="ai-config-field">
              <label>Nhà cung cấp AI</label>
              <div className="ai-config-radios">
                <label className="ai-radio-label">
                  <input
                    type="radio"
                    name="provider"
                    value="gemini"
                    checked={inputProvider === "gemini"}
                    onChange={(e) => setInputProvider(e.target.value)}
                  />
                  <span>Google Gemini (Khuyên dùng - Miễn phí)</span>
                </label>
                <label className="ai-radio-label">
                  <input
                    type="radio"
                    name="provider"
                    value="openai"
                    checked={inputProvider === "openai"}
                    onChange={(e) => setInputProvider(e.target.value)}
                  />
                  <span>OpenAI (ChatGPT)</span>
                </label>
              </div>
            </div>

            <div className="ai-config-field">
              <label>Dán API Key vào đây</label>
              <div className="ai-config-input-group">
                <input
                  type="password"
                  className="ai-config-key-input"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder={
                    inputProvider === "gemini"
                      ? "Dán Google Gemini API Key (bắt đầu bằng AIzaSy...)"
                      : "Dán OpenAI API Key (bắt đầu bằng sk-...)"
                  }
                />
                <button
                  type="submit"
                  className="ai-config-btn-save"
                  disabled={isSavingConfig || !inputApiKey.trim()}
                >
                  <Zap size={14} strokeWidth={1.85} />
                  {isSavingConfig ? "Đang kiểm tra..." : "Kích hoạt ngay"}
                </button>
              </div>
            </div>

            {inputProvider === "gemini" && (
              <div className="ai-config-tip">
                <strong>Chưa có Key?</strong> Lấy Google Gemini API Key miễn phí tại:{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="ai-link-google"
                >
                  aistudio.google.com/app/apikey
                  <ExternalLink size={12} strokeWidth={1.75} />
                </a>
              </div>
            )}

            {configFeedback && (
              <div className={`ai-config-msg ${configFeedback.type}`}>
                {configFeedback.type === "success" ? (
                  <CheckCircle2 size={15} strokeWidth={1.85} />
                ) : configFeedback.type === "warning" ? (
                  <AlertTriangle size={15} strokeWidth={1.85} />
                ) : (
                  <XCircle size={15} strokeWidth={1.85} />
                )}
                <span>{configFeedback.message}</span>
              </div>
            )}
          </form>

          <details className="ai-config-manual-details">
            <summary>Hoặc xem cách cấu hình thủ công qua file .env</summary>
            <div className="ai-config-code">
              <code>
                # Mở file server/.env và điền:<br />
                AI_PROVIDER=gemini<br />
                AI_API_KEY=AIzaSy... (API Key của bạn)<br />
                AI_MODEL=gemini-1.5-flash
              </code>
            </div>
          </details>
        </div>
      )}

      {/* FULL-WIDTH 2-PANE WORKBENCH */}
      <div className="ai-workbench">
        {/* LEFT PANE: CHAT CONSOLE */}
        <div className="ai-container">
          {/* CHAT HEADER */}
          <div className="ai-chat-header">
            <div className="ai-avatar">
              <Bot size={18} strokeWidth={1.85} />
            </div>
            <div className="ai-chat-title">
              <h2>Phiên phân tích &amp; lập kế hoạch</h2>
              <p>Kết nối trực tiếp dữ liệu {totalTaskCount} công việc hiện tại</p>
            </div>

            <div className="ai-status">
              <span className="ai-status-dot"></span>
              {aiStatus.configured ? "Cloud Online" : "Sẵn sàng"}
            </div>
          </div>

          {/* MESSAGES */}
          <div className="ai-messages">
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.role === "user"
                    ? "ai-message user-message"
                    : "ai-message bot-message"
                }
              >
                <div className="ai-message-bubble">
                  <div className="ai-message-label">
                    <span>{item.role === "user" ? "Bạn" : "Trợ lý"}</span>
                    {item.source === "ai" && (
                      <span className="ai-source-tag ai-source-real">AI Cloud</span>
                    )}
                    {item.source === "local" && (
                      <span className="ai-source-tag ai-source-local">Nội bộ</span>
                    )}
                  </div>
                  <div className="ai-message-text" style={{ whiteSpace: "pre-wrap" }}>
                    {item.content}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-message bot-message">
                <div className="ai-message-bubble">
                  <div className="ai-message-label">Trợ lý</div>
                  <div className="ai-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                    <em>Đang phân tích dữ liệu...</em>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef}></div>
          </div>

          {/* INPUT */}
          <form className="ai-input-form" onSubmit={handleSend}>
            <div className="ai-input-icon">
              <MessageSquare size={16} strokeWidth={1.75} />
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập yêu cầu, ví dụ: 'Lập kế hoạch chi tiết cho đồ án', 'Tôi nên ưu tiên việc gì?'..."
              disabled={isTyping}
            />
            <button type="submit" disabled={!message.trim() || isTyping}>
              <Send size={14} strokeWidth={1.85} />
              <span>Gửi</span>
            </button>
          </form>
        </div>

        {/* RIGHT PANE: LIVE WORKSPACE CONTEXT + QUICK PROMPTS */}
        <aside className="ai-rail">
          {/* LIVE CONTEXT READOUT */}
          <div className="ai-rail-panel">
            <div className="ai-rail-head">
              <span>Dữ liệu ngữ cảnh</span>
              <code>LIVE.TASKS</code>
            </div>
            <div className="ai-context-grid">
              <div className="ai-context-cell">
                <span>Tổng việc</span>
                <strong>{totalTaskCount}</strong>
              </div>
              <div className="ai-context-cell">
                <span>Đang mở</span>
                <strong>{activeTaskCount}</strong>
              </div>
              <div className="ai-context-cell is-danger">
                <span>Quá hạn</span>
                <strong>{overdueTaskCount}</strong>
              </div>
              <div className="ai-context-cell is-done">
                <span>Hoàn thành</span>
                <strong>{completedTaskCount}</strong>
              </div>
            </div>
          </div>

          {/* QUICK QUESTIONS PANEL */}
          <div className={`ai-rail-panel ai-quick-panel ${!isQuickQuestionsOpen ? "collapsed" : ""}`}>
            <div
              className="ai-rail-head ai-quick-title"
              onClick={toggleQuickQuestions}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleQuickQuestions();
                }
              }}
              title={
                isQuickQuestionsOpen
                  ? "Nhấn để thu gọn danh sách câu hỏi nhanh"
                  : "Nhấn để mở rộng danh sách câu hỏi nhanh"
              }
            >
              <div className="ai-quick-title-left">
                <Lightbulb size={14} strokeWidth={1.85} className="ai-quick-title-icon" />
                <span>Lệnh hỏi nhanh</span>
                <span className="ai-quick-badge">{quickQuestions.length}</span>
              </div>
              <ChevronDown
                size={15}
                strokeWidth={2}
                className={`ai-quick-chevron ${isQuickQuestionsOpen ? "open" : ""}`}
              />
            </div>

            <div className={`ai-quick-actions ${!isQuickQuestionsOpen ? "collapsed" : ""}`}>
              {quickQuestions.map((item, index) => {
                const IconComp = item.Icon;
                return (
                  <button
                    key={index}
                    type="button"
                    className="ai-quick-button"
                    onClick={() => handleQuickQuestion(item.text)}
                    disabled={isTyping}
                  >
                    <span className="ai-quick-item-icon">
                      <IconComp size={14} strokeWidth={1.75} />
                    </span>
                    <span>{item.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AI;
