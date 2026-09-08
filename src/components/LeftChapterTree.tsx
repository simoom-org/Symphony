import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, ArrowUp, ArrowDown, ChevronRight, ChevronDown,
  CornerDownRight, MoreVertical, Copy, Edit2, 
  Search, Layers, FolderTree, GripVertical, 
  Indent, Outdent, ChevronUp, Hash, List, Merge
} from 'lucide-react';
import { ChapterItem } from '../types';

const extractHeadings = (htmlContent: string) => {
  const doc = new DOMParser().parseFromString(htmlContent || '', 'text/html');
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  return headings.map((h, i) => ({
    id: `heading-${i}`,
    tag: h.tagName.toLowerCase(), // 'h1', 'h2', 'h3'
    text: h.textContent?.trim() || '(Empty Heading)'
  }));
};

interface LeftChapterTreeProps {
  chapters: ChapterItem[];
  activeChapterId: string;
  language: string;
  activeTab: 'outline' | 'structure';
  onTabChange: (tab: 'outline' | 'structure') => void;
  checkedChapterIds: string[];
  onToggleChapterCheck: (id: string, checked: boolean) => void;
  onSelectChapter: (id: string) => void;
  onAddChapter: (level: number, parentIndex?: number) => void;
  onDeleteChapter: (id: string) => void;
  onMergeWithPrevious: (id: string) => void;
  onRenameChapter: (id: string, newTitle: string) => void;
  onDuplicateChapter: (id: string) => void;
  onMoveChapter: (fromIndex: number, direction: 'up' | 'down') => void;
  onChangeLevel: (id: string, newLevel: number) => void;
  onReorderChapter: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}

