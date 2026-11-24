import { useState } from "react";
import { Plus, X, Save, Folder, Pencil, Trash2, Check } from "lucide-react";
import "../styles/categories.css";
import { API_ENDPOINTS } from "../config/api";

function Categories({
  categories,
  fetchCategories,
  setCurrentPage,
  setCategoryFilter,
}) {
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // =========================
  // THÊM DANH MỤC
  // =========================
  const handleAddCategory = async (event) => {
    event.preventDefault();

    if (categoryName.trim() === "") {
      alert("Vui lòng nhập tên danh mục!");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API_ENDPOINTS.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể thêm danh mục");
      }

      await fetchCategories();

      setCategoryName("");
      setShowForm(false);
    } catch (error) {
      console.error("Lỗi khi thêm danh mục:", error);
      alert(error.message || "Không thể thêm danh mục.");
    }
  };

  // =========================
  // XÓA DANH MỤC
  // =========================
  const handleDeleteCategory = async (id) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa danh mục này?");
    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      let response = await fetch(API_ENDPOINTS.categoryById(id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data = await response.json();

      if (!response.ok) {
        if (data.requiresAction) {
          const confirmUncategorize = window.confirm(
            `${data.message}\n\nBạn có muốn chuyển các công việc này về 'Chưa phân loại' để tiếp tục xóa không?`
          );
          if (!confirmUncategorize) return;

          response = await fetch(
            `${API_ENDPOINTS.categoryById(id)}?moveTo=uncategorized`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Không thể xóa danh mục");
          }
        } else {
          throw new Error(data.message || "Không thể xóa danh mục");
        }
      }

      await fetchCategories();
    } catch (error) {
      console.error("Lỗi khi xóa danh mục:", error);
      alert(error.message || "Không thể xóa danh mục.");
    }
  };

  // =========================
  // SỬA DANH MỤC
  // =========================
  const handleEditCategory = async (categoryId) => {
    if (editingCategoryName.trim() === "") {
      alert("Tên danh mục không được để trống!");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API_ENDPOINTS.categoryById(categoryId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingCategoryName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật danh mục");
      }

      await fetchCategories();

      setEditingCategoryId(null);
      setEditingCategoryName("");

      alert("Cập nhật danh mục thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật danh mục:", error);
      alert(error.message || "Không thể cập nhật danh mục.");
    }
  };

  // =========================
  // MỞ DANH MỤC
  // =========================
  const handleOpenCategory = (categoryId) => {
    if (editingCategoryId === categoryId) {
      return;
    }

    if (typeof setCategoryFilter === "function") {
      setCategoryFilter(String(categoryId));
    }

    if (typeof setCurrentPage === "function") {
      setCurrentPage("tasks");
    }
  };

  // =========================
  // GIAO DIỆN
  // =========================
  return (
    <section className="tasks-page page-enter">
      {/* HEADER */}
      <header className="header">
        <div>
          <h1>Danh mục</h1>
          <p>Quản lý và phân nhóm các danh mục công việc</p>
        </div>

        <button
          type="button"
          className="add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            <>
              <X size={15} strokeWidth={2} />
              Đóng
            </>
          ) : (
            <>
              <Plus size={15} strokeWidth={2} />
              Thêm danh mục
            </>
          )}
        </button>
      </header>

      {/* FORM THÊM */}
      {showForm && (
        <form className="task-form category-create-form" onSubmit={handleAddCategory}>
          <h2>Thêm danh mục mới</h2>

          <label>Tên danh mục</label>

          <input
            type="text"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Ví dụ: Dự án, Nghiên cứu, Marketing..."
            autoFocus
          />

          <button type="submit" className="save-button">
            <Save size={15} strokeWidth={1.85} />
            Lưu danh mục
          </button>
        </form>
      )}

      {/* DANH SÁCH DANH MỤC */}
      <section className="task-section">
        <div className="section-title">
          <div>
            <h2>Danh mục của tôi</h2>
            <p>
              Hiện có <strong style={{ fontVariantNumeric: "tabular-nums" }}>{categories.length}</strong> nhóm công việc
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty category-empty-state">
            <div className="category-empty-icon">
              <Folder size={22} strokeWidth={1.75} />
            </div>
            <h3>Chưa có danh mục nào</h3>
            <p>Tạo danh mục đầu tiên để phân loại công việc rõ ràng và dễ lọc hơn.</p>
          </div>
        ) : (
          <div className="category-list">
            {categories.map((category) => (
              <div
                className="category-card"
                key={category.id}
                onClick={() => handleOpenCategory(category.id)}
                title={
                  editingCategoryId === category.id
                    ? ""
                    : `Nhấn để xem danh sách công việc trong danh mục "${category.name}"`
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenCategory(category.id);
                  }
                }}
              >
                {/* ICON */}
                <div className="category-icon">
                  <Folder size={20} strokeWidth={1.75} />
                </div>

                {/* NỘI DUNG */}
                <div className="category-content">
                  {editingCategoryId === category.id ? (
                    <div
                      className="category-edit-inline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleEditCategory(category.id);
                          }

                          if (event.key === "Escape") {
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }
                        }}
                        autoFocus
                      />

                      <div className="category-edit-actions">
                        <button
                          type="button"
                          className="category-inline-save"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditCategory(category.id);
                          }}
                        >
                          <Check size={13} strokeWidth={2} />
                          Lưu
                        </button>

                        <button
                          type="button"
                          className="category-inline-cancel"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }}
                        >
                          <X size={13} strokeWidth={2} />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>{category.name}</h3>
                      <p style={{ fontVariantNumeric: "tabular-nums" }}>
                        {category.count || 0} công việc
                      </p>
                    </>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="category-card-actions">
                  {editingCategoryId !== category.id && (
                    <button
                      type="button"
                      className="category-action-btn"
                      title="Đổi tên danh mục"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="category-action-btn delete-button"
                    title="Xóa danh mục"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteCategory(category.id);
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Categories;
