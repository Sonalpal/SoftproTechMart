import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Product = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const handlefeatch = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/product");
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
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await axios.delete(`http://localhost:5000/api/product/${id}`);
      alert(res.data.msg);
      setData((prev) => prev.filter((p) => p._id !== id));
    } catch {
      alert("Sorry, try again later.");
    } finally {
      setDeletingId(null);
    }
  };

  const getImage = (img) => {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    const filename = img.replace(/\\/g, "/").split("/").pop();
    return `http://localhost:5000/api/product/${filename}`;
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
        <p>Loading products…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">
            Product <span>Catalog</span>
          </h1>
          <p className="dash-page-subtitle">
            Manage everything customers can browse and buy
          </p>
        </div>
        <Link
          to="/admin/dashboard/addproduct"
          className="dash-btn-primary"
          style={{ textDecoration: "none" }}
        >
          ➕ Add Product
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
            No products yet — add your first one to get started.
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>S.N.</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => {
                  const isDeleting = deletingId === item._id;
                  const imgUrl = getImage(item.images);
                  const inStock = Number(item.stock) > 0;

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
                                alt={item.name}
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
                              "📦"
                            )}
                          </div>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        {item.category?.category || "Uncategorized"}
                      </td>
                      <td
                        style={{
                          fontWeight: 600,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        ₹{Number(item.actualPrice).toLocaleString("en-IN")}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {item.discount > 0 ? `${item.discount}%` : "—"}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 20,
                            letterSpacing: ".05em",
                            textTransform: "uppercase",
                            background: inStock
                              ? "rgba(40,167,69,.12)"
                              : "rgba(220,53,69,.12)",
                            color: inStock ? "#28a745" : "#dc3545",
                            border: `1px solid ${inStock ? "rgba(40,167,69,.25)" : "rgba(220,53,69,.25)"}`,
                          }}
                        >
                          {item.stock} units
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link
                            to={`/admin/dashboard/addproduct/${item._id}`}
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
                            onClick={() => handleDelete(item._id, item.name)}
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

export default Product;
