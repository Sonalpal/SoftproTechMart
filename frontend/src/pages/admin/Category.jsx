import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Category = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const handlefeatch = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/category");
      setData(res.data.data || []);
    } catch (er) {
      console.error(er);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handlefeatch();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`))
      return;
    setDeletingId(id);
    try {
      const res = await axios.delete(
        `http://localhost:5000/api/category/${id}`,
      );
      alert(res.data.msg);
      setData((prev) => prev.filter((c) => c._id !== id));
    } catch {
      alert("Sorry, try again later.");
    } finally {
      setDeletingId(null);
    }
  };

  const getImage = (picture) => {
    if (!picture) return null;
    if (picture.startsWith("http")) return picture;
    const filename = picture.replace(/\\/g, "/").split("/").pop();
    return `http://localhost:5000/api/category/${filename}`;
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "5rem 0",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
        <p>Loading categories…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">
            Product <span>Categories</span>
          </h1>
          <p className="dash-page-subtitle">
            Organize your catalogue into browsable categories
          </p>
        </div>
        <Link
          to="/admin/dashboard/add-category"
          className="dash-btn-primary"
          style={{ textDecoration: "none" }}
        >
          ➕ Add Category
        </Link>
      </div>

      <div className="dash-card">
        {data.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3.5rem",
              color: "var(--text-muted)",
            }}
          >
            No categories yet — add your first one to get started.
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => {
                  const isDeleting = deletingId === item._id;
                  const imgUrl = getImage(item.picture);

                  return (
                    <tr
                      key={item._id}
                      style={{
                        opacity: isDeleting ? 0.5 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <td>{i + 1}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              flexShrink: 0,
                              background: "var(--dash-table-head)",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                            }}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.category}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              "🏷️"
                            )}
                          </div>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          maxWidth: 420,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.description}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link
                            to={`/admin/dashboard/add-category/${item._id}`}
                            className="dash-btn-outline"
                            style={{
                              textDecoration: "none",
                              padding: "0.4rem 0.8rem",
                              fontSize: "0.75rem",
                              borderRadius: 8,
                            }}
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() =>
                              handleDelete(item._id, item.category)
                            }
                            disabled={isDeleting}
                            className="dash-btn-danger"
                            style={{
                              padding: "0.4rem 0.8rem",
                              fontSize: "0.75rem",
                              borderRadius: 8,
                              cursor: isDeleting ? "not-allowed" : "pointer",
                            }}
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Category;
