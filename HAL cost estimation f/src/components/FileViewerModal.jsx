import React, { useState } from "react";

function FileViewerModal({ isOpen, onClose, fileUrl, fileName, fileType }) {
  if (!isOpen) return null;

  const isImage = fileType === 'image' || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
  const isPDF = fileType === 'pdf' || /\.pdf$/i.test(fileName);
  const is3DModel = fileType === '3d' || /\.(step|stp|iges|igs|stl|obj|ply)$/i.test(fileName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
          <h2 className="text-lg font-semibold truncate">{fileName}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-auto bg-white" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {isImage && (
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  document.getElementById('error-message').style.display = 'block';
                }}
              />
              <div id="error-message" className="hidden text-center py-8">
                <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-slate-600">Failed to load image</p>
                <button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="mt-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          {isPDF && (
            <div className="h-[70vh]">
              {/* Try iframe first */}
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full rounded-lg border border-slate-200"
                title={fileName}
                onLoad={() => {
                  // PDF loaded successfully
                  document.getElementById('pdf-error').style.display = 'none';
                  document.getElementById('pdf-embed-fallback').style.display = 'none';
                }}
                onError={() => {
                  // Try embed tag as fallback
                  document.querySelector('iframe').style.display = 'none';
                  document.getElementById('pdf-embed-fallback').style.display = 'block';
                }}
              />
              
              {/* Fallback embed tag */}
              <embed
                id="pdf-embed-fallback"
                src={fileUrl}
                type="application/pdf"
                className="hidden w-full h-full rounded-lg border border-slate-200"
                onError={() => {
                  document.getElementById('pdf-embed-fallback').style.display = 'none';
                  document.getElementById('pdf-error').style.display = 'block';
                }}
              />
              
              <div id="pdf-error" className="hidden text-center py-8">
                <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-600 mb-2">PDF preview not available</p>
                <p className="text-slate-500 text-sm mb-4">Your browser may be downloading the PDF instead of displaying it.</p>
                <div className="space-x-2">
                  <button
                    onClick={() => window.open(fileUrl, '_blank')}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    Open in New Tab
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = fileUrl;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {is3DModel && (
            <div className="text-center py-8">
              <svg className="mx-auto h-16 w-16 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">3D Model Viewer</h3>
              <p className="text-slate-600 mb-4">3D model preview is not available in the browser</p>
              <div className="space-y-2">
                <p className="text-sm text-slate-500">File: {fileName}</p>
                <button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
                >
                  Download 3D Model
                </button>
                <button
                  onClick={() => {
                    alert('To view this 3D model, download it and open it in a 3D modeling software like:\n\n• AutoCAD\n• SolidWorks\n• Fusion 360\n• Blender\n• 3D Viewer Online');
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  View Instructions
                </button>
              </div>
            </div>
          )}

          {!isImage && !isPDF && !is3DModel && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600 mb-2">Preview not available for this file type</p>
              <button
                onClick={() => window.open(fileUrl, '_blank')}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Download File
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
          <div className="text-sm text-slate-600">
            {isImage && "Image Viewer"}
            {isPDF && "PDF Viewer"}
            {is3DModel && "3D Model Info"}
            {!isImage && !isPDF && !is3DModel && "File Info"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200"
            >
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileViewerModal;
