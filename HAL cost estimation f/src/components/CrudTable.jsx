import React, { useEffect, useState } from "react";
import api from "../api/client";

function CrudTable({
  title,
  resourcePath, // e.g. "/operation-type/"
  columns, // [{ key: "operation_name", label: "Operation Name" }, ...]
  initialFormState,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(resourcePath);
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcePath]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePatch = (patch) => {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      if (editingId != null) {
        await api.put(`${resourcePath}${editingId}`, form);
      } else {
        await api.post(resourcePath, form);
      }
      resetForm();
      fetchItems();
    } catch (err) {
      console.error(err);
      setError("Failed to save data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    const next = { ...initialFormState };
    Object.keys(next).forEach((k) => {
      next[k] = item[k] ?? "";
    });
    setForm(next);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");
      await api.delete(`${resourcePath}${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      setError("Failed to delete data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h2 className="text-sm md:text-base font-semibold text-slate-900">{title}</h2>
        {loading && (
          <span className="text-xs text-slate-500 animate-pulse">Loading...</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 md:gap-4 md:grid-cols-[minmax(0,3fr)_auto] items-end"
      >
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-700">
                {col.label}
              </label>
              {col.renderInput ? (
                col.renderInput({
                  value: form[col.key] ?? "",
                  onChange: (value) => {
                    if (value && typeof value === "object" && !Array.isArray(value)) {
                      handlePatch(value);
                      return;
                    }
                    handleChange(col.key, value);
                  },
                  form,
                })
              ) : (
                <input
                  type="text"
                  value={form[col.key] ?? ""}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  placeholder={col.placeholder || col.label}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          {editingId != null && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 rounded-md border border-slate-300 text-xs md:text-sm text-slate-700 bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 rounded-md text-xs md:text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {editingId != null ? "Update" : "Add"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold text-slate-700 border-b border-slate-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-4 text-center text-slate-500 text-xs"
                >
                  No data available
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="odd:bg-white even:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 border-b border-slate-200 text-slate-700"
                  >
                    {(() => {
                      const rawValue = col.getValue
                        ? col.getValue(item)
                        : item[col.key];
                      return rawValue != null ? String(rawValue) : "-";
                    })()}
                  </td>
                ))}
                <td className="px-3 py-2 border-b border-slate-200 text-right space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex items-center px-2 py-1 rounded-md border border-slate-300 text-[11px] text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center px-2 py-1 rounded-md border border-red-300 text-[11px] text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CrudTable;
