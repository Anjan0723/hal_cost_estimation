import React, { useState, useEffect } from "react";
import { updatePart, addProjectPart } from '../api/projects';

function AddPartModal({ isOpen, onClose, projectId, partToEdit, onPartAdded, onPartUpdated }) {
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [model3d, setModel3d] = useState(null);
  const [drawing2d, setDrawing2d] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (partToEdit) {
      setPartNumber(partToEdit.part_number || "");
      setPartName(partToEdit.part_name || "");
      setModel3d(null);
      setDrawing2d(null);
    } else {
      // Reset form for new part
      setPartNumber("");
      setPartName("");
      setModel3d(null);
      setDrawing2d(null);
    }
    setError(null);
  }, [partToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('part_number', partNumber);
      formData.append('part_name', partName);
      
      if (model3d) {
        formData.append('model_3d', model3d);
      }
      
      if (drawing2d) {
        formData.append('drawing_2d', drawing2d);
      }

      let result;
      if (partToEdit) {
        // Update existing part
        result = await updatePart(partToEdit.id, formData);
        onPartUpdated && onPartUpdated(result);
      } else {
        // Add new part
        result = await addProjectPart(projectId, formData);
        onPartAdded && onPartAdded(result);
      }

      onClose();
    } catch (err) {
      setError(partToEdit ? "Failed to update part. Please try again." : "Failed to add part. Please try again.");
      console.error("Error saving part:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (setter) => (e) => {
    setter(e.target.files[0]);
  };

  const removeFile = (setter) => {
    setter(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {partToEdit ? "Edit Part" : "Add New Part"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {partToEdit ? "Update part information and files" : "Enter part details and upload files"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Part Number *</label>
              <input
                type="text"
                placeholder="e.g., PART-001"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Part Name *</label>
              <input
                type="text"
                placeholder="e.g., Main Assembly"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">3D Model File</label>
              <input
                type="file"
                onChange={handleFileChange(setModel3d)}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                accept=".step,.stp,.iges,.igs,.stl,.obj,.ply"
              />
              {model3d && (
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-700 truncate">{model3d.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(setModel3d)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
              {!model3d && partToEdit?.model_3d_path && (
                <p className="text-xs text-slate-400">Current file: {partToEdit.model_3d_path.split('\\').pop()}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">2D Drawing File</label>
              <input
                type="file"
                onChange={handleFileChange(setDrawing2d)}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
              />
              {drawing2d && (
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-700 truncate">{drawing2d.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(setDrawing2d)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
              {!drawing2d && partToEdit?.drawing_2d_path && (
                <p className="text-xs text-slate-400">Current file: {partToEdit.drawing_2d_path.split('\\').pop()}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (partToEdit ? "Updating..." : "Adding...") : (partToEdit ? "Update Part" : "Add Part")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPartModal;
