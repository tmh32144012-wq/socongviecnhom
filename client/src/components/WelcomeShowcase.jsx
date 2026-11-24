import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Users,
  Sun,
  Moon,
  Sparkles,
  Droplets,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  SlidersHorizontal,
  Play,
  Pause,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "./WelcomeShowcase.css";

const PAGES = [
  { id: 0, navLabel: "Tổng quan" },
  { id: 1, navLabel: "Cộng tác Kanban" },
  { id: 2, navLabel: "Lịch & Thống kê" },
  { id: 3, navLabel: "Cá nhân hóa" },
];

const AUTO_PLAY_MS = 6500;

const INITIAL_DEMO_CARDS = [
  {
    id: 1,
    title: "Thiết kế cấu trúc bảng SQL Server",
    col: "done",
    owner: "Minh Hy",
    initials: "MH",
    color: "#2563EB",
    due: "Đã xong",
    tag: "Backend",
  },
  {
    id: 2,
    title: "Kéo thả thẻ giữa các cột Kanban",
    col: "doing",
    owner: "Ngọc Lan",
    initials: "NL",
    color: "#0F9D68",
    due: "Hôm nay",
    tag: "Frontend",
  },
  {
    id: 3,
    title: "Phân quyền mời thành viên theo email",
    col: "doing",
    owner: "Minh Hy",
    initials: "MH",
    color: "#2563EB",
    due: "Ngày mai",
    tag: "Nhóm",
  },
  {
    id: 4,
    title: "Viết tài liệu đặc tả & kịch bản demo",
    col: "todo",
    owner: "Đăng Khoa",
    initials: "ĐK",
    color: "#EA580C",
    due: "26/11",
    tag: "Tài liệu",
  },
  {
    id: 5,
    title: "Kiểm thử đồng bộ Realtime Socket.io",
    col: "todo",
    owner: "Ngọc Lan",
    initials: "NL",
    color: "#0F9D68",
    due: "27/11",
    tag: "QA",
  },
];

const ASSISTANT_DEMOS = [
  {
    id: "risk",
    prompt: "Công việc nào có nguy cơ trễ hạn?",
    reply:
      "Phát hiện 1 đầu việc cần ưu tiên: \"Kéo thả thẻ giữa các cột Kanban\" có hạn trong hôm nay (tiến độ 65%). Nên chốt phần lưu vị trí thẻ trước 17:00.",
  },
  {
    id: "priority",
    prompt: "Hôm nay nhóm nên làm gì trước?",
    reply:
      "Thứ tự đề xuất: (1) Hoàn tất kiểm thử kéo thả cột, (2) Duyệt lời mời thành viên mới, (3) Cập nhật slide giới thiệu vào cuối chiều.",
  },
];

