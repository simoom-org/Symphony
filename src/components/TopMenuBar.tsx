import React, { useState, useRef, useEffect } from 'react';
import { X,  
  FileText, FolderOpen, Save, FileDown, BookOpen, Printer, Download, RefreshCw,
  Undo2, Redo2, Scissors, Copy, Clipboard, Search, CheckSquare,
  Image as ImageIcon, Table, Minus, Quote, Code,
  Eye, LayoutList, SlidersHorizontal, Sun, Moon, Maximize2,
  HelpCircle, Sparkles, Layers, ShieldCheck, Check, Settings
 } from 'lucide-react';
import { DocumentProject, RightPanelTab } from '../types';

interface TopMenuBarProps {
  isDirty: boolean;
  isDirectSaveMode: boolean;
  onToggleDirectSave: (isOn: boolean) => void;
  project: DocumentProject;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
    onClose: () => void;
  onPublish: () => void;
  onPrint: () => void;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onInsertRule: () => void;
  onInsertSymbol: (symbol: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFindReplace: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onSelectRightTab: (tab: RightPanelTab) => void;
  onToggleHtmlMode: () => void;
  isHtmlMode: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  isDirty,
  isDirectSaveMode,
  onToggleDirectSave,
  project,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
    onClose,
  onPublish,
  onPrint,
  onInsertImage,
  onInsertTable,
  onInsertRule,
  onInsertSymbol,
  onUndo,
  onRedo,
  onFindReplace,
  onToggleLeftPanel,
  onToggleRightPanel,
  onSelectRightTab,
  onToggleHtmlMode,
  isHtmlMode,
  leftPanelOpen,
  rightPanelOpen,
  onShowShortcuts,
  onShowAbout
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(prev => (prev === menuName ? null : menuName));
  };

