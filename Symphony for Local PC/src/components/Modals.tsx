import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, FileText, Image as ImageIcon, Asterisk,
  Sparkles, Check, Download, Printer, Search, ArrowRight,
  BookOpen, Layers, ShieldCheck, AlertCircle, Copy, FileDown
} from 'lucide-react';
import { DocumentProject, ChapterItem } from '../types';
import { parseImportedFile, ImportResult } from '../utils/docxReader';
import { generateCompiledHtml, downloadFile, generateMarkdownManuscript, generatePlainTextManuscript } from '../utils/exportEngine';

// ==========================================
// 1. OPEN / IMPORT FILE MODAL
// ==========================================
interface OpenFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

export const OpenFileModal: React.FC<OpenFileModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewResult(null);
      setError(null);
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const result = await parseImportedFile(file);
      setPreviewResult(result);
    } catch (e: any) {
      setError(e.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewResult) {
      onImportComplete(previewResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800 text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Open &amp; Import Document</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!previewResult ? (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".epub,.docx,.txt,.html,.htm,.md,.symphony,.json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-800 mb-1">
                    Click to browse or drag and drop document here
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Supports Symphony Projects (.symphony), Microsoft Word (.docx), Plain Text (.txt), Markdown (.md), and HTML (.html)
                  </div>
                </div>
              </div>

              {loading && (
                <div className="text-center text-xs text-blue-600 mt-3 font-medium">
                  Parsing and extracting document structure...
                </div>
              )}

              {error && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <Check className="w-4 h-4" /> Successfully Parsed File: {previewResult.importedFormat.toUpperCase()}
                </div>
                <div className="text-slate-700 font-semibold text-sm">
                  {previewResult.title}
                </div>
                <div className="text-[11px] text-slate-500">
                  Generated {previewResult.chapters.length} chapter node(s) ready to import into your workspace.
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50/70 space-y-1">
                {previewResult.chapters.map((chap, i) => (
                  <div key={chap.id || i} className="text-[11px] text-slate-600 truncate">
                    • Level {chap.level}: <strong>{chap.title}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 font-medium hover:bg-slate-300"
          >
            Cancel
          </button>
          {previewResult && (
            <button
              onClick={handleConfirmImport}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Load into Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. INSERT IMAGE MODAL
// ==========================================
interface InsertImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (htmlSnippet: string) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImage
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [alignment, setAlignment] = useState<'center' | 'left' | 'right' | 'full'>('center');
  const [previewSrc, setPreviewSrc] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const src = loadEvt.target?.result as string;
        setPreviewSrc(src);
        setImageUrl(src);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    const src = previewSrc || imageUrl;
    if (!src) return;

    let alignStyle = 'margin: 1.5em auto; display: block; max-width: 80%;';
    if (alignment === 'left') alignStyle = 'float: left; margin: 0 1.5em 1em 0; max-width: 45%;';
    if (alignment === 'right') alignStyle = 'float: right; margin: 0 0 1em 1.5em; max-width: 45%;';
    if (alignment === 'full') alignStyle = 'width: 100%; margin: 1.5em 0;';

    const figureHtml = `
      <figure class="doc-figure" style="${alignStyle} text-align: center;">
        <img src="${src}" alt="${caption || 'Figure'}" style="width: 100%; border-radius: 4px; border: 1px solid #e2e8f0;" />
        ${caption ? `<figcaption style="font-size: 0.85em; color: #64748b; margin-top: 6px; font-style: italic;">${caption}</figcaption>` : ''}
      </figure><p><br/></p>
    `;

    onInsertImage(figureHtml);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs text-slate-800">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span>Insert Image into Chapter</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block font-medium mb-1 text-slate-700">Upload Image File</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="text-center text-slate-400 text-[10px] uppercase font-semibold">
            &mdash; OR WEB IMAGE URL &mdash;
          </div>

          <div>
            <label className="block font-medium mb-1 text-slate-700">Image Web Address</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setPreviewSrc(e.target.value); }}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-slate-700">Figure Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Figure 1.1: System Architecture Diagram"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-slate-700">Placement &amp; Alignment</label>
            <div className="grid grid-cols-4 gap-1">
              {(['center', 'left', 'right', 'full'] as const).map((al) => (
                <button
                  key={al}
                  onClick={() => setAlignment(al)}
                  className={`py-1 text-center font-semibold rounded capitalize ${
                    alignment === al
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {al}
                </button>
              ))}
            </div>
          </div>

          {previewSrc && (
            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-center">
              <img src={previewSrc} alt="Preview" className="max-h-28 mx-auto rounded object-contain" />
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-slate-200 text-slate-700">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!previewSrc && !imageUrl}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold"
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. NEW TEMPLATE PICKER MODAL
// ==========================================
interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: 'blank' | 'monograph' | 'novel' | 'academic') => void;
}

export const NewTemplateModal: React.FC<NewTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs text-slate-800">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>New Document / Project Template</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => { onSelectTemplate('blank'); onClose(); }}
            className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition space-y-1.5 group"
          >
            <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">
              Blank Manuscript
            </div>
            <p className="text-[11px] text-slate-500">
              A clean slate with a single Chapter 1 node ready for drafting.
            </p>
          </div>

          <div
            onClick={() => { onSelectTemplate('academic'); onClose(); }}
            className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition space-y-1.5 group"
          >
            <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">
              Academic Paper
            </div>
            <p className="text-[11px] text-slate-500">
              Abstract, Introduction, Methodology, Results, Discussion, and IEEE Citations.
            </p>
          </div>

          <div
            onClick={() => { onSelectTemplate('novel'); onClose(); }}
            className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition space-y-1.5 group"
          >
            <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">
              Novel / Fiction
            </div>
            <p className="text-[11px] text-slate-500">
              Prologue, Acts, Chapters, and Sub-scenes with clean typography.
            </p>
          </div>

          <div
            onClick={() => { onSelectTemplate('monograph'); onClose(); }}
            className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition space-y-1.5 group"
          >
            <div className="font-bold text-sm text-slate-900 group-hover:text-blue-600">
              Systems Monograph
            </div>
            <p className="text-[11px] text-slate-500">
              Full sample project with rich multi-level chapters, cover, and APA bibliography.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. PUBLISHING READER & PDF EXPORT MODAL
// ==========================================
interface PublishingModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DocumentProject;
}

export const PublishingModal: React.FC<PublishingModalProps> = ({
  isOpen,
  onClose,
  project
}) => {
  if (!isOpen) return null;

  const htmlBundle = generateCompiledHtml(project);

  const handleDownloadHtml = () => {
    downloadFile(htmlBundle, `${project.metadata.title || 'manuscript'}.html`, 'text/html');
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownManuscript(project);
    downloadFile(md, `${project.metadata.title || 'manuscript'}.md`, 'text/markdown');
  };

  const handleDownloadPlainText = () => {
    const txt = generatePlainTextManuscript(project);
    downloadFile(txt, `${project.metadata.title || 'manuscript'}.txt`, 'text/plain');
  };

  const handleDownloadEpub = () => {
    import('../utils/epubExporter').then(module => {
      module.exportToEpub(project);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlBundle);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-slate-800 text-xs">
        {/* Top bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm">{project.metadata.title} &mdash; Compiled Reader</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save to PDF
            </button>
            <button
              onClick={handleDownloadEpub}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" /> EPUB eBook
            </button>
            <button
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" /> HTML Book
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" /> Markdown (.md)
            </button>
            <button
              onClick={handleDownloadPlainText}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" /> Plain Text (.txt)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Reader iframe Preview */}
        <div className="flex-1 bg-slate-50 overflow-hidden p-2">
          <iframe
            title="Book Preview"
            srcDoc={htmlBundle}
            className="w-full h-full border border-slate-200 rounded shadow-xs bg-white"
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. SHORTCUTS MODAL
// ==========================================
export const ShortcutsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs text-slate-800">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <span className="font-bold text-sm">Keyboard Shortcuts</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-2">
          
            {[
              { key: 'Ctrl + S', desc: 'Save & update local offline storage' },
              { key: 'Ctrl + N', desc: 'New document template' },
              { key: 'Ctrl + O', desc: 'Open file (.docx, .txt, .html, .json)' },
              { key: 'Ctrl + P', desc: 'Open publishing reader & print PDF' },
              { key: 'Ctrl + F', desc: 'Find and Replace text' },
              { key: 'Ctrl + Enter', desc: 'Divide text into new chapter (Page Break)' },
              { key: 'Ctrl + Alt + 0', desc: 'Apply Normal Text (Paragraph)' },
              { key: 'Ctrl + Alt + 1', desc: 'Apply Heading 1 (Chapter Title)' },
              { key: 'Ctrl + Alt + 2', desc: 'Apply Heading 2 (Section)' },
              { key: 'Ctrl + Alt + 3', desc: 'Apply Heading 3 (Subsection)' },
              { key: 'Ctrl + Alt + 4', desc: 'Apply Heading 4' },
              { key: 'Ctrl + Alt + 5', desc: 'Apply Heading 5' },
              { key: 'Ctrl + Alt + 6', desc: 'Apply Heading 6' },
{ key: 'Ctrl + B', desc: 'Toggle Bold text' },
            { key: 'Ctrl + I', desc: 'Toggle Italic text' },
            { key: 'Ctrl + U', desc: 'Toggle Underline text' },
            { key: 'Ctrl + Z', desc: 'Undo last edit' },
            { key: 'Ctrl + Y', desc: 'Redo last edit' },
          ].map(s => (
            <div key={s.key} className="flex justify-between py-1 border-b border-slate-100">
              <span className="font-semibold text-slate-600">{s.desc}</span>
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px] text-slate-700">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. FIND & REPLACE MODAL
// ==========================================
export const FindReplaceModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  onReplace: (find: string, replace: string, all: boolean) => void;
  onFindNextGlobal: (findStr: string) => void;
}> = ({ isOpen, onClose, onReplace, onFindNextGlobal }) => {
  const [findStr, setFindStr] = React.useState('');
  const [replaceStr, setReplaceStr] = React.useState('');
  
  if (!isOpen) return null;

  const handleFindNextLocal = () => {
    if (!findStr) return;
    const found = window.find(findStr, false, false, true, false, false, false);
    if (!found) {
      alert(`No matches found for "${findStr}" in this chapter.`);
    }
  };

  const handleFindNextGlobal = () => {
    if (!findStr) return;
    onFindNextGlobal(findStr);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-xs text-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <span className="font-bold text-sm">Find & Replace</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-slate-600 mb-1">Find</label>
            <div className="flex gap-1.5">
              <input type="text" value={findStr} onChange={e => setFindStr(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleFindNextLocal(); }} className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" autoFocus />
              <button onClick={handleFindNextLocal} className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium border border-blue-200" title="Find next in current chapter">Find (Chap)</button>
              <button onClick={handleFindNextGlobal} className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium border border-indigo-200" title="Find next across entire book">Find (Book)</button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Replace with</label>
            <input type="text" value={replaceStr} onChange={e => setReplaceStr(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => { if(findStr) { onReplace(findStr, replaceStr, false); onClose(); } }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded font-medium">Replace (Active Chapter)</button>
            <button onClick={() => { if(findStr) { onReplace(findStr, replaceStr, true); onClose(); } }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Replace (All Chapters)</button>
          </div>
        </div>
      </div>
    </div>
  );
};




// ==========================================
// UNSAVED CHANGES ALERT MODAL
// ==========================================
interface UnsavedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const UnsavedAlertModal: React.FC<UnsavedAlertModalProps> = ({ isOpen, onClose, onSave, onDiscard }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Unsaved Changes
        </h3>
        <p className="text-slate-600 text-sm mb-6">
          Your current document has unsaved changes. Do you want to save them before continuing?
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onSave} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition shadow-sm">
            Save & Continue
          </button>
          <button onClick={onDiscard} className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium transition">
            Discard Changes
          </button>
          <button onClick={onClose} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition mt-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