export const LeftChapterTree: React.FC<LeftChapterTreeProps> = ({
  chapters,
  activeChapterId,
  language,
  activeTab,
  onTabChange,
  checkedChapterIds,
  onToggleChapterCheck,
  onSelectChapter,
  onAddChapter,
  onDeleteChapter,
  onMergeWithPrevious,
  onRenameChapter,
  onDuplicateChapter,
  onMoveChapter,
  onChangeLevel,
  onReorderChapter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const handleGlobalClick = () => setMenuOpenId(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);
  
  // Drag and Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const activeChapter = chapters.find(c => c.id === activeChapterId) || chapters[0];

  const formatNumber = (num: number | string) => {
    const numStr = String(num);
    if (language === 'Bangla' || language === 'Bengali') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return numStr.replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
    }
    if (language === 'Arabic') {
      const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return numStr.replace(/\d/g, (d) => arDigits[parseInt(d, 10)]);
    }
    return numStr;
  };

  // Numbering Logic
  const getNumberedChapters = () => {
    let counters: number[] = [];
    return chapters.map((chap, originalIndex) => {
      if (chap.level === 0) {
        counters = []; // Reset chapter numbering after every Volume
      }
      if (chap.hideTitle || chap.level === 0) {
        return { chap, originalIndex, numbering: '' };
      }
      while (counters.length < chap.level) counters.push(0);
      if (counters.length > chap.level) counters.length = chap.level;
      counters[counters.length - 1]++;
      return { chap, originalIndex, numbering: formatNumber(counters.join('.')) };
    });
  };

  const numberedChapters = getNumberedChapters();

  const filteredChapters = numberedChapters
    .filter(({ chap }) => {
      if (!searchQuery.trim()) return true;
      return chap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chap.content.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Flat Structure Items (Chapters + Headings) for 'Book Structure' tab
  const getStructureItems = () => {
    const items: { type: 'chapter' | 'heading', id: string, text: string, numbering: string, level: number, chapId: string, tag?: string, isHidden?: boolean }[] = [];
    let counters: number[] = [];
    
    const updateCounter = (level: number, skip: boolean) => {
      if (level === 0) {
        counters = []; // Reset chapter numbering after every Volume
      }
      if (skip || level === 0) return '';
      while (counters.length < level) counters.push(0);
      if (counters.length > level) counters.length = level;
      counters[counters.length - 1]++;
      return formatNumber(counters.join('.'));
    };

    chapters.forEach(chap => {
      items.push({
        type: 'chapter',
        id: chap.id,
        text: chap.title || 'Untitled Node',
        numbering: updateCounter(chap.level, !!chap.hideTitle),
        level: chap.level,
        chapId: chap.id,
        isHidden: !!chap.hideTitle
      });

      const headings = extractHeadings(chap.content);
      headings.forEach(h => {
        const hLevel = chap.level + parseInt(h.tag[1], 10);
        items.push({
          type: 'heading',
          id: h.id + '-' + chap.id,
          text: h.text,
          numbering: updateCounter(hLevel, !!chap.hideTitle),
          level: hLevel,
          chapId: chap.id,
          tag: h.tag
        });
      });
    });

    return items;
  };

  const handleStartRename = (chap: ChapterItem) => {
    setEditingId(chap.id);
    setEditingTitle(chap.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameChapter(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const getWordCount = (content: string) => {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientY = e.clientY - rect.top;
    const height = rect.height;

    // Top 25% -> 'before', middle 50% -> 'inside' (nest under target), bottom 25% -> 'after'
    if (clientY < height * 0.3) {
      setDropPosition('before');
    } else if (clientY > height * 0.7) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }
    setDropTargetId(targetId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId && dropPosition) {
      onReorderChapter(draggedId, targetId, dropPosition);
    }
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  return (
    <aside 
      id="left-chapter-panel"
      className="w-full bg-white border-r border-slate-200 flex flex-col h-full select-none text-slate-800"
    >
      {/* Sub-Window / Tab Switcher Ribbon */}
      <div className="bg-[#f8fafc] p-1 border-b border-slate-200 grid grid-cols-2 gap-1 text-xs">
        <button
          onClick={() => onTabChange('outline')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition ${
            activeTab === 'outline'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span className="tracking-tight">Outline</span>
        </button>

        <button
          onClick={() => onTabChange('structure')}
          className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition ${
            activeTab === 'structure'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span className="tracking-tight">Structure</span>
        </button>
      </div>

      <>
        {/* Panel Header */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {chapters.length} {chapters.length === 1 ? 'node' : 'nodes'}
              </span>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search outline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                id="btn-add-chapter-l1"
                onClick={() => onAddChapter(1)}
                title="Add Main Level 1 Chapter"
                className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition shadow-2xs"
              >
                <Plus className="w-3 h-3" /> + Chapter
              </button>
              <button
                id="btn-add-subchapter"
                onClick={() => onAddChapter((activeChapter?.level || 1) + 1)}
                title={`Add Subchapter (Level ${(activeChapter?.level || 1) + 1}) under active node`}
                className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition"
              >
                <CornerDownRight className="w-3 h-3" /> + Sub
              </button>
              <button
                id="btn-add-volume"
                onClick={() => onAddChapter(0)}
                title="Add Volume (Top Level Grouping)"
                className="flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition"
              >
                <Layers className="w-3 h-3" /> + Volume
              </button>
            </div>
          </div>
        </>

      {/* Chapter Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
          {filteredChapters.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 px-4">
              No matching chapters found.
            </div>
          ) : (
            filteredChapters.map(({ chap, originalIndex, numbering }) => {
              const isActive = chap.id === activeChapterId;
              const isBeingDragged = draggedId === chap.id;
              const isDropTarget = dropTargetId === chap.id;
              const indentPadding = Math.max(6, (chap.level - 1) * 14 + 6);

            return (
              <div
                key={chap.id}
                draggable={editingId !== chap.id}
                onDragStart={(e) => handleDragStart(e, chap.id)}
                onDragOver={(e) => handleDragOver(e, chap.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, chap.id)}
                onDragEnd={handleDragEnd}
                className={`group relative rounded-md transition-all text-xs border ${
                  isBeingDragged 
                    ? 'opacity-40 border-dashed border-slate-400 bg-slate-100' 
                    : isDropTarget && dropPosition === 'inside'
                    ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-300'
                    : isActive
                    ? 'bg-blue-50/80 border-blue-200 shadow-2xs'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {/* Visual drop indicator lines */}
                {isDropTarget && dropPosition === 'before' && (
                  <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10 animate-pulse" />
                )}
                {isDropTarget && dropPosition === 'after' && (
                  <div className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10 animate-pulse" />
                )}

                <div
                  onClick={() => onSelectChapter(chap.id)}
                  style={{ paddingLeft: `${indentPadding}px` }}
                  className="flex items-center justify-between py-1.5 pr-2 cursor-pointer"
                >
                  {/* Left indicator & Title */}
                  <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-1.5">
                    {/* Structure Mode Checkbox */}
                    {activeTab === 'structure' && (
                      <input
                        type="checkbox"
                        checked={checkedChapterIds.includes(chap.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onToggleChapterCheck(chap.id, e.target.checked)}
                        className="mr-0.5 cursor-pointer w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0"
                      />
                    )}

                    {/* Hierarchy Level Tag */}
                      <span 
                        title={`Level ${chap.level} Outline Node`}
                        className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold shrink-0 ${
                          chap.level === 1 
                            ? 'bg-blue-100 text-blue-800' 
                            : chap.level === 2
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        L{chap.level}
                      </span>

                      {/* Title or Editable Input */}
                      {editingId === chap.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleSaveRename(chap.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(chap.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1.5 py-0.5 text-xs bg-white border border-blue-400 rounded focus:outline-none font-medium text-slate-800"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => handleStartRename(chap)}
                          className={`truncate flex items-center ${
                            chap.level === 0
                              ? `font-bold uppercase tracking-wide ${isActive ? 'text-blue-900' : 'text-slate-900'}`
                              : `${isActive ? 'font-semibold text-blue-900' : 'text-slate-700'} ${chap.level === 1 ? 'font-medium' : ''}`
                          } ${chap.hideTitle ? 'opacity-60 line-through decoration-slate-300' : ''}`}
                        >
                          {numbering && (
                            <span className="text-slate-400 mr-1.5 font-mono text-[10px] shrink-0">{numbering}</span>
                          )}
                          <span className="truncate">{chap.title || 'Untitled Node'}</span>
                        </span>
                      )}
                  </div>

                  {/* Right metadata (actions) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Quick Level Outdent/Indent on Hover */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        title="Outdent / Promote (Level - 1)"
                        disabled={chap.level <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeLevel(chap.id, Math.max(1, chap.level - 1));
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-200"
                      >
                        <Outdent className="w-3 h-3" />
                      </button>

                      <button
                        title="Indent / Nest (Level + 1)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeLevel(chap.id, chap.level + 1);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                      >
                        <Indent className="w-3 h-3" />
                      </button>
                    </div> {/* Close hover container for indents */}

                      {/* Dropdown Menu Trigger */}
                      <div className={`relative ${activeTab === 'outline' && menuOpenId !== chap.id ? 'opacity-0 group-hover:opacity-100 transition-opacity' : 'opacity-100'}`}>
                        <button
                          title="Node Options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === chap.id ? null : chap.id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>

                        {/* Node context dropdown */}
                        {menuOpenId === chap.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-[11px]"
                          >
                            <button
                              onClick={() => handleStartRename(chap)}
                              className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" /> Rename Title
                            </button>
                            <button
                              onClick={() => {
                                onDuplicateChapter(chap.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700"
                            >
                              <Copy className="w-3 h-3 text-slate-400" /> Duplicate Node
                            </button>
                            <button
                              onClick={() => {
                                onAddChapter(chap.level + 1, originalIndex);
                                setMenuOpenId(null);
                              }}
                              className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700"
                            >
                              <CornerDownRight className="w-3 h-3 text-blue-500" /> Add Child Sub-Node
                            </button>
                            <div className="my-1 border-t border-slate-100"></div>

                            {/* Hierarchy Level Change */}
                            <div className="px-2.5 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              Change Level
                            </div>
                            <div className="grid grid-cols-4 gap-1 px-2 pb-1">
                              {[1, 2, 3, 4].map((lvl) => (
                                <button
                                  key={lvl}
                                  onClick={() => {
                                    onChangeLevel(chap.id, lvl);
                                    setMenuOpenId(null);
                                  }}
                                  className={`py-1 text-center font-semibold rounded text-xs ${
                                    chap.level === lvl 
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  L{lvl}
                                </button>
                              ))}
                            </div>

                            {/* Delete & Merge */}
                            {chapters.length > 1 && (
                              <>
                                <div className="my-1 border-t border-slate-100"></div>
                                {originalIndex > 0 && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Merge "${chap.title}" with the previous chapter?`)) {
                                        onMergeWithPrevious(chap.id);
                                      }
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700"
                                  >
                                    <Merge className="w-3 h-3" /> Merge with Previous
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${chap.title}"?`)) {
                                      onDeleteChapter(chap.id);
                                    }
                                    setMenuOpenId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete Node
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Headings Toggle Chevron (Structure Tab Only) */}
                      {activeTab === 'structure' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedHeadings(prev => {
                              const next = new Set(prev);
                              if (next.has(chap.id)) next.delete(chap.id);
                              else next.add(chap.id);
                              return next;
                            });
                          }}
                          className={`p-1 rounded transition-colors shrink-0 ${extractHeadings(chap.content).length === 0 ? 'opacity-20 cursor-default' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer'}`}
                          disabled={extractHeadings(chap.content).length === 0}
                        >
                          {expandedHeadings.has(chap.id) ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Headings extracted from chapter content */}
                  {((activeTab === 'outline' && isActive) || (activeTab === 'structure' && expandedHeadings.has(chap.id))) && extractHeadings(chap.content).length > 0 && (
                    <div className="flex flex-col mb-1.5 opacity-80 border-l-2 border-slate-100 ml-2">
                      {extractHeadings(chap.content).map((heading) => (
                        <div 
                          key={heading.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isActive) onSelectChapter(chap.id);
                            // Dispatch custom event to scroll
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('scroll-to-heading', { detail: { tag: heading.tag, text: heading.text } }));
                            }, 50);
                          }}
                          style={{ paddingLeft: `${indentPadding + 14}px` }}
                          className="flex items-center gap-2 py-0.5 pr-2 text-[10.5px] text-slate-500 hover:text-blue-600 cursor-pointer"
                          title={`Jump to ${heading.text}`}
                        >
                          <span className="font-mono text-[8px] bg-slate-100 border border-slate-200 px-1 rounded uppercase tracking-wider shrink-0 shadow-sm">{heading.tag}</span>
                          <span className="truncate">{heading.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
          })
        )}
      </div>

      {/* Chapter summary footer in left panel */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span>Unlimited Hierarchy</span>
        </div>
        <button
          onClick={() => onAddChapter(1)}
          className="text-blue-600 hover:underline font-medium"
        >
          + Add Root
        </button>
      </div>
    </aside>
  );
};
