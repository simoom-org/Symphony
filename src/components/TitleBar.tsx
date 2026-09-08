import React from 'react';
import { 
  Minus, Square, X, HardDrive, ShieldCheck, Sparkles, 
  FileText, BookOpen, Download, FolderOpen, Plus
} from 'lucide-react';
import { DocumentProject } from '../types';

interface TitleBarProps {
  project: DocumentProject;
  isDirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onPublish: () => void;

  isDirectSaveMode: boolean;
  onToggleDirectSave: (isOn: boolean) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  project,
  isDirty,
  onNew,
  onOpen,
  onSave,
  onPublish
,
  isDirectSaveMode,
  onToggleDirectSave
}) => {
  const totalWords = project.chapters.reduce((acc, chap) => {
    const text = chap.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return acc + (text ? text.split(/\s+/).length : 0);
  }, 0);

  return (
    <header 
      id="windows-titlebar" 
      className="h-9 bg-white select-none text-slate-700 flex items-center justify-between px-2.5 text-xs border-b border-slate-200 z-50 shrink-0 font-sans"
    >
      {/* Left: App Identity & Quick Actions */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 font-medium pr-2.5 border-r border-slate-200" title="Symphony">
          <img src="/logo.png" alt="Symphony Logo" className="h-5 object-contain rounded-sm" />
          <span className="truncate hidden sm:inline text-slate-800 tracking-tight text-xs font-extrabold" style={{ color: "var(--brand-color, #1e293b)" }}>Symphony</span>
        </div>

        {/* Document Quick Title */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-800 font-medium truncate max-w-[200px] md:max-w-[320px]">
            {project.metadata.title || 'Untitled Document'}
          </span>
          
            {/* Direct Save Toggle */}
            <div className="flex items-center gap-1.5 ml-1 border border-slate-200 bg-white rounded px-2 py-0.5">
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Auto-save to main file:</span>
              <button 
                onClick={() => onToggleDirectSave(!isDirectSaveMode)}
                className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${isDirectSaveMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${isDirectSaveMode ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </button>
              
              {/* Status Dot */}
              <div 
                title={isDirty ? "Unsaved changes in Temp file (Press Ctrl+S to save to Main)" : "All changes saved to Main file"}
                className={`ml-1 w-2 h-2 rounded-full ${isDirty ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-emerald-500'}`} 
              />
            </div>

        </div>
      </div>

      {/* Right: Quick Tools & Window Controls */}
      <div className="flex items-center gap-1">
        <button
          id="titlebar-quick-new"
          onClick={onNew}
          title="New Project / Template"
          className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          id="titlebar-quick-open"
          onClick={onOpen}
          title="Open File (.docx, .txt, .html, .json)"
          className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button
          id="titlebar-quick-save"
          onClick={onSave}
          title="Save to Local Offline Storage (Ctrl+S)"
          className="p-1 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded transition"
        >
          <HardDrive className="w-3.5 h-3.5" />
        </button>
        <button
          id="titlebar-quick-publish"
          onClick={onPublish}
          title="Publish / Export Manuscript"
          className="p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded transition"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Windows Standard Controls */}
        <div className="flex items-center ml-2 pl-1 border-l border-slate-200">
          <button
            id="win-btn-minimize"
            title="Minimize Window"
            onClick={() => {}}
            className="h-7 w-8 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            id="win-btn-maximize"
            title="Maximize Window"
            onClick={() => {}}
            className="h-7 w-8 flex items-center justify-center hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            id="win-btn-close"
            title="Close Application"
            onClick={() => {
              if (window.confirm('Reset this workspace or close session? Unsaved snapshots are kept in local storage.')) {
                onNew();
              }
            }}
            className="h-7 w-8 flex items-center justify-center hover:bg-red-500 text-slate-600 hover:text-white transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
