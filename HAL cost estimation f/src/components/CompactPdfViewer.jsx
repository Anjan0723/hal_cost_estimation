import React from "react";

function CompactPdfViewer({ fileUrl, fileName }) {
  if (!fileUrl) return null;

  return (
    <div className="bg-white rounded-lg shadow-xl w-full overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-800">{fileName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(fileUrl, '_blank')}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            title="Open in new tab"
          >
            <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full PDF Content - No Preview Restrictions */}
      <div className="bg-slate-50" style={{ height: '800px' }}>
        <div className="h-full bg-white m-2 rounded border border-slate-200 overflow-hidden">
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
            className="w-full h-full"
            title={fileName}
            onError={() => {
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50';
                errorDiv.innerHTML = `
                  <svg class="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p class="text-slate-600 text-sm mb-2">PDF could not be loaded</p>
                  <p class="text-slate-500 text-xs mb-4">Please try opening in a new tab</p>
                  <button onclick="window.open('${fileUrl}', '_blank')" class="px-3 py-1.5 bg-sky-600 text-white text-xs rounded hover:bg-sky-700">
                    Open in New Tab
                  </button>
                `;
                iframe.parentNode.appendChild(errorDiv);
              }
            }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          Full PDF Document • Use toolbar to navigate pages
        </div>
        <div className="text-xs text-slate-400">
          Interactive viewer
        </div>
      </div>
    </div>
  );
}

export default CompactPdfViewer;
