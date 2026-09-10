/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DocumentProject, ChapterItem, Author, 
  Translator, PublisherInfo, DocumentCover, RightPanelTab 
} from './types';
import { 
  loadSavedProject, saveProjectToStorage, createNewProject, saveTempProjectToStorage, clearTempProject, getDirectSaveMode, setDirectSaveMode, 
  getStoredSnapshots, saveSnapshot,
  pickFileToOpen, pickFileToSave, writeToFileHandle, pickSaveAsFile
} from './utils/storage';
import { redistributeFootnotes, syncChapterFootnotes } from './utils/footnoteHelper';
import { TopMenuBar } from './components/TopMenuBar';
import { LeftChapterTree } from './components/LeftChapterTree';
import { MiddleEditor } from './components/MiddleEditor';
import { RightInspector } from './components/RightInspector';
import { FooterStatusBar } from './components/FooterStatusBar';
import { 
  OpenFileModal, InsertImageModal,
  NewTemplateModal, PublishingModal, ShortcutsModal,
  FindReplaceModal, UnsavedAlertModal
  } from './components/Modals';
import { 
  downloadFile, generateCompiledHtml, generateMarkdownManuscript, 
  generatePlainTextManuscript 
} from './utils/exportEngine';
import { ImportResult, parseImportedFile } from './utils/docxReader';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [project, setProject] = useState<DocumentProject | null>(null);

  // Discard any leftover temp projects when the app initially loads
  // This satisfies the "App Close Behavior" requirement
  useEffect(() => {
    clearTempProject();
  }, []);

  const [fileHandle, setFileHandle] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTab>('metadata');
  const [activeLeftTab, setActiveLeftTab] = useState<'outline' | 'structure'>('outline');
  const [checkedChapterIds, setCheckedChapterIds] = useState<string[]>([]);
  
  // Custom Resizable Panels State
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [findReplaceModal, setFindReplaceModal] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(150, Math.min(600, e.clientX));
        setLeftWidth(newWidth);
      }
      if (isDraggingRight) {
        const newWidth = Math.max(200, Math.min(800, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [snapshots, setSnapshots] = useState(() => getStoredSnapshots());
  
  // Modals state
  const [openModal, setOpenModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [newTemplateModal, setNewTemplateModal] = useState(false);
  const [publishingModal, setPublishingModal] = useState(false);
  const [shortcutsModal, setShortcutsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Safe Action state
  type PendingAction = 'new' | 'open' | 'close' | null;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [unsavedModal, setUnsavedModal] = useState(false);

  const executeSafeAction = (action: PendingAction) => {
    if (action === 'new') setNewTemplateModal(true);
    else if (action === 'open') setOpenModal(true);
    else if (action === 'close') {
      setProject(null);
      setFileHandle(null);
      setDirectSaveMode(false);
      setIsDirectSaveMode(false);
      setIsDirty(false);
      showToast('Closed document');
    }
  };

  const handleSafeRequest = (action: PendingAction) => {
    if (isDirty) {
      setPendingAction(action);
      setUnsavedModal(true);
    } else {
      executeSafeAction(action);
    }
  };
  const [isDirectSaveMode, setIsDirectSaveMode] = useState(getDirectSaveMode());
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Trigger manual save
  const handleSave = useCallback(async () => {
    if (!project) return;
    try {
      // 1. Save to Local Storage MAIN
      saveProjectToStorage(project);
      clearTempProject();
      
      // 2. Save to Native File System if linked
      if (fileHandle) {
        await writeToFileHandle(fileHandle, project);
        setIsDirty(false);
        showToast('Saved to Local Storage & Desktop File');
      } else {
        // Only prompt if they explicitly click File > Save AS (or if we want to force Native save here? The user said "Save a click korle age theke file na thakle folder select korbe...". Let's do that:
        const handle = await pickFileToSave(project);
        setFileHandle(handle);
        setIsDirty(false);
        showToast('Saved to Local Storage & new Desktop File');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // They cancelled the file picker, but it STILL saved to local storage!
        setIsDirty(false);
        showToast('Saved to Local Storage (Desktop save cancelled)');
      } else {
        console.error(e);
        showToast('Save failed');
      }
    }
  }, [project, fileHandle]);

  // Debounced auto-save to local offline storage
  useEffect(() => {
    if (isDirty && project) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          if (isDirectSaveMode) {
            saveProjectToStorage(project);
            setIsDirty(false); // Clean because it matches main
            // Optionally also autosave to native file if linked
            if (fileHandle) await writeToFileHandle(fileHandle, project);
          } else {
            saveTempProjectToStorage(project);
            // DO NOT set isDirty to false, because it hasn't been saved to MAIN yet.
          }
        } catch (e) {
          console.error('Autosave failed', e);
        }
      }, project.settings.autoSaveIntervalMs || 3000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [project, isDirty, isDirectSaveMode, fileHandle]);
  // Warn before closing if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your Draft. They will be lost if you leave without saving.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleToggleDirectSave = async (isOn: boolean) => {
    if (isOn && project) {
      let activeHandle = fileHandle;
      if (!activeHandle) {
        try {
          const { pickFileToSave, writeToFileHandle } = await import('./utils/storage');
          activeHandle = await pickFileToSave(project);
          if (!activeHandle) {
              showToast('Direct Save requires File System API support.');
              return; 
          }
          setFileHandle(activeHandle);
        } catch (e: any) {
          console.error('File picker error:', e);
          showToast('Direct Save requires picking a save location.');
          return;
        }
      }
      
      if (activeHandle) {
          try {
            const { writeToFileHandle } = await import('./utils/storage');
            await writeToFileHandle(activeHandle, project);
          } catch (e: any) {
            console.error('File write error:', e);
            showToast('Save cancelled or permission denied.');
            return;
          }
        }
        
        setDirectSaveMode(true);
        setIsDirectSaveMode(true);
        saveProjectToStorage(project);
        clearTempProject();
        setIsDirty(false);
        showToast('Direct Save enabled: Saved to Disk.');
    } else {
      setDirectSaveMode(false);
      setIsDirectSaveMode(false);
      showToast('Direct Save disabled: Auto-saving to Draft.');
    }
  };


  // Active chapter resolution
  const activeChapter = project?.chapters?.find(c => c.id === project.activeChapterId) || project?.chapters?.[0] || null;

  // ==========================================
  // CHAPTER HANDLERS
  // ==========================================
  const handleSelectChapter = (id: string) => {
    setProject(prev => ({ ...prev, activeChapterId: id }));
  };

  const handleToggleChapterCheck = (id: string, checked: boolean) => {
    if (!project) return;
    const idx = project.chapters.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    const parentLevel = project.chapters[idx].level;
    const idsToToggle = [id];
    
    for (let i = idx + 1; i < project.chapters.length; i++) {
      if (project.chapters[i].level <= parentLevel) break;
      idsToToggle.push(project.chapters[i].id);
    }
    
    setCheckedChapterIds(prev => {
      if (checked) {
        return Array.from(new Set([...prev, ...idsToToggle]));
      } else {
        return prev.filter(cId => !idsToToggle.includes(cId));
      }
    });
  };

  const handleMassAction = (action: 'justify' | 'align-left' | 'align-center' | 'align-right' | 'clear-format', ids: string[]) => {
    if (!project || ids.length === 0) return;
    
    setProject(prev => {
      if (!prev) return prev;
      const newChapters = prev.chapters.map(chap => {
        if (!ids.includes(chap.id)) return chap;
        
        let newContent = chap.content;
        
        if (action === 'clear-format') {
          newContent = newContent.replace(/\s*style="[^"]*"/gi, '');
          newContent = newContent.replace(/\s*class="[^"]*"/gi, '');
        } else {
          const alignValue = action === 'justify' ? 'justify' : action === 'align-center' ? 'center' : action === 'align-right' ? 'right' : 'left';
          
          const blockRegex = /<(p|h[1-6]|div)\b([^>]*)>/gi;
          newContent = newContent.replace(blockRegex, (match, tag, attrs) => {
            let cleanAttrs = attrs.replace(/text-align:\s*[a-z]+;?/gi, '');
            if (/style="/i.test(cleanAttrs)) {
              cleanAttrs = cleanAttrs.replace(/style="/i, `style="text-align: ${alignValue}; `);
            } else {
              cleanAttrs += ` style="text-align: ${alignValue};"`;
            }
            return `<${tag}${cleanAttrs}>`;
          });
        }
        
        return { ...chap, content: newContent };
      });
      return { ...prev, chapters: newChapters };
    });
    setIsDirty(true);
    showToast(`Applied to ${ids.length} chapters`);
  };

  const handleUpdateChapterContent = useCallback((id: string, content: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, content, updatedAt: new Date().toISOString() } : c)
    }));
    setIsDirty(true);
  }, []);

  const handleUpdateChapterTitle = (id: string, title: string) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c)
    }));
    setIsDirty(true);
  };

  const handleToggleChapterTitle = (id: string, hideTitle: boolean) => {
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, hideTitle, updatedAt: new Date().toISOString() } : c)
    }));
    setIsDirty(true);
  };

  const handleAddChapter = (level: number = 1, insertAfterIndex?: number) => {
    const newId = `chap-${Date.now()}`;
    const levelLabel = level === 0 ? 'Volume' : level === 1 ? 'Chapter' : level === 2 ? 'Subchapter' : `Level ${level} Section`;
    const defaultTitle = `${levelLabel} ${project.chapters.filter(c => c.level === level).length + 1}`;
    
    const newChap: ChapterItem = {
      id: newId,
      title: defaultTitle,
      content: level === 0 ? '' : `<p>Start writing this section here...</p>`,
      level,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    };

    const targetIdx = insertAfterIndex !== undefined 
      ? insertAfterIndex 
      : project.chapters.findIndex(c => c.id === project.activeChapterId);

    let newChapters: ChapterItem[];
    if (targetIdx >= 0) {
      newChapters = [
        ...project.chapters.slice(0, targetIdx + 1),
        newChap,
        ...project.chapters.slice(targetIdx + 1)
      ];
    } else {
      newChapters = [...project.chapters, newChap];
    }

    setProject(prev => ({
      ...prev,
      chapters: newChapters,
      activeChapterId: newId
    }));
    setIsDirty(true);
    showToast(`Added ${defaultTitle}`);
  };

  const handleDeleteChapter = (id: string) => {
    if (project.chapters.length <= 1) {
      alert('A document must have at least one chapter.');
      return;
    }
    const filtered = project.chapters.filter(c => c.id !== id);
    const nextActive = filtered[0]?.id || '';
    setProject(prev => ({
      ...prev,
      chapters: filtered,
      activeChapterId: prev.activeChapterId === id ? nextActive : prev.activeChapterId
    }));
    setIsDirty(true);
    showToast('Chapter deleted');
  };

  const handleMergeWithPrevious = (id: string) => {
    setProject(prev => {
      const idx = prev.chapters.findIndex(c => c.id === id);
      if (idx <= 0) return prev; // Cannot merge the first chapter
      
      const currentChap = prev.chapters[idx];
      const prevChap = prev.chapters[idx - 1];
      
      const combinedRawHtml = `${prevChap.content}<h1>${currentChap.title || 'Untitled Node'}</h1>${currentChap.content}`;
      const [cleanHtml] = redistributeFootnotes([combinedRawHtml]);

      const newChapters = [...prev.chapters];
      newChapters[idx - 1] = {
        ...prevChap,
        content: cleanHtml,
        updatedAt: new Date().toISOString()
      };
      
      newChapters.splice(idx, 1);
      
      return {
        ...prev,
        chapters: newChapters,
        activeChapterId: prev.activeChapterId === id ? prevChap.id : prev.activeChapterId
      };
    });
    setIsDirty(true);
    showToast('Merged with previous chapter');
  };

  const handleDuplicateChapter = (id: string) => {
    const target = project.chapters.find(c => c.id === id);
    if (!target) return;
    const newId = `chap-${Date.now()}`;
    const clone: ChapterItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      updatedAt: new Date().toISOString()
    };
    const targetIdx = project.chapters.findIndex(c => c.id === id);
    const updated = [
      ...project.chapters.slice(0, targetIdx + 1),
      clone,
      ...project.chapters.slice(targetIdx + 1)
    ];
    setProject(prev => ({ ...prev, chapters: updated, activeChapterId: newId }));
    setIsDirty(true);
    showToast('Duplicated node');
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === project.chapters.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...project.chapters];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setProject(prev => ({ ...prev, chapters: updated }));
    setIsDirty(true);
  };

  const handleChangeLevel = (id: string, newLevel: number) => {
    const validLevel = Math.max(1, newLevel);
    setProject(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => c.id === id ? { ...c, level: validLevel } : c)
    }));
    setIsDirty(true);
  };

  // Drag and Drop Reordering Handler
  const handleReorderChapter = (sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    if (sourceId === targetId) return;

    setProject(prev => {
      const sourceIndex = prev.chapters.findIndex(c => c.id === sourceId);
      const targetIndex = prev.chapters.findIndex(c => c.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const sourceChap = { ...prev.chapters[sourceIndex] };
      const targetChap = prev.chapters[targetIndex];

      // If dropped 'inside', nest source chapter under target (level = target.level + 1)
      if (position === 'inside') {
        sourceChap.level = targetChap.level + 1;
      }

      // Remove source from current position
      const chaptersWithoutSource = prev.chapters.filter(c => c.id !== sourceId);
      
      // Calculate new insertion index
      const newTargetIndex = chaptersWithoutSource.findIndex(c => c.id === targetId);
      const insertAt = position === 'before' ? newTargetIndex : newTargetIndex + 1;

      chaptersWithoutSource.splice(insertAt, 0, sourceChap);

      return {
        ...prev,
        chapters: chaptersWithoutSource,
        activeChapterId: sourceId
      };
    });
    setIsDirty(true);
    showToast('Outline reordered');
  };

  // ==========================================
  // METADATA & RIGHT PANEL HANDLERS
  // ==========================================
  
  const handleUpdateMetadata = (field: string, value: string) => {
    setProject(prev => {
      if (!prev) return prev;
      let newChapters = prev.chapters;
      
      // If language changes, we MUST re-synchronize the footnote numbers across ALL chapters globally
      if (field === 'language') {
        newChapters = prev.chapters.map(c => ({
          ...c,
          content: syncChapterFootnotes(c.content, value)
        }));
      }

      return { 
        ...prev, 
        metadata: { ...prev.metadata, [field]: value },
        chapters: newChapters
      };
    });
    setIsDirty(true);
  };
const handleUpdateCover = (updated: Partial<import('./types').DocumentCover>) => { setProject(prev => prev ? { ...prev, metadata: { ...prev.metadata, cover: { ...prev.metadata.cover, ...updated } } } : null); setIsDirty(true); };

  // ==========================================
  // FILE & EXPORT OPERATIONS
  // ==========================================
    const handleSaveAs = async () => {
    if (!project) return;
    const handle = await pickSaveAsFile(project);
    if (!handle) return; // User cancelled or not supported

    try {
      const filename = handle.name.toLowerCase();
      let blob: Blob;

      if (filename.endsWith('.epub')) {
        const { generateEpubBlob } = await import('./utils/epubExporter');
        blob = await generateEpubBlob(project);
      } else if (filename.endsWith('.html')) {
        blob = new Blob([generateCompiledHtml(project)], { type: 'text/html' });
      } else if (filename.endsWith('.md')) {
        blob = new Blob([generateMarkdownManuscript(project)], { type: 'text/markdown' });
      } else if (filename.endsWith('.txt')) {
        blob = new Blob([generatePlainTextManuscript(project)], { type: 'text/plain' });
      } else {
        // Default to symphony JSON
        blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      }

      // Write to the handle
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      showToast(`Saved successfully to ${handle.name}`);

      // If they saved as symphony, we update the active workspace file handle
      if (filename.endsWith('.symphony')) {
        setFileHandle(handle);
        setIsDirty(false);
      }
    } catch (e) {
      console.error('Save As Failed:', e);
      showToast('Save As Failed');
    }
  };

  const handlePrintDirect = () => {
    if (!project) return;
    const htmlBundle = generateCompiledHtml(project);
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

  const handleClose = () => { handleSafeRequest('close'); };

  const handleImportResult = (result: ImportResult) => {
    if (result.fullProject) {
      setProject(result.fullProject);
    } else {
      setProject(prev => {
        const baseProj = prev || createNewProject('blank');
        return {
          ...baseProj,
          metadata: { ...baseProj.metadata, title: result.title },
          chapters: result.chapters,
          activeChapterId: result.chapters[0]?.id || baseProj.activeChapterId
        };
      });
    }
    setFileHandle(null);
      setDirectSaveMode(false);
      setIsDirectSaveMode(false);
      setIsDirty(true);
      showToast(`Imported ${result.chapters.length} chapter(s) from ${result.importedFormat.toUpperCase()}`);
  };

  const handleReplace = (find: string, replace: string, all: boolean) => {
    if (!project) return;
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let replaceCount = 0;

    const newChapters = project.chapters.map(chap => {
      if (!all && chap.id !== project.activeChapterId) return chap;
      
      const newContent = chap.content.replace(regex, (match) => {
        replaceCount++;
        return replace;
      });
      
      return { ...chap, content: newContent };
    });

    setProject({ ...project, chapters: newChapters });
    setIsDirty(true);
    showToast(`Replaced ${replaceCount} occurrence(s)`);
  };

  const handleFindNextGlobal = (findStr: string) => {
    if (!project) return;
    
    // Check if the current chapter has more occurrences first
    const foundLocal = window.find(findStr, false, false, false, false, false, false);
    if (foundLocal) return;

    // If not found in the current chapter, search subsequent chapters
    const activeIdx = project.chapters.findIndex(c => c.id === project.activeChapterId);
    if (activeIdx === -1) return;

    let foundChapId = null;
    const searchStr = findStr.toLowerCase();
    
    for (let i = activeIdx + 1; i < project.chapters.length; i++) {
      const text = project.chapters[i].content.toLowerCase();
      if (text.includes(searchStr)) {
        foundChapId = project.chapters[i].id;
        break;
      }
    }

    // Wrap around
    if (!foundChapId) {
      for (let i = 0; i <= activeIdx; i++) {
        const text = project.chapters[i].content.toLowerCase();
        if (text.includes(searchStr)) {
          foundChapId = project.chapters[i].id;
          break;
        }
      }
    }

    if (foundChapId) {
      if (foundChapId === project.activeChapterId) {
         window.find(findStr, false, false, true, false, false, false);
      } else {
        setProject(prev => ({ ...prev!, activeChapterId: foundChapId }));
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
          window.find(findStr, false, false, false, false, false, false);
        }, 100);
      }
    } else {
      alert(`No matches found for "${findStr}" in the entire book.`);
    }
  };

  const handleSelectTemplate = (template: 'blank' | 'monograph' | 'novel' | 'academic') => {
    const newProj = createNewProject(template);
    setProject(newProj);
    setFileHandle(null);
      setDirectSaveMode(false);
      setIsDirectSaveMode(false);
      setIsDirty(true);
      showToast(`Created new ${template} project`);
  };

  const handleSaveSnapshot = (name?: string) => {
    const newSnap = saveSnapshot(project, name);
    setSnapshots(getStoredSnapshots());
    showToast(`Checkpoint created: ${newSnap.name}`);
  };

  const handleRestoreSnapshot = (dataStr: string) => {
    try {
      const parsed = JSON.parse(dataStr);
      setProject(parsed);
      setIsDirty(false);
      saveProjectToStorage(parsed);
      showToast('Restored revision snapshot');
    } catch (e) {
      alert('Failed to parse snapshot data.');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          handleSafeRequest('open');
        }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleSafeRequest('new');
        }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPublishingModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindReplaceModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  
  const [dragActive, setDragActive] = useState(false);

  const handleUnifiedOpen = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Supported Documents',
              accept: {
                'application/json': ['.symphony', '.json'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'application/epub+zip': ['.epub'],
                'text/plain': ['.txt']
              }
            }
          ],
          multiple: false
        });
        const file = await handle.getFile();
        handleUnifiedFile(file, handle);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.symphony,.json,.docx,.epub,.txt';
        input.onchange = (e: any) => {
          if (e.target.files && e.target.files[0]) {
            handleUnifiedFile(e.target.files[0]);
          }
        };
        input.click();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') showToast('Failed to open file');
    }
  };

  const handleUnifiedFile = async (file: File, handle?: any) => {
    try {
      showToast('Parsing file...');
      const result = await parseImportedFile(file);
      
      if (result.importedFormat === 'symphony' || result.importedFormat === 'json') {
        if (handle) setFileHandle(handle);
        setProject(result.fullProject || createNewProject('Imported Project'));
        setIsDirty(false);
        showToast('Opened Symphony Project');
      } else {
        // Imported DOCX, EPUB, TXT - generate new project and DO NOT save handle (prevent overwriting original file)
        const newProj = createNewProject('blank');
          newProj.metadata.title = result.title || 'Untitled Document';
        newProj.chapters = result.chapters;
        setFileHandle(null);
          setDirectSaveMode(false);
          setIsDirectSaveMode(false);
          setProject(newProj);
          setIsDirty(true);
          showToast(`Imported ${result.importedFormat.toUpperCase()} successfully`);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to import file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Try to get handle if possible
      let handle = null;
      if (e.dataTransfer.items && e.dataTransfer.items[0]) {
        const item = e.dataTransfer.items[0];
        if (item.getAsFileSystemHandle) {
          handle = await item.getAsFileSystemHandle();
        } else if (item.webkitGetAsEntry) {
          // not full handle, ignore
        }
      }
      
      handleUnifiedFile(file, handle);
    }
  };

  if (!project) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-sans text-slate-900 relative">
        {toastMessage && (
          <div className="fixed bottom-10 right-6 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 z-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
        
        

        <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center relative z-10">
          <div className="w-32 h-32 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden bg-transparent p-2">
            <img src="./logo.png" alt="Symphony Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight" style={{ color: "var(--brand-color, #1e293b)" }}>Symphony</h1>
          <p className="text-slate-500 mb-8 text-sm">Create, edit, and export books seamlessly.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => handleSafeRequest('new')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Create New Project
            </button>
            
            <button
              onClick={handleUnifiedOpen}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="m3 15 3-3 3 3"/><path d="M6 12v10"/></svg>
              Open/Import Document (Symphony, EPUB, DOCX, TXT)
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
             <div 
               className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-400'}`}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
               onClick={handleUnifiedOpen}
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
               <span className="text-sm font-medium">Drag & drop files here</span>
               <span className="text-xs mt-1 opacity-70">Supports .symphony, .docx, .epub, .txt</span>
             </div>
          </div>
        </div>

        <NewTemplateModal
          isOpen={newTemplateModal}
          onClose={() => setNewTemplateModal(false)}
          onSelectTemplate={handleSelectTemplate}
        />
        <OpenFileModal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          onImportComplete={handleImportResult}
        />
      </div>
    );
  }


  const handleSplitChapter = (id: string, firstHalf: string, secondHalf: string) => {
    const targetIdx = project.chapters.findIndex(c => c.id === id);
    if (targetIdx === -1) return;
    
    const target = project.chapters[targetIdx];
    const newId = `chap-${Date.now()}`;
    const newChap: ChapterItem = {
      id: newId,
      title: `${target.title} (Cont.)`,
      content: secondHalf,
      level: target.level,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    };
    
    const updatedChapters = [...project.chapters];
    updatedChapters[targetIdx] = { ...target, content: firstHalf, updatedAt: new Date().toISOString() };
    updatedChapters.splice(targetIdx + 1, 0, newChap);
    
    setProject(prev => ({ ...prev!, chapters: updatedChapters, activeChapterId: newId }));
    setIsDirty(true);
    showToast('Chapter split successfully');
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col overflow-hidden bg-white font-sans text-slate-900">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-10 right-6 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Unified Top Menu Ribbon */}
      <TopMenuBar
          isDirty={isDirty}
          isDirectSaveMode={isDirectSaveMode}
          onToggleDirectSave={handleToggleDirectSave}
          project={project}
        onNew={() => handleSafeRequest('new')}
        onOpen={() => handleSafeRequest('open')}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
                  onClose={handleClose}
        onPublish={() => setPublishingModal(true)}
        onPrint={handlePrintDirect}
        onInsertImage={() => setImageModal(true)}
        onInsertTable={() => {}}
        onInsertRule={() => {}}
        onInsertSymbol={(sym) => {
          if (activeChapter) {
            handleUpdateChapterContent(activeChapter.id, `${activeChapter.content}${sym}`);
          }
        }}
        onUndo={() => document.execCommand('undo')}
        onRedo={() => document.execCommand('redo')}
        onFindReplace={() => setFindReplaceModal(true)}
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(prev => !prev)}
        onSelectRightTab={(tab) => {
          setActiveRightTab(tab);
          setRightPanelOpen(true);
        }}
        onToggleHtmlMode={() => setIsHtmlMode(prev => !prev)}
        isHtmlMode={isHtmlMode}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onShowShortcuts={() => setShortcutsModal(true)}
        onShowAbout={() => alert('Symphony v1.0\nMinimalist offline-first manuscript & document editor.')}
      />

      {/* 3. Three-Panel Layout: Left + Middle + Right */}
      <div className="flex-1 flex overflow-hidden relative border-t border-slate-200">
        {/* Left Side: Chapter & Subchapter Multi-level Tree */}
        {leftPanelOpen && (
          <>
            <div style={{ width: leftWidth, minWidth: leftWidth }} className="flex h-full shrink-0">
              <LeftChapterTree
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                language={project.metadata.language}
                activeTab={activeLeftTab}
                onTabChange={setActiveLeftTab}
                checkedChapterIds={checkedChapterIds}
                onToggleChapterCheck={handleToggleChapterCheck}
                onSelectChapter={handleSelectChapter}
                onAddChapter={handleAddChapter}
                onDeleteChapter={handleDeleteChapter}
                onMergeWithPrevious={handleMergeWithPrevious}
                onRenameChapter={handleUpdateChapterTitle}
                onDuplicateChapter={handleDuplicateChapter}
                onMoveChapter={handleMoveChapter}
                onChangeLevel={handleChangeLevel}
                onReorderChapter={handleReorderChapter}
              />
            </div>
            <div 
              onMouseDown={() => setIsDraggingLeft(true)}
              className="w-1.5 bg-slate-100 hover:bg-blue-400 active:bg-blue-600 transition cursor-col-resize flex flex-col justify-center items-center z-10 shrink-0 border-x border-slate-200/50"
            >
              <div className="w-0.5 h-6 bg-slate-300 rounded-full" />
            </div>
          </>
        )}

        {/* Middle: Document Editor (Visual/HTML) */}
        <div className="flex-1 flex flex-col h-full bg-[#f4f7f6] min-w-0 sm:min-w-[150px] overflow-hidden">
          {activeChapter && (
            <MiddleEditor
              chapter={activeChapter}
              settings={project.settings}
              language={project.metadata.language}
              isHtmlMode={isHtmlMode}
              activeLeftTab={activeLeftTab}
              checkedChapterIds={checkedChapterIds}
              chapters={project.chapters}
              onMassAction={handleMassAction}
              onUpdateContent={handleUpdateChapterContent}
              onUpdateTitle={handleUpdateChapterTitle}
              onToggleTitle={handleToggleChapterTitle}
              onInsertImageClick={() => setImageModal(true)}
              onSplitChapter={handleSplitChapter}
            />
          )}
        </div>

        {/* Right Side: Metadata, Authors, Cover, Snapshots */}
        {rightPanelOpen && (
          <>
            <div 
              onMouseDown={() => setIsDraggingRight(true)}
              className="w-1.5 bg-slate-100 hover:bg-blue-400 active:bg-blue-600 transition cursor-col-resize flex flex-col justify-center items-center z-10 shrink-0 border-x border-slate-200/50"
            >
              <div className="w-0.5 h-6 bg-slate-300 rounded-full" />
            </div>
            <div style={{ width: rightWidth, minWidth: 'min-content' }} className="flex h-full shrink sm:shrink-0 overflow-x-hidden">
              <RightInspector
                metadata={project.metadata}
                settings={project.settings}
                activeTab={activeRightTab}
                chapters={project.chapters}
                activeChapterId={project.activeChapterId}
                onTabChange={setActiveRightTab}
                onUpdateMetadata={handleUpdateMetadata}
                
                onUpdateCover={handleUpdateCover}
                onUpdateSettings={(updated) => setProject(prev => ({ ...prev, settings: { ...prev.settings, ...updated } }))}
                onSaveSnapshot={handleSaveSnapshot}
                snapshots={snapshots}
                onRestoreSnapshot={handleRestoreSnapshot}
              />
            </div>
          </>
        )}
      </div>

      {/* 4. Footer Status Bar */}
      <FooterStatusBar
        project={project}
        activeChapter={activeChapter}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        isDirty={isDirty}
      />

      {/* Modals & Dialogs */}
      <OpenFileModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onImportComplete={handleImportResult}
      />

      <InsertImageModal
        isOpen={imageModal}
        onClose={() => setImageModal(false)}
        onInsertImage={(imgHtml) => {
          if (activeChapter) {
            window.dispatchEvent(new CustomEvent('insert-html-snippet', { detail: imgHtml }));
          }
        }}
      />

      <NewTemplateModal
        isOpen={newTemplateModal}
        onClose={() => setNewTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <PublishingModal
        isOpen={publishingModal}
        onClose={() => setPublishingModal(false)}
        project={project}
      />

      
        <ShortcutsModal
          isOpen={shortcutsModal}
          onClose={() => setShortcutsModal(false)}
        />
        
        <UnsavedAlertModal
          isOpen={unsavedModal}
          onClose={() => {
            setUnsavedModal(false);
            setPendingAction(null);
          }}
          onSave={async () => {
            setUnsavedModal(false);
            await handleSave();
            if (pendingAction) executeSafeAction(pendingAction);
            setPendingAction(null);
          }}
          onDiscard={() => {
            setUnsavedModal(false);
            if (pendingAction) executeSafeAction(pendingAction);
            setPendingAction(null);
          }}
        />
      
      <FindReplaceModal 
        isOpen={findReplaceModal} 
        onClose={() => setFindReplaceModal(false)}
        onReplace={handleReplace}
        onFindNextGlobal={handleFindNextGlobal}
      />
        
      

    </div>
    </ErrorBoundary>
  );
}
