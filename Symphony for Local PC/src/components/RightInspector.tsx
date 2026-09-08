import { TagInput } from './TagInput';
import React, { useState } from 'react';
import { 
  SlidersHorizontal, UserPlus, BookOpen, Download, 
  History, Plus, Trash2, Globe, Shield, Sparkles, Image as ImageIcon,
  Building, Check, Copy, ExternalLink, RefreshCw, Palette, Eye,
  Calendar, Hash, Award, HelpCircle
} from 'lucide-react';
import { 
  ProjectMetadata, Author, Translator, PublisherInfo, 
  DocumentCover, RightPanelTab, DocumentProject 
} from '../types';

interface RightInspectorProps {
  metadata: import('../types').ProjectMetadata;
  settings: import('../types').DocumentProject['settings'];
  activeTab: import('../types').RightPanelTab;
  chapters: import('../types').ChapterItem[];
  activeChapterId: string;
  onTabChange: (tab: import('../types').RightPanelTab) => void;
  onUpdateMetadata: (field: string, value: string) => void;
  onUpdateCover: (updated: Partial<import('../types').DocumentCover>) => void;
  onUpdateSettings: (updated: Partial<import('../types').DocumentProject['settings']>) => void;
  onSaveSnapshot: (name?: string) => void;
  snapshots: { id: string; name: string; timestamp: string; wordCount: number; data: string }[];
  onRestoreSnapshot: (data: string) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  metadata,
  settings,
  activeTab,
  chapters,
  activeChapterId,
  onTabChange,
  onUpdateMetadata,
  