  const handleAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  return (
    <div 
      ref={menuBarRef} 
      id="unified-top-menu-bar"
      className="h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs select-none z-50 relative font-sans text-slate-700 shrink-0 shadow-sm"
    >
      {/* LEFT SECTION: Left Panel Toggle + Menus */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleLeftPanel}
          title={leftPanelOpen ? "Hide Left Sidebar" : "Show Left Sidebar"}
          className={`p-1.5 rounded transition flex items-center justify-center ${
            leftPanelOpen ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <LayoutList className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-200 mx-1"></div>
        {/* Left Menu Items */}
      <div className="flex items-center gap-0.5">
          {/* FILE MENU */}
        <div className="relative">
          <button
            id="menu-btn-file"
            onClick={() => handleMenuClick('file')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 transition font-medium ${
              activeMenu === 'file' ? 'bg-slate-100 text-blue-600' : ''
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-0.5 w-64 bg-white rounded shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <button
                  id="menu-file-new"
                  onClick={() => handleAction(onNew)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> New Document
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+N</span>
                </button>
                <button
                  id="menu-file-open"
                  onClick={() => handleAction(onOpen)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5" /> Open File...
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+O</span>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                <button
                  id="menu-file-save-symphony"
                  onClick={() => handleAction(onSave)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-blue-500" /> Save
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>
                
                <button
                  id="menu-file-save-as"
                  onClick={() => handleAction(onSaveAs)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileDown className="w-3.5 h-3.5 text-emerald-600" /> Save As...
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100"></div>

                <button
                  id="menu-file-publish"
                  onClick={() => handleAction(onPublish)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left font-medium text-blue-600"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Publishing...
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">Ctrl+P</span>
                </button>
                              <div className="my-1 border-t border-slate-100"></div>

                <button
                  id="menu-file-close"
                  onClick={() => handleAction(onClose)}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-red-50 text-red-600 transition text-left font-medium"
                >
                  <span className="flex items-center gap-2">
                    <X className="w-3.5 h-3.5" /> Close Document
                  </span>
                </button>
              </div>
            )}
        </div>

        {/* EDIT MENU */}
        <div className="relative">
          <button
            id="menu-btn-edit"
            onClick={() => handleMenuClick('edit')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 transition font-medium ${
              activeMenu === 'edit' ? 'bg-slate-100 text-blue-600' : ''
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs animate-in fade-in duration-150">
              <button
                onClick={() => handleAction(onUndo)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Undo2 className="w-3.5 h-3.5 text-slate-400" /> Undo
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
              </button>
              <button
                onClick={() => handleAction(onRedo)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Redo2 className="w-3.5 h-3.5 text-slate-400" /> Redo
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={() => handleAction(onFindReplace)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" /> Find &amp; Replace
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+F</span>
              </button>
            </div>
          )}
        </div>

        {/* INSERT MENU */}
        <div className="relative">
          <button
            id="menu-btn-insert"
            onClick={() => handleMenuClick('insert')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 transition font-medium ${
              activeMenu === 'insert' ? 'bg-slate-100 text-blue-600' : ''
            }`}
          >
            Insert
          </button>
          {activeMenu === 'insert' && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs animate-in fade-in duration-150">
              <button
                id="menu-insert-image"
                onClick={() => handleAction(onInsertImage)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Image (Upload / URL)
                </span>
              </button>
              <button
                id="menu-insert-table"
                onClick={() => handleAction(onInsertTable)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Table className="w-3.5 h-3.5 text-emerald-500" /> 3x3 Table
                </span>
              </button>
              <button
                id="menu-insert-rule"
                onClick={() => handleAction(onInsertRule)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Minus className="w-3.5 h-3.5 text-slate-400" /> Horizontal Rule / Divider
                </span>
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              <div className="px-3 pt-1 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Special Characters
              </div>
              <div className="grid grid-cols-6 gap-1 px-3 py-1">
                {['\u2014', '\u2013', '\u201C', '\u201D', '\u2018', '\u2019', '\u2026', '\u00A9', '\u00AE', '\u2122', '\u00B0', '\u00B1'].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleAction(() => onInsertSymbol(sym))}
                    className="p-1 text-center font-serif text-sm hover:bg-slate-100 rounded transition"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            id="menu-btn-view"
            onClick={() => handleMenuClick('view')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 transition font-medium ${
              activeMenu === 'view' ? 'bg-slate-100 text-blue-600' : ''
            }`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs animate-in fade-in duration-150">
              <button
                onClick={() => handleAction(onToggleLeftPanel)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <LayoutList className="w-3.5 h-3.5 text-slate-400" /> Chapter Tree Panel (Left)
                </span>
                {leftPanelOpen && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button
                onClick={() => handleAction(onToggleRightPanel)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Metadata &amp; Inspector (Right)
                </span>
                {rightPanelOpen && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={() => handleAction(onToggleHtmlMode)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-indigo-500" /> Source HTML Mode
                </span>
                {isHtmlMode && <Check className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={() => handleAction(onPublish)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 flex items-center justify-center font-bold">👁</span> Preview Book
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+P</span>
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="relative">
          <button
            id="menu-btn-help"
            onClick={() => handleMenuClick('help')}
            className={`px-2.5 py-1 rounded hover:bg-slate-100 transition font-medium ${
              activeMenu === 'help' ? 'bg-slate-100 text-blue-600' : ''
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs animate-in fade-in duration-150">
              <button
                onClick={() => handleAction(onShowShortcuts)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span>Keyboard Shortcuts</span>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+/</span>
              </button>
              <button
                onClick={() => handleAction(onShowAbout)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition text-left"
              >
                <span>About Studio</span>
              </button>
            </div>
          )}
        </div>
      </div>

              </div>

      {/* CENTER SECTION: Document Name + Auto Save */}
      <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0 px-2 sm:px-4 pointer-events-auto">
        <span className="text-slate-800 font-semibold truncate shrink">
          {project.metadata.title || 'Untitled Document'}
        </span>
        <div className="h-3 w-px bg-slate-300 hidden sm:block shrink-0"></div>
        <div className="hidden sm:flex items-center gap-1.5 border border-slate-200 bg-slate-50 rounded px-2 py-0.5 shrink-0">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Auto-save</span>
          <button 
            onClick={() => onToggleDirectSave(!isDirectSaveMode)}
            className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${isDirectSaveMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${isDirectSaveMode ? 'translate-x-3' : 'translate-x-0.5'}`} />
          </button>
          <div 
            title={isDirty ? "Unsaved changes in Temp file" : "All changes saved"}
            className={`ml-0.5 w-2 h-2 rounded-full ${isDirty ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-emerald-500'}`} 
          />
        </div>
      </div>

      {/* RIGHT SECTION: Publish + Right Panel Toggle */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPublish}
          title="Publish / Export Manuscript"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Publish</span>
        </button>
        <div className="h-4 w-px bg-slate-200 mx-1"></div>
        <button
          onClick={onToggleRightPanel}
          title={rightPanelOpen ? "Hide Right Sidebar" : "Show Right Sidebar"}
          className={`p-1.5 rounded transition flex items-center justify-center ${
            rightPanelOpen ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