function WelcomeShowcase({ onSkipToLogin, onGoToRegister }) {
  const {
    theme,
    setTheme,
    cycleTheme,
    accent,
    setAccent,
    themeOptions,
    accentOptions,
    tetEffectsEnabled,
    setTetEffectsEnabled,
    tetWishesEnabled,
    setTetWishesEnabled,
  } = useTheme();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("next");
  const [autoPlay, setAutoPlay] = useState(true);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [demoCards, setDemoCards] = useState(INITIAL_DEMO_CARDS);
  const [memberFilter, setMemberFilter] = useState("Tất cả");
  const [activePromptId, setActivePromptId] = useState("risk");

  const goToStep = useCallback((nextIdx) => {
    setStep((prev) => {
      const target = ((nextIdx % PAGES.length) + PAGES.length) % PAGES.length;
      setDirection(target >= prev ? "next" : "prev");
      return target;
    });
  }, []);

  // Auto-advance timer (pauses while hovering interactive mockups or when user toggles pause)
  useEffect(() => {
    if (!autoPlay || isHoverPaused) return undefined;
    const timer = window.setInterval(() => {
      setDirection("next");
      setStep((prev) => (prev + 1) % PAGES.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoPlay, isHoverPaused, step]);

  // Keyboard navigation Left / Right arrows
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") {
        setDirection("next");
        setStep((prev) => (prev + 1) % PAGES.length);
      } else if (e.key === "ArrowLeft") {
        setDirection("prev");
        setStep((prev) => (prev - 1 + PAGES.length) % PAGES.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const cycleCardStage = (cardId) => {
    setAutoPlay(false);
    setDemoCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const nextCol = c.col === "todo" ? "doing" : c.col === "doing" ? "done" : "todo";
        return { ...c, col: nextCol };
      })
    );
  };

  const visibleCards =
    memberFilter === "Tất cả"
      ? demoCards
      : demoCards.filter((c) => c.owner === memberFilter);

  const doneCount = demoCards.filter((c) => c.col === "done").length;
  const donePct = Math.round((doneCount / demoCards.length) * 100);

  const activeAssistantDemo =
    ASSISTANT_DEMOS.find((item) => item.id === activePromptId) || ASSISTANT_DEMOS[0];

  const renderThemeBadgeIcon = () => {
    if (theme === "light") return <Sun size={15} strokeWidth={1.85} />;
    if (theme === "glass") return <Droplets size={15} strokeWidth={1.85} />;
    if (theme === "tet") return <Sparkles size={15} strokeWidth={1.85} />;
    return <Moon size={15} strokeWidth={1.85} />;
  };

  const themeBadgeLabel =
    theme === "light"
      ? "Sáng"
      : theme === "glass"
      ? "Kính lỏng"
      : theme === "tet"
      ? "Tết"
      : "Tối";

  return (
    <div className="welcome-shell">
      {/* TOP NAVIGATION BAR */}
      <header className="welcome-nav">
        <div className="welcome-nav-inner">
          <div className="welcome-brand" onClick={() => goToStep(0)} role="button" tabIndex={0}>
            <div className="welcome-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="14" rx="1.2" />
                <rect x="9.5" y="3" width="5" height="9" rx="1.2" />
                <rect x="16" y="3" width="5" height="18" rx="1.2" />
              </svg>
            </div>
            <span className="welcome-brand-name">Sổ Việc Nhóm</span>
          </div>

          <nav className="welcome-tabs" aria-label="Các trang giới thiệu">
            {PAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`welcome-tab ${step === p.id ? "active" : ""}`}
                onClick={() => goToStep(p.id)}
              >
                {p.navLabel}
              </button>
            ))}
          </nav>

          <div className="welcome-nav-actions">
            <button
              type="button"
              className="welcome-theme-btn"
              onClick={cycleTheme}
              title="Đổi nhanh chủ đề giao diện"
            >
              {renderThemeBadgeIcon()}
              <span className="welcome-theme-label">{themeBadgeLabel}</span>
            </button>

            <button
              type="button"
              className="welcome-skip-btn"
              onClick={onSkipToLogin}
            >
              Bỏ qua
            </button>

            <button
              type="button"
              className="btn btn-primary welcome-cta-top"
              onClick={onGoToRegister}
            >
              Bắt đầu ngay
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SLIDE STAGE WITH KINETIC ENTRANCES */}
      <main className="welcome-stage">
        <div
          className={`welcome-stage-inner dir-${direction}`}
          key={step}
          onMouseEnter={() => setIsHoverPaused(true)}
          onMouseLeave={() => setIsHoverPaused(false)}
        >
          {/* ==================== PAGE 1: HERO + INTERACTIVE MINI-KANBAN ==================== */}
          {step === 0 && (
            <section className="intro-slide intro-hero-layout">
              <div className="intro-hero-left">
                <div className="intro-step-pill kinetic-from-left k-delay-1">
                  <span>1 / 4</span>
                  <span>Không gian quản lý công việc nhóm</span>
                </div>

                <h1 className="kinetic-from-left k-delay-2">
                  Sắp xếp việc nhóm rõ ràng ngay từ đầu tuần.
                </h1>

                <p className="intro-lead kinetic-from-left k-delay-3">
                  Tạo bảng Kanban cho từng đồ án, chia cột linh hoạt, phân công thành viên và theo dõi hạn chót trong cùng một không gian gọn gàng — không cần chuyển qua lại giữa bảng tính và nhóm chat.
                </p>

                <div className="intro-cta-row kinetic-from-left k-delay-4">
                  <button type="button" className="btn btn-primary intro-btn-lg" onClick={onSkipToLogin}>
                    Đăng nhập vào không gian
                  </button>
                  <button type="button" className="btn btn-secondary intro-btn-lg" onClick={onGoToRegister}>
                    Tạo tài khoản mới
                  </button>
                </div>

                <div className="intro-footnote kinetic-from-left k-delay-5">
                  <span>Có sẵn 3 tài khoản nhóm mẫu để dùng thử ngay sau khi đăng nhập.</span>
                </div>
              </div>

              {/* LIVE INTERACTIVE PLAYGROUND */}
              <div className="intro-hero-right kinetic-from-right k-delay-2">
                <div className="playground-frame">
                  <div className="playground-topbar">
                    <div className="playground-title-group">
                      <span className="playground-board-dot" />
                      <strong>Dự án Website Kanban</strong>
                      <span className="playground-live-tag">Thử bấm vào thẻ</span>
                    </div>

                    <div className="playground-progress-inline">
                      <span>{doneCount}/{demoCards.length} xong</span>
                      <div className="playground-bar">
                        <div className="playground-bar-fill" style={{ width: `${donePct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="playground-filter-row">
                    {["Tất cả", "Minh Hy", "Ngọc Lan", "Đăng Khoa"].map((member) => (
                      <button
                        key={member}
                        type="button"
                        className={`playground-filter-chip ${memberFilter === member ? "active" : ""}`}
                        onClick={() => {
                          setAutoPlay(false);
                          setMemberFilter(member);
                        }}
                      >
                        {member}
                      </button>
                    ))}
                  </div>

                  <div className="playground-columns">
                    {[
                      { key: "todo", label: "Cần làm", dot: "#64748B" },
                      { key: "doing", label: "Đang làm", dot: "#D97706" },
                      { key: "done", label: "Hoàn thành", dot: "#0F9D68" },
                    ].map((col, colIdx) => {
                      const colCards = visibleCards.filter((c) => c.col === col.key);
                      return (
                        <div
                          key={col.key}
                          className={`playground-col kinetic-pop k-delay-${colIdx + 2}`}
                        >
                          <div className="playground-col-head">
                            <span className="playground-col-dot" style={{ background: col.dot }} />
                            <span>{col.label}</span>
                            <em>{colCards.length}</em>
                          </div>

                          <div className="playground-col-cards">
                            {colCards.length === 0 ? (
                              <div className="playground-empty">Trống</div>
                            ) : (
                              colCards.map((card) => (
                                <button
                                  key={card.id}
                                  type="button"
                                  className={`playground-card ${card.col === "done" ? "is-done" : ""}`}
                                  onClick={() => cycleCardStage(card.id)}
                                  title="Bấm để chuyển sang cột tiếp theo"
                                >
                                  <div className="playground-card-top">
                                    <span className="playground-card-tag">{card.tag}</span>
                                    <span className="playground-card-due">{card.due}</span>
                                  </div>
                                  <div className="playground-card-title">{card.title}</div>
                                  <div className="playground-card-foot">
                                    <span
                                      className="playground-avatar"
                                      style={{ background: card.color }}
                                    >
                                      {card.initials}
                                    </span>
                                    <span className="playground-owner">{card.owner}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==================== PAGE 2: COLLABORATION & REALTIME ==================== */}
          {step === 1 && (
            <section className="intro-slide intro-split-layout">
              <div className="intro-visual-col kinetic-from-left k-delay-2">
                <div className="collab-mockup">
                  <div className="collab-mockup-header">
                    <div>
                      <span className="collab-board-crumb">Bảng: Phát triển sản phẩm • Cột Đang làm</span>
                      <h3>Hoàn thiện phân quyền thành viên &amp; đồng bộ Realtime</h3>
                    </div>
                    <span className="collab-sync-badge">
                      <i />
                      Đang đồng bộ
                    </span>
                  </div>

                  <div className="collab-meta-strip">
                    <div className="collab-meta-item">
                      <Users size={14} strokeWidth={1.85} />
                      <span>Minh Hy, Ngọc Lan</span>
                    </div>
                    <div className="collab-meta-item">
                      <CalendarDays size={14} strokeWidth={1.85} />
                      <span>Hạn: 26/11</span>
                    </div>
                    <div className="collab-meta-item">
                      <Paperclip size={14} strokeWidth={1.85} />
                      <span>spec-api-v2.pdf</span>
                    </div>
                  </div>

                  <div className="collab-checklist">
                    <div className="collab-check-row done">
                      <span className="collab-box checked"><Check size={11} strokeWidth={2.5} /></span>
                      <span>Tạo API mời thành viên bằng email</span>
                    </div>
                    <div className="collab-check-row done">
                      <span className="collab-box checked"><Check size={11} strokeWidth={2.5} /></span>
                      <span>Phát sự kiện Socket.io khi di chuyển thẻ</span>
                    </div>
                    <div className="collab-check-row">
                      <span className="collab-box" />
                      <span>Kiểm thử thông báo bình luận trên 2 trình duyệt</span>
                    </div>
                  </div>

                  <div className="collab-comments">
                    <div className="collab-comment-title">
                      <MessageSquare size={14} strokeWidth={1.85} />
                      <span>Trao đổi trực tiếp trên thẻ</span>
                    </div>
                    <div className="collab-bubble">
                      <div className="collab-bubble-head">
                        <strong>Ngọc Lan</strong>
                        <span>Vừa xong</span>
                      </div>
                      <p>Mình vừa kéo xong phần kiểm tra quyền Chủ bảng và Thành viên, bạn kéo lại thử trên trình duyệt thứ hai nhé.</p>
                    </div>
                    <div className="collab-bubble is-reply">
                      <div className="collab-bubble-head">
                        <strong>Minh Hy</strong>
                        <span>1 phút trước</span>
                      </div>
                      <p>Đã nhận cập nhật tức thì không cần tải lại trang. Chốt để chuyển sang cột Hoàn thành.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="intro-copy-col">
                <div className="intro-step-pill kinetic-from-right k-delay-1">
                  <span>2 / 4</span>
                  <span>Làm việc nhóm thời gian thực</span>
                </div>

                <h2 className="kinetic-from-right k-delay-2">
                  Mọi thay đổi hiện ngay trên màn hình cả đội.
                </h2>

                <p className="intro-lead kinetic-from-right k-delay-3">
                  Không còn cảnh gửi ảnh chụp màn hình để hỏi "việc này tới đâu rồi". Mọi thẻ công việc, thành viên phụ trách và thảo luận đều nằm đúng ngữ cảnh.
                </p>

                <div className="intro-feature-rows">
                  <div className="intro-feature-row kinetic-from-right k-delay-3">
                    <strong>Mời thành viên &amp; phân vai rõ ràng</strong>
                    <p>Gửi lời mời tham gia bảng theo email với vai trò Chủ bảng, Quản trị hoặc Thành viên.</p>
                  </div>
                  <div className="intro-feature-row kinetic-from-right k-delay-4">
                    <strong>Kéo thả mượt, đồng bộ qua Socket.io</strong>
                    <p>Khi một người đổi cột, cập nhật tiến độ hoặc thêm bình luận, cả nhóm thấy ngay lập tức.</p>
                  </div>
                  <div className="intro-feature-row kinetic-from-right k-delay-5">
                    <strong>Checklist, tệp đính kèm &amp; lưu trữ gọn</strong>
                    <p>Tách nhỏ đầu việc thành từng bước con, tải tài liệu trực tiếp và cất việc cũ vào kho lưu trữ.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==================== PAGE 3: CALENDAR, ANALYTICS & ASSISTANT ==================== */}
          {step === 2 && (
            <section className="intro-slide intro-split-layout is-reversed">
              <div className="intro-copy-col">
                <div className="intro-step-pill kinetic-from-left k-delay-1">
                  <span>3 / 4</span>
                  <span>Lịch trình &amp; Kiểm soát tiến độ</span>
                </div>

                <h2 className="kinetic-from-left k-delay-2">
                  Nhìn rõ hạn chót trước khi mọi thứ trở nên gấp gáp.
                </h2>

                <p className="intro-lead kinetic-from-left k-delay-3">
                  Ngoài bảng Kanban, hệ thống tự động gom hạn chót vào Lịch Tháng/Tuần/Ngày, vẽ biểu đồ hiệu suất và cảnh báo sớm các đầu việc có nguy cơ trễ tiến độ.
                </p>

                <div className="intro-feature-rows">
                  <div className="intro-feature-row kinetic-from-left k-delay-3">
                    <strong>Lịch hạn chót &amp; Chế độ Hôm nay</strong>
                    <p>Tập trung đúng danh sách việc cần xử lý trong ngày và xem tổng quan cả tuần chỉ trong một cú bấm.</p>
                  </div>
                  <div className="intro-feature-row kinetic-from-left k-delay-4">
                    <strong>Thống kê &amp; Cảnh báo rủi ro trễ hạn</strong>
                    <p>Tự động phát hiện thẻ sắp đến hạn nhưng tiến độ còn thấp để bạn tăng ưu tiên kịp thời.</p>
                  </div>
                  <div className="intro-feature-row kinetic-from-left k-delay-5">
                    <strong>Trợ lý lập kế hoạch tích hợp</strong>
                    <p>Hỗ trợ chia nhỏ công việc lớn thành từng bước và đề xuất thứ tự xử lý theo dữ liệu thật của bạn.</p>
                  </div>
                </div>
              </div>

              <div className="intro-visual-col">
                <div className="insights-mockup">
                  <div className="insights-panel kinetic-from-right k-delay-2">
                    <div className="insights-panel-head">
                      <strong>Lịch hạn chót tuần này</strong>
                      <span>3 mốc quan trọng</span>
                    </div>
                    <div className="insights-timeline">
                      <div className="timeline-row">
                        <span className="timeline-date">T2 • 23/11</span>
                        <div className="timeline-content">
                          <strong>Chốt giao diện trang giới thiệu</strong>
                          <span className="timeline-status is-done">
                            <CheckCircle2 size={12} strokeWidth={2} /> Hoàn thành
                          </span>
                        </div>
                      </div>
                      <div className="timeline-row">
                        <span className="timeline-date">T4 • 25/11</span>
                        <div className="timeline-content">
                          <strong>Kiểm thử kéo thả Kanban &amp; Socket.io</strong>
                          <span className="timeline-status is-warn">
                            <Clock size={12} strokeWidth={2} /> 65% tiến độ
                          </span>
                        </div>
                      </div>
                      <div className="timeline-row">
                        <span className="timeline-date">T6 • 27/11</span>
                        <div className="timeline-content">
                          <strong>Nộp báo cáo &amp; trình diễn sản phẩm</strong>
                          <span className="timeline-status is-alert">
                            <AlertTriangle size={12} strokeWidth={2} /> Ưu tiên cao
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="insights-panel kinetic-from-right k-delay-4">
                    <div className="insights-panel-head">
                      <strong>Trợ lý lập kế hoạch</strong>
                      <span>Thử bấm câu hỏi</span>
                    </div>
                    <div className="assistant-demo-chips">
                      {ASSISTANT_DEMOS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`assistant-demo-chip ${activePromptId === item.id ? "active" : ""}`}
                          onClick={() => {
                            setAutoPlay(false);
                            setActivePromptId(item.id);
                          }}
                        >
                          <Send size={11} strokeWidth={2} />
                          <span>{item.prompt}</span>
                        </button>
                      ))}
                    </div>
                    <div className="assistant-demo-reply">
                      {activeAssistantDemo.reply}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ==================== PAGE 4: LIVE THEME CUSTOMIZATION (4 THEMES) ==================== */}
          {step === 3 && (
            <section className="intro-slide intro-theme-layout">
              <div className="intro-theme-head">
                <div className="intro-step-pill kinetic-from-left k-delay-1">
                  <span>4 / 4</span>
                  <span>Chọn phong cách làm việc của riêng bạn</span>
                </div>
                <h2 className="kinetic-from-left k-delay-2">
                  Tùy chỉnh giao diện ngay trước khi bắt đầu.
                </h2>
                <p className="intro-lead kinetic-from-left k-delay-3">
                  Chọn chế độ Sáng tinh gọn, Tối sâu, Kính lỏng trong suốt hoặc chủ đề Tết tông cam ấm. Bạn còn có thể đổi ảnh nền và tinh chỉnh sâu từng chủ đề trong Cài đặt.
                </p>
              </div>

              <div className="intro-theme-picker-grid">
                {themeOptions.map((opt, idx) => {
                  const isActive = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`intro-theme-card kinetic-pop k-delay-${idx + 2} ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setAutoPlay(false);
                        setTheme(opt.id);
                      }}
                    >
                      <div
                        className="intro-theme-preview"
                        style={{
                          background: opt.previewBg,
                          borderColor: opt.previewBorder,
                        }}
                      >
                        <div className="preview-sidebar" style={{ background: opt.previewCard }} />
                        <div className="preview-body">
                          <div className="preview-bar" style={{ background: opt.previewCard }} />
                          <div className="preview-cols">
                            <span style={{ background: opt.previewCard }} />
                            <span style={{ background: opt.previewCard }} />
                            <span style={{ background: opt.previewCard }} />
                          </div>
                        </div>
                      </div>
                      <div className="intro-theme-meta">
                        <div className="intro-theme-title-row">
                          <strong>{opt.label}</strong>
                          {isActive && (
                            <span className="intro-theme-check">
                              <Check size={12} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <p>{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ACCENT PICKER OR TET EFFECT TOGGLES */}
              <div className="intro-accent-strip kinetic-from-bottom k-delay-4">
                <div className="intro-accent-left">
                  <SlidersHorizontal size={15} strokeWidth={1.85} />
                  <span>{theme === "tet" ? "Hiệu ứng chủ đề Tết (nằm sau nền)" : "Màu nhấn chủ đạo"}</span>
                </div>

                {theme === "tet" ? (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <label className="intro-tet-toggle">
                      <input
                        type="checkbox"
                        checked={tetEffectsEnabled}
                        onChange={(e) => setTetEffectsEnabled(e.target.checked)}
                      />
                      <span>Bao lì xì rơi</span>
                    </label>
                    <label className="intro-tet-toggle">
                      <input
                        type="checkbox"
                        checked={tetWishesEnabled}
                        onChange={(e) => setTetWishesEnabled(e.target.checked)}
                      />
                      <span>Câu chúc Tết rơi</span>
                    </label>
                  </div>
                ) : (
                  <div className="intro-accent-dots">
                    {accentOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`intro-accent-dot ${accent === item.id ? "selected" : ""}`}
                        style={{ background: item.color }}
                        title={item.label}
                        onClick={() => {
                          setAutoPlay(false);
                          setAccent(item.id);
                        }}
                      >
                        {accent === item.id && <Check size={13} strokeWidth={2.8} color="#fff" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* FINAL LAUNCH BAR */}
              <div className="intro-final-cta kinetic-from-bottom k-delay-5">
                <button type="button" className="btn btn-primary intro-btn-lg" onClick={onSkipToLogin}>
                  Vào trang Đăng nhập
                </button>
                <button type="button" className="btn btn-secondary intro-btn-lg" onClick={onGoToRegister}>
                  Đăng ký tài khoản mới
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* BOTTOM STEPPER FOOTER WITH LIVE AUTO-PLAY PROGRESS */}
      <footer className="welcome-footer">
        <div className="welcome-footer-inner">
          <div className="welcome-progress-dots" role="tablist" aria-label="Tiến trình giới thiệu">
            {PAGES.map((p) => {
              const isCurrent = step === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`welcome-dot ${isCurrent ? "active" : ""}`}
                  onClick={() => goToStep(p.id)}
                  aria-label={`Chuyển đến trang ${p.navLabel}`}
                >
                  {isCurrent && autoPlay && !isHoverPaused && (
                    <span
                      key={`bar-${step}`}
                      className="welcome-dot-progress"
                      style={{ animationDuration: `${AUTO_PLAY_MS}ms` }}
                    />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              className={`welcome-autoplay-btn ${autoPlay ? "is-playing" : ""}`}
              onClick={() => setAutoPlay((prev) => !prev)}
              title={autoPlay ? "Tạm dừng tự động chuyển trang" : "Bật tự động chuyển trang"}
            >
              {autoPlay ? <Pause size={12} strokeWidth={2.2} /> : <Play size={12} strokeWidth={2.2} />}
              <span>{autoPlay ? "Tự động" : "Tạm dừng"}</span>
            </button>

            <span className="welcome-step-count">
              Trang {step + 1} / {PAGES.length}
            </span>
          </div>

          <div className="welcome-footer-controls">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onSkipToLogin}
            >
              Bỏ qua giới thiệu
            </button>

            {step > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => goToStep(step - 1)}
              >
                <ArrowLeft size={14} strokeWidth={1.85} />
                <span>Quay lại</span>
              </button>
            )}

            {step < PAGES.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => goToStep(step + 1)}
              >
                <span>Tiếp theo</span>
                <ArrowRight size={14} strokeWidth={1.85} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onSkipToLogin}
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight size={14} strokeWidth={1.85} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default WelcomeShowcase;
