import React, { useRef, useLayoutEffect, useEffect, useCallback } from "react";
import {
  Users,
  KanbanSquare,
  LayoutDashboard,
  Sun,
  CheckSquare,
  Calendar,
  BarChart3,
  Tag,
  Archive,
  Bell,
  MessageSquareText,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import UserAvatar from "./UserAvatar";
import { useTheme } from "../context/ThemeContext";

const menuSections = [
  {
    label: "Làm việc nhóm",
    items: [
      { id: "boards", label: "Không gian làm việc", badgeKey: "invites" },
      { id: "kanban", label: "Bảng Kanban" },
    ],
  },
  {
    label: "Tổng quan",
    items: [
      { id: "dashboard", label: "Bảng điều khiển" },
      { id: "myday", label: "Hôm nay" },
    ],
  },
  {
    label: "Theo dõi công việc",
    items: [
      { id: "tasks", label: "Tất cả công việc" },
      { id: "calendar", label: "Lịch hạn chót" },
    ],
  },
  {
    label: "Phân tích & Tổ chức",
    items: [
      { id: "statistics", label: "Thống kê" },
      { id: "categories", label: "Danh mục" },
      { id: "archive", label: "Kho lưu trữ" },
    ],
  },
  {
    label: "Cộng tác & Hỗ trợ",
    items: [
      { id: "notifications", label: "Thông báo", badgeKey: "unread" },
      { id: "ai", label: "Trợ lý lập kế hoạch" },
    ],
  },
  {
    label: "Tài khoản",
    items: [{ id: "settings", label: "Hồ sơ & Cài đặt" }],
  },
];

function renderNavIcon(id) {
  const props = { size: 17, strokeWidth: 1.75 };
  switch (id) {
    case "boards":
      return <Users {...props} />;
    case "kanban":
      return <KanbanSquare {...props} />;
    case "dashboard":
      return <LayoutDashboard {...props} />;
    case "myday":
      return <Sun {...props} />;
    case "tasks":
      return <CheckSquare {...props} />;
    case "calendar":
      return <Calendar {...props} />;
    case "statistics":
      return <BarChart3 {...props} />;
    case "categories":
      return <Tag {...props} />;
    case "archive":
      return <Archive {...props} />;
    case "notifications":
      return <Bell {...props} />;
    case "ai":
      return <MessageSquareText {...props} />;
    case "settings":
    default:
      return <Settings {...props} />;
  }
}

function Sidebar({
  currentPage,
  setCurrentPage,
  collapsed,
  setCollapsed,
  onLogout,
  unreadCount = 0,
  inviteCount = 0,
  boards = [],
  activeBoardId = null,
  onSelectBoard,
  currentUser,
  onMobileClose,
  mobileOpen,
}) {
  const { isTet } = useTheme();
  const navRef = useRef(null);
  const sliderRef = useRef(null);
  const hasPositionedRef = useRef(false);
  const glideTimerRef = useRef(null);

  const moveSliderToElement = useCallback((targetEl, immediate = false) => {
    const navEl = navRef.current;
    const sliderEl = sliderRef.current;
    if (!navEl || !sliderEl) return;

    if (!targetEl) {
      sliderEl.style.opacity = "0";
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const elRect = targetEl.getBoundingClientRect();
    const top = Math.round(elRect.top - navRect.top + navEl.scrollTop);
    const height = Math.round(elRect.height);

    if (immediate || !hasPositionedRef.current) {
      sliderEl.style.transition = "none";
      sliderEl.style.transform = `translate3d(0, ${top}px, 0)`;
      sliderEl.style.height = `${height}px`;
      sliderEl.style.opacity = "1";
      // Force reflow so subsequent moves animate cleanly from this spot
      void sliderEl.offsetHeight;
      sliderEl.style.transition = "";
      hasPositionedRef.current = true;
      return;
    }

    sliderEl.classList.add("is-gliding");
    sliderEl.style.transform = `translate3d(0, ${top}px, 0)`;
    sliderEl.style.height = `${height}px`;
    sliderEl.style.opacity = "1";

    if (glideTimerRef.current) window.clearTimeout(glideTimerRef.current);
    glideTimerRef.current = window.setTimeout(() => {
      sliderRef.current?.classList.remove("is-gliding");
    }, 340);
  }, []);

  const syncSliderPosition = useCallback(
    (immediate = false) => {
      const navEl = navRef.current;
      if (!navEl) return;
      const activeEl = navEl.querySelector(".nav-item.active");
      moveSliderToElement(activeEl, immediate);
    },
    [moveSliderToElement]
  );

  useLayoutEffect(() => {
    syncSliderPosition(false);
    const raf = window.requestAnimationFrame(() => syncSliderPosition(false));
    return () => window.cancelAnimationFrame(raf);
  }, [currentPage, collapsed, boards.length, mobileOpen, syncSliderPosition]);

  useEffect(() => {
    const onResize = () => syncSliderPosition(true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (glideTimerRef.current) window.clearTimeout(glideTimerRef.current);
    };
  }, [syncSliderPosition]);

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay visible" onClick={onMobileClose} />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* TOP: LOGO + COLLAPSE */}
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <KanbanSquare size={17} strokeWidth={2} />
            </div>
            {!collapsed && (
              <div className="sidebar-logo-group">
                <span className="sidebar-logo-text">Sổ Việc Nhóm</span>
                <span className="sidebar-logo-sub">Kanban Workspace</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.75} />
            ) : (
              <>
                <PanelLeftClose size={15} strokeWidth={1.75} />
                <span>Thu gọn menu</span>
              </>
            )}
          </button>
        </div>

        {/* MIDDLE: SCROLLABLE NAVIGATION WITH SMOOTH SLIDING INDICATOR */}
        <nav className="sidebar-nav" ref={navRef}>
          <div
            ref={sliderRef}
            className="sidebar-active-slider"
            style={{ opacity: 0 }}
            aria-hidden="true"
          />
          {menuSections.map((section, sectionIdx) => (
            <div key={section.label} className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {section.items.map((item) => {
                const isActive = currentPage === item.id;
                const badge =
                  item.badgeKey === "unread"
                    ? unreadCount
                    : item.badgeKey === "invites"
                    ? inviteCount
                    : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={(e) => {
                      moveSliderToElement(e.currentTarget, false);
                      setCurrentPage(item.id);
                      onMobileClose?.();
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{renderNavIcon(item.id)}</span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {badge > 0 && (
                      <span
                        className={`nav-badge ${
                          item.badgeKey === "invites" ? "nav-badge-invite" : ""
                        }`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* QUICK BOARD SWITCHER */}
              {sectionIdx === 0 && !collapsed && boards.length > 0 && (
                <div className="sidebar-boards-list">
                  <div className="sidebar-section-label" style={{ paddingTop: 6 }}>
                    Bảng của bạn
                  </div>
                  {boards.slice(0, 6).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`sidebar-board-item ${
                        currentPage === "kanban" &&
                        Number(activeBoardId) === Number(b.id)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        onSelectBoard?.(b.id);
                        onMobileClose?.();
                      }}
                    >
                      <span
                        className="sidebar-board-dot"
                        style={{ background: b.coverColor || "var(--accent-color)" }}
                      />
                      <span className="sidebar-board-name">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* BOTTOM: FIXED FOOTER (NEVER CLIPPED) */}
        <div className="sidebar-footer">
          {isTet && !collapsed && (
            <div className="sidebar-tet-badge">
              <Sparkles size={13} strokeWidth={1.75} />
              <span>Chúc Mừng Năm Mới</span>
            </div>
          )}

          {currentUser && (
            <div
              className="sidebar-user"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setCurrentPage("settings");
                onMobileClose?.();
              }}
            >
              <UserAvatar avatar={currentUser.avatar} name={currentUser.name} size={32} />
              {!collapsed && (
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{currentUser.name || "Người dùng"}</div>
                  <div className="sidebar-user-email">{currentUser.email || ""}</div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="sidebar-logout"
            onClick={onLogout}
            title={collapsed ? "Đăng xuất" : undefined}
          >
            <LogOut size={15} strokeWidth={1.75} />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
