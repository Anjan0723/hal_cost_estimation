import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getProject, getProjectParts, deleteProjectPart, addProjectPart, updatePart } from "../api/projects";
import AddPartModal from "../components/AddPartModal";
import FileViewerModal from "../components/FileViewerModal";
import api from "../api/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function PdfPreview({ url, alt, className }) {
  const [dataUrl, setDataUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        setFailed(false);
        setDataUrl("");

        if (!url) {
          setFailed(true);
          return;
        }

        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        if (!context) {
          throw new Error("Canvas context not available");
        }

        await page.render({ canvasContext: context, viewport }).promise;

        const imgData = canvas.toDataURL("image/png");
        if (!cancelled) setDataUrl(imgData);
      } catch (e) {
        if (!cancelled) setFailed(true);
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) return null;
  if (!dataUrl) {
    return <div className="text-xs text-slate-400">Loading preview...</div>;
  }

  return <img src={dataUrl} alt={alt} className={className} />;
}

function ProjectDetailPage({ onChange, projectId }) {
  const [projectData, setProjectData] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [fileViewer, setFileViewer] = useState({ isOpen: false, fileUrl: '', fileName: '', fileType: '' });
  const [activeCostPartId, setActiveCostPartId] = useState(null);
  
  // Cost Estimation State
  const [costForms, setCostForms] = useState({}); // Separate form state for each part
  const [machines, setMachines] = useState([]);
  const [operationTypes, setOperationTypes] = useState([]);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState("");
  const [costResults, setCostResults] = useState({}); // Store results by part ID

  const [drawingZoom, setDrawingZoom] = useState(1);
  const costModalPdfRef = useRef(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchParts();
      fetchCostEstimationData();
    }
  }, [projectId]);

  const fetchCostEstimationData = async () => {
    try {
      const [machinesRes, operationTypesRes] = await Promise.all([
        api.get("/machines/"),
        api.get("/operation-type/")
      ]);
      setMachines(Array.isArray(machinesRes.data) ? machinesRes.data : []);
      setOperationTypes(Array.isArray(operationTypesRes.data) ? operationTypesRes.data : []);
    } catch (err) {
      console.error("Error fetching cost estimation data:", err);
    }
  };

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const data = await getProject(projectId);
      setProjectData(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch project data");
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const partsData = await getProjectParts(projectId);
      setParts(partsData);
    } catch (err) {
      console.error("Error fetching parts:", err);
    }
  };

  const handleDeletePart = async (partId) => {
    if (window.confirm("Are you sure you want to delete this part?")) {
      try {
        await deleteProjectPart(partId);
        setParts(parts.filter(part => part.id !== partId));
        alert("Part deleted successfully!");
      } catch (err) {
        alert("Failed to delete part. Please try again.");
        console.error("Error deleting part:", err);
      }
    }
  };

  const handleAddPart = () => {
    setEditingPart(null);
    setIsAddPartModalOpen(true);
  };

  const handleEditPart = (part) => {
    setEditingPart(part);
    setIsAddPartModalOpen(true);
  };

  const handlePartAdded = (newPart) => {
    setParts([...parts, newPart]);
    fetchParts(); // Refresh to get latest data
  };

  const handlePartUpdated = (updatedPart) => {
    setParts(parts.map(part => part.id === updatedPart.id ? updatedPart : part));
    fetchParts(); // Refresh to get latest data
  };

  const handleModalClose = () => {
    setIsAddPartModalOpen(false);
    setEditingPart(null);
  };

  const handleViewFile = (filePath, fileName) => {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    const isLocalUploads = normalized.startsWith("uploads/") || normalized.startsWith("uploads");

    const encodedKey = normalized
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const fileUrl = isLocalUploads
      ? `http://127.0.0.1:8000/files/uploads/${normalized}?inline=true`
      : `http://127.0.0.1:8000/files/download/${encodedKey}?inline=true`;
    const extension = fileName.split('.').pop().toLowerCase();
    let fileType = 'unknown';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      fileType = 'image';
    } else if (extension === 'pdf') {
      fileType = 'pdf';
    } else if (['step', 'stp', 'iges', 'igs', 'stl', 'obj', 'ply'].includes(extension)) {
      fileType = '3d';
    }
    
    setFileViewer({
      isOpen: true,
      fileUrl: fileUrl,
      fileName,
      fileType
    });
  };

  const getInlineFileUrl = (filePath) => {
    const normalized = String(filePath || "").replace(/\\/g, "/");
    if (!normalized) return "";

    const isLocalUploads = normalized.startsWith("uploads/") || normalized.startsWith("uploads");
    const encodedKey = normalized
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return isLocalUploads
      ? `http://127.0.0.1:8000/files/uploads/${normalized}?inline=true`
      : `http://127.0.0.1:8000/files/download/${encodedKey}?inline=true`;
  };

  const isPdfPath = (filePath) => {
    const value = String(filePath || "").toLowerCase();
    return value.endsWith(".pdf");
  };

  const closeFileViewer = () => {
    setFileViewer({ isOpen: false, fileUrl: '', fileName: '', fileType: '' });
  };

  // Cost Estimation Functions
  const getCostForm = (partId) => {
    return costForms[partId] || {
      operation_type: "turning",
      diameter: "",
      length: "",
      breadth: "",
      height: "",
      material: "steel",
      machine_name: "",
      man_hours_per_unit: "",
      miscellaneous_amount: ""
    };
  };

  const handleCostFormChange = (partId, field, value) => {
    setCostForms(prev => ({
      ...prev,
      [partId]: {
        ...getCostForm(partId),
        [field]: value
      }
    }));
  };

  const handleCostSubmit = async (e, partId) => {
    e.preventDefault();
    setCostLoading(true);
    setCostError("");

    try {
      const form = getCostForm(partId);
      const opType = String(form.operation_type || "").toLowerCase();
      const length = Number(form.length);
      const diameter = Number(form.diameter);
      const breadth = Number(form.breadth);
      const height = Number(form.height);
      const manHours = Number(form.man_hours_per_unit);

      if (!opType || !Number.isFinite(length) || length <= 0 || !Number.isFinite(manHours) || manHours < 0) {
        setCostError("Please fill in all required fields with valid values");
        return;
      }

      if (opType === "turning" && (!Number.isFinite(diameter) || diameter <= 0)) {
        setCostError("Diameter must be a positive number for turning operation");
        return;
      }

      if (opType === "milling" && (!Number.isFinite(breadth) || breadth <= 0 || !Number.isFinite(height) || height <= 0)) {
        setCostError("Breadth and height must be positive numbers for milling operation");
        return;
      }

      const dimensions = { length };
      if (opType === "turning") dimensions.diameter = diameter;
      if (opType === "milling") {
        dimensions.breadth = breadth;
        dimensions.height = height;
      }

      const payload = {
        dimensions,
        material: String(form.material || ""),
        operation_type: opType,
        machine_name: String(form.machine_name || ""),
        man_hours_per_unit: manHours,
        miscellaneous_amount: Number(form.miscellaneous_amount || 0),
      };

      const res = await api.post("/cost-estimation/calculate", payload);
      
      // Store result for specific part
      setCostResults(prev => ({
        ...prev,
        [partId]: res.data
      }));
    } catch (err) {
      const serverMessage = err?.response?.data?.detail || err?.message || "Failed to calculate cost";
      setCostError(String(serverMessage));
    } finally {
      setCostLoading(false);
    }
  };

  const clearPartCostResult = (partId) => {
    setCostResults(prev => {
      const newResults = { ...prev };
      delete newResults[partId];
      return newResults;
    });
  };

  const openCostModal = (partId) => {
    setCostError("");
    setDrawingZoom(1);
    if (typeof onChange === "function") {
      onChange("part_cost_estimation", { projectId, partId });
      return;
    }
    setActiveCostPartId(partId);
  };

  const closeCostModal = () => {
    setActiveCostPartId(null);
  };

  const zoomInDrawing = () => setDrawingZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
  const zoomOutDrawing = () => setDrawingZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const resetDrawingZoom = () => setDrawingZoom(1);

  const formatValue = (key, value) => {
    if (value == null) return "-";
    if (typeof value === "number" && Number.isFinite(value) && /(cost|rate|profit|overheads|packing|outsourcing)/i.test(key)) {
      const hasDecimals = Math.abs(value - Math.trunc(value)) > Number.EPSILON;
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: hasDecimals ? 2 : 0,
      }).format(value);
    }
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString("en-IN");
    return JSON.stringify(value);
  };

  const getFilteredMachines = (partId) => {
    const normalize = (value) => {
      if (value == null) return "";
      return String(value).trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
    };

    const form = getCostForm(partId);
    const opType = normalize(form.operation_type);
    if (!opType) return machines;

    const selectedOp = operationTypes.find((ot) => normalize(ot?.operation_name) === opType);
    const selectedOpId = selectedOp?.id != null ? String(selectedOp.id) : "";

    return machines.filter((m) => {
      const opId = m?.op_id ?? m?.operation_type_id ?? m?.operation_type?.id ?? m?.operation_types?.id;
      return opId == null ? "" : String(opId) === selectedOpId;
    });
  };

  const activeCostPart = activeCostPartId != null ? parts.find((p) => p.id === activeCostPartId) : null;

  const activeCostResult = useMemo(() => {
    if (activeCostPartId == null) return null;
    return costResults[activeCostPartId] || null;
  }, [activeCostPartId, costResults]);

  const handleDownloadCostPdf = useCallback(async () => {
    if (!activeCostPart || !costModalPdfRef.current) return;

    const element = costModalPdfRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 5) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeProject = String(projectData?.project_name || "Project").replace(/[^a-z0-9-_ ]/gi, "").trim() || "Project";
    const safePart = String(activeCostPart.part_number || "Part").replace(/[^a-z0-9-_ ]/gi, "").trim() || "Part";
    pdf.save(`${safeProject}-${safePart}-Cost-Estimation.pdf`);
  }, [activeCostPart, projectData?.project_name]);

  const tabs = [
    { key: "parts", label: "Parts" },
    { key: "cost_estimation", label: "Cost Estimation" },
    { key: "total_cost", label: "Total Cost" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading project data...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : (
        <>
          <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-wide">{projectData?.project_name || "Untitled Project"}</h1>
                <p className="text-xs md:text-sm text-slate-300 mt-1">
                  PO/Ref: {projectData?.po_reference_number || "N/A"} | Customer: {projectData?.customer_name || "N/A"} | Date: {projectData?.project_date || "N/A"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onChange("edit_project", { projectId: projectId })}
                  className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                >
                  Edit Project
                </button>
                <button
                  type="button"
                  onClick={() => onChange("projects")}
                  className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  ← Back to Projects
                </button>
              </div>
            </div>
          </header>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors ${
                  activeTab === tab.key
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Requirement Documents</h3>
                {projectData?.documents?.filter(doc => doc.document_type === 'requirement').length > 0 ? (
                  <ul className="space-y-2">
                    {projectData.documents.filter(doc => doc.document_type === 'requirement').map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <span className="text-xs md:text-sm text-slate-700 font-medium">{doc.filename}</span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                          onClick={() => handleViewFile(doc.file_path, doc.filename)}
                        >
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs md:text-sm text-slate-400">No requirement documents uploaded.</p>
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Other Documents</h3>
                {projectData?.documents?.filter(doc => doc.document_type === 'other').length > 0 ? (
                  <ul className="space-y-2">
                    {projectData.documents.filter(doc => doc.document_type === 'other').map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <span className="text-xs md:text-sm text-slate-700 font-medium">{doc.filename}</span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                          onClick={() => handleViewFile(doc.file_path, doc.filename)}
                        >
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs md:text-sm text-slate-400">No other documents uploaded.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "parts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Project Parts</h3>
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm"
                >
                  Add Part
                </button>
              </div>
              {parts.length > 0 ? (
                parts.map((part) => (
                  <div key={part.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-900">Part {part.part_number}</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditPart(part)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                          title="Edit Part"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePart(part.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                          title="Delete Part"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2 md:grid-cols-2 text-xs md:text-sm mb-4">
                      <div>
                        <span className="font-medium text-slate-600">Part Number:</span>
                        <span className="ml-2 text-slate-900">{part.part_number || "—"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600">Part Name:</span>
                        <span className="ml-2 text-slate-900">{part.part_name || "—"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Part Files</h5>
                      
                      {part.model_3d_path && (
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            <div>
                              <span className="text-xs md:text-sm text-slate-700 font-medium">3D Model</span>
                              <div className="text-[11px] text-slate-400">
                                {part.model_3d_path.split('\\').pop()}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                            onClick={() => handleViewFile(part.model_3d_path, part.model_3d_path.split('\\').pop())}
                          >
                            View
                          </button>
                        </div>
                      )}
                      
                      {part.drawing_2d_path && (
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <span className="text-xs md:text-sm text-slate-700 font-medium">2D Drawing</span>
                              <div className="text-[11px] text-slate-400">
                                {part.drawing_2d_path.split('\\').pop()}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                            onClick={() => handleViewFile(part.drawing_2d_path, part.drawing_2d_path.split('\\').pop())}
                          >
                            View
                          </button>
                        </div>
                      )}
                      
                      {!part.model_3d_path && !part.drawing_2d_path && (
                        <p className="text-xs text-slate-400 italic">No files uploaded for this part.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs md:text-sm text-slate-400 mb-4">No parts added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm"
                  >
                    Add Your First Part
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "cost_estimation" && (
            <div className="space-y-6">
              {/* Combined Drawings and Cost Estimation Table */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-base font-semibold text-slate-800">Project Drawings & Cost Estimation</h2>
                  <p className="text-xs text-slate-500 mt-1">View all project drawings and calculate manufacturing costs for each part</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Drawings Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Project Drawings</h3>
                    
                    {/* 3D Models */}
                    <div className="mb-6">
                      <h4 className="text-xs font-medium text-slate-600 mb-2">3D Models</h4>
                      {parts.filter(part => part.model_3d_path).length > 0 ? (
                        <div className="space-y-2">
                          {parts.filter(part => part.model_3d_path).map(part => (
                            <div key={part.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                                <div>
                                  <span className="text-xs md:text-sm text-slate-700 font-medium">{part.part_number} - 3D Model</span>
                                  <div className="text-[11px] text-slate-400">
                                    {part.model_3d_path.split('\\').pop()}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                                onClick={() => handleViewFile(part.model_3d_path, part.model_3d_path.split('\\').pop())}
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No 3D models uploaded.</p>
                      )}
                    </div>

                    {/* 2D Drawings */}
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 mb-2">2D Drawings</h4>
                      {parts.filter((part) => part.drawing_2d_path).length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {parts
                            .filter((part) => part.drawing_2d_path)
                            .map((part) => {
                              const fileName = String(part.drawing_2d_path).split("\\").pop();
                              const imgUrl = getInlineFileUrl(part.drawing_2d_path);
                              return (
                                <div key={part.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                  <div className="px-3 py-2 border-b border-slate-200">
                                    <div className="text-xs font-semibold text-slate-700">{part.part_number} - 2D Drawing</div>
                                    <div className="text-[11px] text-slate-400 truncate">{fileName}</div>
                                  </div>
                                  <div className="p-3 flex justify-center bg-white">
                                    {isPdfPath(part.drawing_2d_path) ? (
                                      <PdfPreview
                                        url={imgUrl}
                                        alt={`${part.part_number} - 2D Drawing`}
                                        className="max-h-80 w-auto object-contain rounded-md border border-slate-200"
                                      />
                                    ) : (
                                      <img
                                        src={imgUrl}
                                        alt={`${part.part_number} - 2D Drawing`}
                                        className="max-h-80 w-auto object-contain rounded-md border border-slate-200"
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No 2D drawings uploaded.</p>
                      )}
                    </div>
                  </div>

                  {/* Individual Part Cost Calculations */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Part Cost Estimations</h3>
                    
                    {parts.length === 0 ? (
                      <p className="text-xs text-slate-400">No parts available for cost estimation.</p>
                    ) : (
                      <div className="space-y-6">
                        {parts.map(part => (
                          <div key={part.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-800">{part.part_number}</h4>
                                  <p className="text-xs text-slate-600">{part.part_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {costResults[part.id] && (
                                    <div className="text-right">
                                      <p className="text-xs text-slate-600">Unit Cost (with Misc)</p>
                                      <p className="text-lg font-bold text-sky-600">
                                        {formatValue("total_cost", costResults[part.id].cost_breakdown?.total_unit_cost_with_misc)}
                                      </p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openCostModal(part.id)}
                                    className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm"
                                  >
                                    Calculate Cost
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {costError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm">{costError}</p>
                    </div>
                  )}
                </div>
              </section>

              {activeCostPart && (
                <div className="fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-slate-900/60" onClick={closeCostModal} />
                  <div className="relative h-full w-full bg-white shadow-2xl">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-slate-100">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold">Part Cost Estimation – {activeCostPart.part_number}</div>
                          <div className="text-xs text-slate-300 mt-0.5">{activeCostPart.part_name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {activeCostResult && (
                            <div className="text-right">
                              <div className="text-[11px] text-slate-300">Final Part Cost</div>
                              <div className="text-base font-bold text-emerald-300">
                                {formatValue("total_cost", activeCostResult.cost_breakdown?.total_unit_cost_with_misc)}
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleDownloadCostPdf}
                            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100"
                          >
                            Download PDF
                          </button>
                          <button
                            type="button"
                            onClick={closeCostModal}
                            className="px-4 py-2 rounded-lg text-xs md:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>

                    <div ref={costModalPdfRef} className="h-[calc(100vh-73px)]">
                      <div className="flex h-full overflow-hidden">
                        <aside className="w-80 xl:w-[420px] border-r border-slate-200 bg-slate-50">
                          <div className="p-4 space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-xs text-slate-500">Project</div>
                              <div className="text-sm font-semibold text-slate-800">{projectData?.project_name || "Untitled Project"}</div>
                              <div className="mt-2 text-xs text-slate-600">
                                PO/Ref: {projectData?.po_reference_number || "N/A"}
                              </div>
                              <div className="text-xs text-slate-600">Customer: {projectData?.customer_name || "N/A"}</div>
                              <div className="text-xs text-slate-600">Date: {projectData?.project_date || "N/A"}</div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-xs text-slate-500">Part</div>
                              <div className="text-sm font-semibold text-slate-800">{activeCostPart.part_number}</div>
                              <div className="text-xs text-slate-600 mt-1">{activeCostPart.part_name}</div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold text-slate-800">2D Drawing</div>
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={zoomOutDrawing} className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100">-</button>
                                    <button type="button" onClick={resetDrawingZoom} className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100">Reset</button>
                                    <button type="button" onClick={zoomInDrawing} className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100">+</button>
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">Zoom: {Math.round(drawingZoom * 100)}%</div>
                              </div>
                              <div className="p-3 bg-white">
                                {!activeCostPart.drawing_2d_path ? (
                                  <div className="text-xs text-slate-400">No drawing uploaded.</div>
                                ) : (
                                  <div className="h-[42vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50">
                                    <div
                                      className="w-full h-full flex items-center justify-center p-4"
                                      style={{ transform: `scale(${drawingZoom})`, transformOrigin: "top left" }}
                                    >
                                      {isPdfPath(activeCostPart.drawing_2d_path) ? (
                                        <PdfPreview
                                          url={getInlineFileUrl(activeCostPart.drawing_2d_path)}
                                          alt={`${activeCostPart.part_number} - 2D Drawing`}
                                          className="max-w-none w-auto h-auto object-contain"
                                        />
                                      ) : (
                                        <img
                                          src={getInlineFileUrl(activeCostPart.drawing_2d_path)}
                                          alt={`${activeCostPart.part_number} - 2D Drawing`}
                                          className="max-w-none w-auto h-auto object-contain"
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </aside>

                        <div className="flex-1 overflow-y-auto">
                          <div className="p-6 space-y-6">
                            <div className="grid gap-6 lg:grid-cols-3">
                              <div className="lg:col-span-2">
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <div className="text-sm font-semibold text-slate-800">Machining Inputs</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Fill the values and calculate</div>
                                  </div>
                                  <div className="p-4">
                                    <form onSubmit={(e) => handleCostSubmit(e, activeCostPartId)} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Operation Type</label>
                                    <select
                                      value={getCostForm(activeCostPartId).operation_type}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "operation_type", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                    >
                                      <option value="turning">Turning</option>
                                      <option value="milling">Milling</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Material</label>
                                    <select
                                      value={getCostForm(activeCostPartId).material}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "material", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                    >
                                      <option value="steel">Steel</option>
                                      <option value="aluminium">Aluminium</option>
                                      <option value="titanium">Titanium</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Machine</label>
                                    <select
                                      value={getCostForm(activeCostPartId).machine_name}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "machine_name", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                    >
                                      <option value="">Select Machine</option>
                                      {getFilteredMachines(activeCostPartId).map((machine) => (
                                        <option key={machine.id} value={machine.name}>
                                          {machine.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Man Hours / Unit</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="e.g., 0.5"
                                      value={getCostForm(activeCostPartId).man_hours_per_unit}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "man_hours_per_unit", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                      required
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Miscellaneous Amount</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="Additional costs"
                                      value={getCostForm(activeCostPartId).miscellaneous_amount}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "miscellaneous_amount", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-slate-700">Length (mm)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Enter length"
                                      value={getCostForm(activeCostPartId).length}
                                      onChange={(e) => handleCostFormChange(activeCostPartId, "length", e.target.value)}
                                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                      required
                                    />
                                  </div>

                                  {getCostForm(activeCostPartId).operation_type === "turning" && (
                                    <div className="flex flex-col gap-1">
                                      <label className="text-sm font-medium text-slate-700">Diameter (mm)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter diameter"
                                        value={getCostForm(activeCostPartId).diameter}
                                        onChange={(e) => handleCostFormChange(activeCostPartId, "diameter", e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                        required
                                      />
                                    </div>
                                  )}

                                  {getCostForm(activeCostPartId).operation_type === "milling" && (
                                    <>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-slate-700">Breadth (mm)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="Enter breadth"
                                          value={getCostForm(activeCostPartId).breadth}
                                          onChange={(e) => handleCostFormChange(activeCostPartId, "breadth", e.target.value)}
                                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                          required
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-slate-700">Height (mm)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="Enter height"
                                          value={getCostForm(activeCostPartId).height}
                                          onChange={(e) => handleCostFormChange(activeCostPartId, "height", e.target.value)}
                                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                                          required
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={costLoading}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {costLoading ? "Calculating..." : "Calculate Cost"}
                                  </button>
                                  {activeCostResult && (
                                    <button
                                      type="button"
                                      onClick={() => clearPartCostResult(activeCostPartId)}
                                      className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                    </form>
                                  </div>
                                </div>
                              </div>

                              <div className="lg:col-span-1">
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <div className="text-sm font-semibold text-slate-800">Part Cost Summary</div>
                                    <div className="text-xs text-slate-500 mt-0.5">Comprehensive cost breakdown</div>
                                  </div>
                                  <div className="p-4">
                                    {!activeCostResult ? (
                                      <div className="text-sm text-slate-500">Calculate cost to see the breakdown.</div>
                                    ) : (
                                      <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-600">Basic Cost</span>
                                          <span className="font-semibold text-slate-900">{formatValue("basic_cost", activeCostResult.cost_breakdown?.basic_cost_per_unit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-600">Overheads</span>
                                          <span className="font-semibold text-slate-900">{formatValue("overheads", activeCostResult.cost_breakdown?.overheads_per_unit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-600">Profit</span>
                                          <span className="font-semibold text-slate-900">{formatValue("profit", activeCostResult.cost_breakdown?.profit_per_unit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-600">Packing & Forwarding</span>
                                          <span className="font-semibold text-slate-900">{formatValue("packing", activeCostResult.cost_breakdown?.packing_forwarding_per_unit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-600">Miscellaneous</span>
                                          <span className="font-semibold text-slate-900">{formatValue("miscellaneous_amount", activeCostResult.cost_breakdown?.miscellaneous_amount)}</span>
                                        </div>
                                        <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between">
                                          <span className="text-slate-700 font-semibold">Final Part Cost</span>
                                          <span className="font-bold text-emerald-700">{formatValue("total_cost", activeCostResult.cost_breakdown?.total_unit_cost_with_misc)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {activeCostResult && (
                        <div className="space-y-6">
                          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl p-6 border border-sky-200">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div>
                                <h5 className="text-base font-semibold text-slate-700 mb-3">Operation Details</h5>
                                <div className="space-y-2 text-sm text-slate-600">
                                  <p><span className="font-medium">Operation:</span> {activeCostResult.operation_type}</p>
                                  <p><span className="font-medium">Machine:</span> {activeCostResult.selected_machine?.name}</p>
                                  <p><span className="font-medium">Material:</span> {activeCostResult.material}</p>
                                  <p><span className="font-medium">Duty Category:</span> {activeCostResult.duty_category}</p>
                                  <p><span className="font-medium">Shape:</span> {activeCostResult.shape}</p>
                                  {activeCostResult.volume && (
                                    <p><span className="font-medium">Volume:</span> {activeCostResult.volume.toFixed(2)} mm³</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-base font-semibold text-slate-700 mb-3">Detailed Cost Breakdown</h5>
                                <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
                                  <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-100">Component</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-100">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="bg-white">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Man Hours per Unit</td>
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700">{activeCostResult.cost_breakdown?.man_hours_per_unit}</td>
                                      </tr>
                                      <tr className="bg-slate-50/40">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Machine Hour Rate</td>
                                        <td className="px-4 py-3 border-b border-slate-100">{formatValue("machine_hour_rate", activeCostResult.cost_breakdown?.machine_hour_rate)}</td>
                                      </tr>
                                      <tr className="bg-white">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Wage Rate</td>
                                        <td className="px-4 py-3 border-b border-slate-100">{formatValue("wage_rate", activeCostResult.cost_breakdown?.wage_rate)}</td>
                                      </tr>
                                      <tr className="bg-slate-50/40">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Basic Cost</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("basic_cost", activeCostResult.cost_breakdown?.basic_cost_per_unit)}</td>
                                      </tr>
                                      <tr className="bg-white">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Overheads</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("overheads", activeCostResult.cost_breakdown?.overheads_per_unit)}</td>
                                      </tr>
                                      <tr className="bg-slate-50/40">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Profit (10%)</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("profit", activeCostResult.cost_breakdown?.profit_per_unit)}</td>
                                      </tr>
                                      <tr className="bg-white">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Packing & Forwarding (2%)</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("packing", activeCostResult.cost_breakdown?.packing_forwarding_per_unit)}</td>
                                      </tr>
                                      <tr className="bg-slate-50/40">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Miscellaneous Amount</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("miscellaneous_amount", activeCostResult.cost_breakdown?.miscellaneous_amount)}</td>
                                      </tr>
                                      <tr className="bg-white">
                                        <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Unit Cost</td>
                                        <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("total_cost", activeCostResult.cost_breakdown?.unit_cost)}</td>
                                      </tr>
                                      <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold">
                                        <td className="px-4 py-4 border-b border-slate-100 text-slate-900">Total Unit Cost with Misc</td>
                                        <td className="px-4 py-4 border-b border-slate-100 text-emerald-700 text-lg">{formatValue("total_cost", activeCostResult.cost_breakdown?.total_unit_cost_with_misc)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "total_cost" && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <h2 className="text-base font-semibold text-slate-800">Total Cost</h2>
                  <p className="text-xs text-slate-500 mt-1">Project-level totals based on calculated part estimations</p>
                </div>

                <div className="p-6">
                  {Object.keys(costResults).length === 0 ? (
                    <p className="text-sm text-slate-500">Calculate at least one part cost to see the total project cost.</p>
                  ) : (
                    <div>
                      {(() => {
                        const totalCosts = {
                          basic_cost: 0,
                          overheads: 0,
                          profit: 0,
                          packing_forwarding: 0,
                          unit_cost: 0,
                          total_unit_cost_with_misc: 0,
                          miscellaneous_amount: 0,
                          machine_hour_rate: 0,
                          wage_rate: 0,
                          outsourcing_mhr: 0,
                          man_hours_total: 0
                        };

                        Object.values(costResults).forEach(result => {
                          const breakdown = result.cost_breakdown;
                          totalCosts.basic_cost += breakdown?.basic_cost_per_unit || 0;
                          totalCosts.overheads += breakdown?.overheads_per_unit || 0;
                          totalCosts.profit += breakdown?.profit_per_unit || 0;
                          totalCosts.packing_forwarding += breakdown?.packing_forwarding_per_unit || 0;
                          totalCosts.unit_cost += breakdown?.unit_cost || 0;
                          totalCosts.total_unit_cost_with_misc += breakdown?.total_unit_cost_with_misc || 0;
                          totalCosts.miscellaneous_amount += breakdown?.miscellaneous_amount || 0;
                          totalCosts.machine_hour_rate += breakdown?.machine_hour_rate || 0;
                          totalCosts.wage_rate += breakdown?.wage_rate || 0;
                          totalCosts.outsourcing_mhr += breakdown?.outsourcing_mhr || 0;
                          totalCosts.man_hours_total += breakdown?.man_hours_per_unit || 0;
                        });

                        return (
                          <div className="space-y-6">
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                              <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                  <h5 className="text-base font-semibold text-slate-700 mb-3">Project Summary</h5>
                                  <div className="space-y-2 text-sm text-slate-600">
                                    <p><span className="font-medium">Total Parts:</span> {Object.keys(costResults).length}</p>
                                    <p><span className="font-medium">Total Man Hours:</span> {totalCosts.man_hours_total.toFixed(2)}</p>
                                    <p><span className="font-medium">Average Machine Hour Rate:</span> {formatValue("machine_hour_rate", totalCosts.machine_hour_rate / Object.keys(costResults).length)}</p>
                                    <p><span className="font-medium">Average Wage Rate:</span> {formatValue("wage_rate", totalCosts.wage_rate / Object.keys(costResults).length)}</p>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="text-base font-semibold text-slate-700 mb-3">Total Project Cost</h5>
                                  <div className="space-y-2 text-sm text-slate-600">
                                    <p><span className="font-medium">Total Basic Cost:</span> {formatValue("basic_cost", totalCosts.basic_cost)}</p>
                                    <p><span className="font-medium">Total Overheads:</span> {formatValue("overheads", totalCosts.overheads)}</p>
                                    <p><span className="font-medium">Total Profit:</span> {formatValue("profit", totalCosts.profit)}</p>
                                    <p><span className="font-medium">Total Packing & Forwarding:</span> {formatValue("packing", totalCosts.packing_forwarding)}</p>
                                    <p><span className="font-medium">Total Miscellaneous Amount:</span> {formatValue("miscellaneous_amount", totalCosts.miscellaneous_amount)}</p>
                                    <p className="pt-3 border-t border-slate-300"><span className="font-semibold text-xl text-emerald-600">Total Project Cost:</span> {formatValue("total_cost", totalCosts.unit_cost)}</p>
                                    <p className="font-semibold text-sky-600"><span className="text-slate-700">Total with Miscellaneous:</span> {formatValue("total_cost", totalCosts.total_unit_cost_with_misc)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-base font-semibold text-slate-800 mb-4">Total Cost Breakdown</h5>
                              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-100">Cost Component</th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-100">Total Value</th>
                                      <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-100">Average per Part</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="bg-white">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Man Hours</td>
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700">{totalCosts.man_hours_total.toFixed(2)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700">{(totalCosts.man_hours_total / Object.keys(costResults).length).toFixed(2)}</td>
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Average Machine Hour Rate</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("machine_hour_rate", totalCosts.machine_hour_rate / Object.keys(costResults).length)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700">per hour</td>
                                    </tr>
                                    <tr className="bg-white">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Average Wage Rate</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("wage_rate", totalCosts.wage_rate / Object.keys(costResults).length)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700">per hour</td>
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Basic Cost</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("basic_cost", totalCosts.basic_cost)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("basic_cost", totalCosts.basic_cost / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-white">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Overheads</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("overheads", totalCosts.overheads)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("overheads", totalCosts.overheads / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Profit</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("profit", totalCosts.profit)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("profit", totalCosts.profit / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-white">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Packing & Forwarding</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("packing", totalCosts.packing_forwarding)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("packing", totalCosts.packing_forwarding / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-slate-50/40">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Miscellaneous Amount</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("miscellaneous_amount", totalCosts.miscellaneous_amount)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("miscellaneous_amount", totalCosts.miscellaneous_amount / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-white">
                                      <td className="px-4 py-3 border-b border-slate-100 text-slate-700 font-medium">Total Project Cost</td>
                                      <td className="px-4 py-3 border-b border-slate-100 font-semibold">{formatValue("total_cost", totalCosts.unit_cost)}</td>
                                      <td className="px-4 py-3 border-b border-slate-100">{formatValue("total_cost", totalCosts.unit_cost / Object.keys(costResults).length)}</td>
                                    </tr>
                                    <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 font-bold">
                                      <td className="px-4 py-4 border-b border-slate-100 text-slate-900">Total Project Cost with Misc</td>
                                      <td className="px-4 py-4 border-b border-slate-100 text-emerald-600 text-xl">{formatValue("total_cost", totalCosts.total_unit_cost_with_misc)}</td>
                                      <td className="px-4 py-4 border-b border-slate-100">{formatValue("total_cost", totalCosts.total_unit_cost_with_misc / Object.keys(costResults).length)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-base font-semibold text-slate-800 mb-4">Individual Parts Cost Summary</h5>
                              <div className="space-y-3">
                                {Object.entries(costResults).map(([partId, result]) => {
                                  const part = parts.find(p => p.id === parseInt(partId));
                                  return (
                                    <div key={partId} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h6 className="text-sm font-semibold text-slate-700">{part?.part_number || 'Unknown Part'}</h6>
                                          <p className="text-xs text-slate-600">{part?.part_name || 'No name'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-slate-600">Unit Cost (with Misc)</p>
                                          <p className="text-lg font-bold text-sky-600">
                                            {formatValue("total_cost", result.cost_breakdown?.total_unit_cost_with_misc)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
        </>
      )}
      
      <AddPartModal
        isOpen={isAddPartModalOpen}
        onClose={handleModalClose}
        projectId={projectId}
        partToEdit={editingPart}
        onPartAdded={handlePartAdded}
        onPartUpdated={handlePartUpdated}
      />
      
      <FileViewerModal
        isOpen={fileViewer.isOpen}
        onClose={closeFileViewer}
        fileUrl={fileViewer.fileUrl}
        fileName={fileViewer.fileName}
        fileType={fileViewer.fileType}
      />
    </div>
  );
}

export default ProjectDetailPage;