  onUpdateCover,
  onUpdateSettings,
  onSaveSnapshot,
  snapshots,
  onRestoreSnapshot
}) => {
  const [langInput, setLangInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [snapshotNameInput, setSnapshotNameInput] = useState('');

  // Handle language tag adding
  const handleAddLanguage = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (langInput.trim()) {
      const current = metadata.additionalLanguages || [];
      if (!current.includes(langInput.trim())) {
        onUpdateMetadata({ additionalLanguages: [...current, langInput.trim()] });
      }
      setLangInput('');
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    const current = metadata.additionalLanguages || [];
    onUpdateMetadata({ additionalLanguages: current.filter(l => l !== lang) });
  };

  // Handle keyword tag adding
  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const current = metadata.keywords || [];
      if (!current.includes(keywordInput.trim())) {
        onUpdateMetadata({ keywords: [...current, keywordInput.trim()] });
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    const current = metadata.keywords || [];
    onUpdateMetadata({ keywords: current.filter(k => k !== kw) });
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        onUpdateCover({ imageUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside 
      id="right-inspector-panel"
      className="w-full bg-white border-l border-slate-200 flex flex-col h-full select-none text-slate-800"
    >
      {/* Sub-Window / Tab Switcher Ribbon */}
      <div className="bg-[#f8fafc] p-1 border-b border-slate-200 grid grid-cols-4 gap-1 text-xs">
        <button
          onClick={() => onTabChange('metadata')}
          title="Document & Publication Metadata"
          className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'metadata'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-tight">Meta</span>
        </button>

        <button
          onClick={() => onTabChange('cover')}
          title="Book Cover Designer"
          className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'cover'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-tight">Cover</span>
        </button>

        <button
          onClick={() => onTabChange('preview')}
          title="Live Book Preview"
          className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'preview'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-tight">Preview</span>
        </button>

        <button
          onClick={() => onTabChange('snapshots')}
          title="Offline Snapshots & Revisions"
          className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === 'snapshots'
              ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-slate-200'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-tight">History</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
        {/* ========================================================================= */}
        {/* 1. METADATA WINDOW */}
        {/* ========================================================================= */}
        {activeTab === 'metadata' && (
  <div className="space-y-4 animate-in fade-in duration-150">
    <div>
      <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
        <SlidersHorizontal className="w-4 h-4 text-blue-600" />
        Metadata
      </h3>
      <p className="text-[10px] text-slate-500 mb-4">Core publishing details</p>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Book Title</label>
        <input type="text" placeholder="Leave blank to use Document Name" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.title || ''} onChange={e => onUpdateMetadata('title', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Subtitle</label>
        <input type="text" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.subtitle || ''} onChange={e => onUpdateMetadata('subtitle', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Author(s)</label>
        <TagInput placeholder="Type author and press ';' or Enter" value={metadata.authors || ''} onChange={(val: string) => onUpdateMetadata('authors', val)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Translator(s)</label>
        <TagInput placeholder="Type translator and press ';' or Enter" value={metadata.translators || ''} onChange={(val: string) => onUpdateMetadata('translators', val)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Book Description</label>
        <textarea className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" rows={4} value={metadata.description || ''} onChange={e => onUpdateMetadata('description', e.target.value)}></textarea>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Language</label>
        <select className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.language || ''} onChange={e => onUpdateMetadata('language', e.target.value)}>
          <option value="">Select...</option>
          <option value="en">English</option>
          <option value="bn">Bengali / বাংলা</option>
          <option value="ar">Arabic / العربية</option>
          <option value="fr">French / Français</option>
          <option value="es">Spanish / Español</option>
          <option value="pt">Portuguese / Português</option>
          <option value="hi">Hindi / हिन्दी</option>
          <option value="ur">Urdu / اردو</option>
          <option value="id">Indonesian</option>
          <option value="ru">Russian / Русский</option>
          <option value="other">Other</option>
        </select>
        {metadata.language === 'other' && (
          <div className="mt-2">
            <input type="text" placeholder="Type language name..." className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.customLanguage || ''} onChange={e => onUpdateMetadata('customLanguage', e.target.value)} />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Genre / Tags</label>
        <TagInput placeholder="Type tag and press ';' or Enter" value={metadata.genreTags || ''} onChange={(val: string) => onUpdateMetadata('genreTags', val)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Publication Date</label>
        <input type="text" placeholder="e.g. 2026, August 2026, 26 Aug 2026" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.publicationDate || ''} onChange={e => onUpdateMetadata('publicationDate', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Publisher Name</label>
        <input type="text" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.publisherName || ''} onChange={e => onUpdateMetadata('publisherName', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">ISBN</label>
        <input type="text" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.isbn || ''} onChange={e => onUpdateMetadata('isbn', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Copyright Info</label>
        <input type="text" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" value={metadata.copyrightInfo || ''} onChange={e => onUpdateMetadata('copyrightInfo', e.target.value)} />
      </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">License</label>
          <input type="text" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" placeholder="e.g. CC BY-NC-ND 4.0" value={metadata.license || ''} onChange={e => onUpdateMetadata('license', e.target.value)} />
        </div>
    </div>
  </div>
)}

{activeTab === 'cover' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-purple-600" />
                Book Cover Designer
              </h3>
              <p className="text-[11px] text-slate-500">
                Design or upload a cover with typography layout.
              </p>
            </div>

            {/* Live Cover Preview Mockup */}
            <div className="flex justify-center p-3 bg-slate-50 rounded-md border border-slate-200">
              <div 
                style={{
                  backgroundColor: metadata.cover?.backgroundColor || '#1e293b',
                  color: metadata.cover?.textColor || '#ffffff',
                  backgroundImage: metadata.cover?.imageUrl ? `url(${metadata.cover.imageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                className="w-[141px] h-[200px] rounded shadow-md p-4 flex flex-col justify-between text-center relative overflow-hidden transition-all border border-slate-300"
              >
                {/* Subtle spine shadow overlay */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />

                {!metadata.cover?.imageUrl && (
                  <>
                    <div className="relative z-10">
                      <h4 className="font-bold text-sm leading-relaxed line-clamp-3 font-serif pt-1">
                        {metadata.title || 'Untitled Document'}
                      </h4>
                      {metadata.cover?.showSubtitle && metadata.subtitle && (
                        <p className="text-[10px] opacity-85 line-clamp-2 italic font-sans mt-1">
                          {metadata.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 relative z-10 pt-4">
                      {(() => {
                        const authorsList = metadata.authors ? metadata.authors.split(';').map(a => a.trim()).filter(Boolean) : ['Author Name'];
                        const hasLongName = authorsList.some(a => a.length > 18);
                        const fontSize = (authorsList.length > 2 || hasLongName) ? '9px' : '11px';
                        const lineHeight = (authorsList.length > 2 || hasLongName) ? '12px' : '16px';
                        
                        return (
                          <div className="font-semibold" style={{ fontSize, lineHeight }}>
                            {authorsList.map((author, idx) => (
                              <div key={idx}>{author}</div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
                
              </div>
            </div>

            
            {/* Custom Cover Upload */}
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <label className="block text-[10px] font-semibold text-slate-700 mb-1.5">Custom Background Image</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  className="flex-1 w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                />
                {metadata.cover?.imageUrl && (
                  <button
                    onClick={() => onUpdateCover({ imageUrl: undefined })}
                    className="text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors whitespace-nowrap border border-red-200/50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Color pickers */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={metadata.cover?.backgroundColor || '#1e293b'}
                    onChange={(e) => onUpdateCover({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-600">
                    {metadata.cover?.backgroundColor || '#1e293b'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={metadata.cover?.textColor || '#ffffff'}
                    onChange={(e) => onUpdateCover({ textColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-600">
                    {metadata.cover?.textColor || '#ffffff'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cover Presets */}
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Theme Palette Presets</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { name: 'Midnight', bg: '#0f172a', text: '#f8fafc' },
                  { name: 'Burgundy', bg: '#450a0a', text: '#fef2f2' },
                  { name: 'Emerald', bg: '#064e3b', text: '#ecfdf5' },
                  { name: 'Parchment', bg: '#fef3c7', text: '#78350f' },
                  { name: 'Ocean', bg: '#0c4a6e', text: '#e0f2fe' },
                  { name: 'Plum', bg: '#4a044e', text: '#fae8ff' },
                  { name: 'Forest', bg: '#14532d', text: '#dcfce7' },
                  { name: 'Sunset', bg: '#7c2d12', text: '#ffedd5' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => onUpdateCover({ backgroundColor: preset.bg, textColor: preset.text })}
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                    className="p-1.5 rounded text-[10px] font-semibold text-center border border-slate-300/40 shadow-xs"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SNAPSHOTS & REVISIONS */}
        {/* ========================================================================= */}
        {activeTab === 'snapshots' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-emerald-600" />
                Local Snapshots &amp; Versions
              </h3>
              <p className="text-[11px] text-slate-500">
                Offline checkpoints stored locally in browser storage.
              </p>
            </div>

            {/* Create manual snapshot */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={snapshotNameInput}
                onChange={(e) => setSnapshotNameInput(e.target.value)}
                placeholder="Checkpoint label (optional)..."
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
              <button
                onClick={() => {
                  onSaveSnapshot(snapshotNameInput.trim() || undefined);
                  setSnapshotNameInput('');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3 h-3" /> Save
              </button>
            </div>

            {/* Snapshots List */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-semibold text-slate-700">
                Previous Revisions ({snapshots.length})
              </div>

              {snapshots.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded border border-slate-200 text-slate-400">
                  No snapshots recorded yet. Click Save above to create one.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {snap.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(snap.timestamp).toLocaleDateString()} {new Date(snap.timestamp).toLocaleTimeString()} • {snap.wordCount} words
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Restore checkpoint "${snap.name}"? Current unsaved work will be replaced.`)) {
                          onRestoreSnapshot(snap.data);
                        }
                      }}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[11px] font-medium text-slate-700"
                    >
                      Rollback
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 4. PREVIEW WINDOW */}
        {/* ========================================================================= */}
        {activeTab === 'preview' && (
          <FullBookPreview chapters={chapters} activeChapterId={activeChapterId} />
        )}
      </div>
    </aside>
  );
};

const FullBookPreview: React.FC<{ chapters: import('../types').ChapterItem[]; activeChapterId: string }> = ({ chapters, activeChapterId }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (activeChapterId && containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-chapter-id="${activeChapterId}"]`);
      if (activeEl) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [activeChapterId]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150" ref={containerRef}>
      <div>
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Live Book Preview
        </h3>
        <p className="text-[11px] text-slate-500 mb-4">
          A continuous scroll view of your entire manuscript.
        </p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded p-4 doc-preview-canvas text-xs leading-relaxed text-slate-800" dir="auto">
        {chapters.map(ch => (
          <div 
            key={ch.id} 
            data-chapter-id={ch.id}
            className={`mb-8 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0 ${ch.id === activeChapterId ? 'bg-blue-50/40 -mx-4 px-4 py-2 rounded ring-1 ring-blue-100' : ''}`}
          >
            {!ch.hideTitle && (
              <h1 className="text-sm font-bold mb-3 text-slate-900 border-b border-slate-100 pb-1" dir="auto">{ch.title}</h1>
            )}
            <div dangerouslySetInnerHTML={{ __html: ch.content }} className="space-y-2" dir="auto" />
          </div>
        ))}
      </div>
    </div>
  );
};

