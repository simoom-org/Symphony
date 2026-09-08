import React from 'react';
import { 
  HardDrive, CheckCircle2, Clock, ZoomIn, ZoomOut, 
  FileText, Layers, ShieldCheck, Compass, Sparkles 
} from 'lucide-react';
import { DocumentProject, ChapterItem } from '../types';

interface FooterStatusBarProps {
  project: DocumentProject;
  activeChapter?: ChapterItem;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  isDirty: boolean;
}

export const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  project,
  activeChapter,
  zoomLevel,
  onZoomChange,
  isDirty
}) => {
  // Calculate total manuscript metrics
  const totalWords = project.chapters.reduce((acc, chap) => {
    const text = (chap.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return acc + (text ? text.split(/\s+/).length : 0);
  }, 0);

  const totalCharsWithSpaces = project.chapters.reduce((acc, chap) => {
    const text = (chap.content || '').replace(/<[^>]*>/g, '');
    return acc + text.length;
  }, 0);

  const totalCharsNoSpaces = project.chapters.reduce((acc, chap) => {
    const text = (chap.content || '').replace(/<[^>]*>/g, '').replace(/\s/g, '');
    return acc + text.length;
  }, 0);

  // Active Chapter metrics
  const activeChapterText = activeChapter 
    ? (activeChapter.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() 
    : '';
  const activeChapterWords = activeChapterText ? activeChapterText.split(/\s+/).length : 0;
  const activeChapterChars = activeChapter ? (activeChapter.content || '').replace(/<[^>]*>/g, '').length : 0;

  // Reading time (approx 200 words per minute)
  const readTimeMin = Math.max(1, Math.ceil(totalWords / 200));

  return (
    <footer 
      id="app-footer-statusbar"
      className="h-7 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-[11px] select-none text-slate-600 font-sans shrink-0 z-40"
    >
      {/* Left section: Active chapter path & stats */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Offline sync status */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-200">
          <span className={`w-2 h-2 rounded-full ${isDirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="font-medium text-slate-700 hidden sm:inline text-[11px]">
            {isDirty ? 'Editing...' : 'Offline Storage Synced'}
          </span>
        </div>

        {/* Current Chapter Breadcrumb */}
        {activeChapter && (
          <div className="flex items-center gap-1 truncate text-slate-500 max-w-[240px] md:max-w-[340px]">
            <Compass className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="truncate">
              Level {activeChapter.level}: <strong className="text-slate-700 font-semibold">{activeChapter.title}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Center: Detailed Word & Character Counts */}
      <div className="flex items-center gap-3 md:gap-4 font-mono text-[10px] md:text-[11px]">
        {/* Document Total Words */}
        <div className="flex items-center gap-1" title="Total manuscript words">
          <span className="text-slate-400">Total:</span>
          <strong className="text-slate-800 font-bold">
            {totalWords.toLocaleString()}
          </strong>
          <span className="text-slate-400">words</span>
        </div>

        {/* Current Chapter Words */}
        <div className="hidden sm:flex items-center gap-1" title="Active chapter words">
          <span className="text-slate-400">Section:</span>
          <strong className="text-blue-600 font-bold">
            {activeChapterWords.toLocaleString()}
          </strong>
          <span className="text-slate-400">w</span>
        </div>

        {/* Characters (With / Without spaces) */}
        <div className="hidden lg:flex items-center gap-1 text-slate-500" title="Total characters (with / without spaces)">
          <span>Chars:</span>
          <span>{totalCharsWithSpaces.toLocaleString()}</span>
          <span className="text-slate-400 text-[9px]">({totalCharsNoSpaces.toLocaleString()} no spaces)</span>
        </div>

        {/* Estimated Reading Time */}
        <div className="hidden md:flex items-center gap-1 text-slate-500" title="Estimated reading time">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>~{readTimeMin} min read</span>
        </div>
      </div>

      {/* Right: Encoding & Zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-mono hidden sm:inline text-[10px] pr-2 border-r border-slate-200">
          UTF-8
        </span>

        {/* Zoom controller */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(Math.max(70, zoomLevel - 10))}
            title="Zoom Out"
            className="p-0.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] w-8 text-center text-slate-700">
            {zoomLevel}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(150, zoomLevel + 10))}
            title="Zoom In"
            className="p-0.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};
