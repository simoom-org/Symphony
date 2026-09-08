import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Heading1, Heading2, 
  Heading3, Quote, Code, Image as ImageIcon, Table, 
  Minus, RemoveFormatting, Eye, EyeOff, Columns, Sparkles, Undo2, Redo2,
  Type, Check, Scissors
} from 'lucide-react';
import { ChapterItem, DocumentProject } from '../types';
import { redistributeFootnotes } from '../utils/footnoteHelper';

const beautifyHTML = (html: string) => {
  if (!html) return '';
  const blockTags = [
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 
    'hr', 'blockquote', 'article', 'section', 'header', 'footer'
  ];
  
  let formatted = html;
  blockTags.forEach(tag => {
    const openRegex = new RegExp(`(<${tag}(?:\\s[^>]*)?>)`, 'gi');
    const closeRegex = new RegExp(`(</${tag}>)`, 'gi');
    formatted = formatted.replace(openRegex, '\n$1');
    formatted = formatted.replace(closeRegex, '$1\n');
  });

  return formatted
    .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
    .trim();
};

interface MiddleEditorProps {
  chapter: ChapterItem;
  settings: DocumentProject['settings'];
  language: string;
  isHtmlMode: boolean;
  activeLeftTab?: 'outline' | 'structure';
  checkedChapterIds?: string[];
  chapters?: ChapterItem[];
  onMassAction?: (action: 'justify' | 'align-left' | 'align-center' | 'align-right' | 'clear-format', ids: string[]) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onToggleTitle?: (id: string, hide: boolean) => void;
  onInsertImageClick: () => void;
  onSplitChapter?: (id: string, firstHalf: string, secondHalf: string) => void;
}

export const MiddleEditor: React.FC<MiddleEditorProps> = ({
  chapter,
  settings,
  language,
  isHtmlMode,
  activeLeftTab = 'outline',
  checkedChapterIds = [],
  chapters = [],
  onMassAction = () => {},
  onUpdateContent,
  onUpdateTitle,
  onToggleTitle,
  onInsertImageClick,
  onSplitChapter
}) => {
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState(chapter.content);
  const [editorMode, setEditorMode] = useState<'visual' | 'html' | 'split'>(isHtmlMode ? 'html' : 'visual');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    dirRtl: false,
    dirLtr: false,
    h1: false,
    h2: false,
    h3: false,
    blockquote: false,
    superscript: false,
  });

  const [tableMenu, setTableMenu] = useState<{ x: number, y: number, cell: HTMLTableCellElement | null } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setTableMenu(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

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

  // Keep local state in sync when active chapter changes
  useEffect(() => {
    const formatted = beautifyHTML(chapter.content || '');
    setHtmlContent(formatted);
    if (visualEditorRef.current && visualEditorRef.current.innerHTML !== formatted) {
      visualEditorRef.current.innerHTML = formatted;
    }
  }, [chapter.id]);

  useEffect(() => {
    if (isHtmlMode) {
      setEditorMode('html');
    } else {
      setEditorMode('visual');
    }
  }, [isHtmlMode]);

  const isVisualTypingRef = useRef(false);

  // Sync content when switching back to visual mode from html mode
  useEffect(() => {
    if (editorMode === 'visual' || editorMode === 'split') {
      if (isVisualTypingRef.current) {
        isVisualTypingRef.current = false;
        return; // Don't override DOM if the change came from the visual editor itself!
      }
      if (visualEditorRef.current && visualEditorRef.current.innerHTML !== htmlContent) {
        visualEditorRef.current.innerHTML = htmlContent;
      }
    }
  }, [editorMode, htmlContent]);


  const syncFootnotes = useCallback((editor: HTMLElement) => {
    const refs = Array.from(editor.querySelectorAll('.footnote-ref')).filter(ref => !ref.closest('.footnotes-section'));
    
    let footnotesSection = editor.querySelector('.footnotes-section') as HTMLElement;
    if (!footnotesSection && refs.length > 0) {
      const divider = document.createElement('hr');
      divider.className = 'w-1/4 mt-12 mb-4 border-slate-300 footnotes-divider';
      divider.contentEditable = "false";
      
      footnotesSection = document.createElement('div');
      footnotesSection.className = 'footnotes-section text-sm text-slate-600 mt-4';
      
      editor.appendChild(divider);
      editor.appendChild(footnotesSection);
    }

    if (footnotesSection) {
      const existingItems = Array.from(footnotesSection.querySelectorAll('.footnote-item')) as HTMLElement[];
      const itemsMap = new Map<string, HTMLElement>();
      existingItems.forEach(item => itemsMap.set(item.id, item));

      const usedFnIds = new Set<string>();

      refs.forEach((ref, index) => {
        const nextNumber = index + 1;
        const formattedNextNumber = formatNumber(nextNumber);
        const refId = ref.id; 
        const fnId = refId.replace('ref-', 'fn-');
        usedFnIds.add(fnId);
        
        const refAnchor = ref.querySelector('a');
        if (refAnchor && refAnchor.innerText !== formattedNextNumber) {
          refAnchor.innerText = formattedNextNumber;
        }

        let item = itemsMap.get(fnId);
        if (!item) {
          item = document.createElement('div');
          item.id = fnId;
          item.className = 'footnote-item';
          item.innerHTML = `
            <a href="#${refId}" contenteditable="false"><sup>${formattedNextNumber}</sup></a>
            <span class="footnote-text" contenteditable="true">&#8203;</span>
          `;
          itemsMap.set(fnId, item);
        } else {
          const itemAnchor = item.querySelector('a');
          if (itemAnchor) {
            const sup = itemAnchor.querySelector('sup');
            if (sup && sup.innerText !== formattedNextNumber) {
              sup.innerText = formattedNextNumber;
            } else if (!sup && itemAnchor.innerText !== formattedNextNumber) {
              itemAnchor.innerHTML = `<sup>${formattedNextNumber}</sup>`;
            }
          }
        }
        
        const expectedNode = footnotesSection.children[index];
        if (expectedNode !== item) {
          footnotesSection.insertBefore(item, expectedNode || null);
        }
      });

      existingItems.forEach(item => {
        if (!usedFnIds.has(item.id)) item.remove();
      });

      if (refs.length === 0) {
        footnotesSection.remove();
        const divider = editor.querySelector('.footnotes-divider');
        if (divider) divider.remove();
      }
    }
  }, [language]);

  // Handle updates from Visual Editor
  const handleVisualInput = useCallback(() => {
    isVisualTypingRef.current = true;
    if (visualEditorRef.current) {
      syncFootnotes(visualEditorRef.current);
      let newHtml = visualEditorRef.current.innerHTML;
      
      // Aggressive HTML Cleaner: Strips all styles except text-align, removes garbage spans
      if (newHtml.includes('style=') || newHtml.includes('<style') || newHtml.includes('class=')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(newHtml, 'text/html');
        
        const allElements = doc.querySelectorAll('*');
        let didClean = false;

        allElements.forEach(el => {
          if (el.tagName.toLowerCase() === 'style') {
            el.remove();
            didClean = true;
            return;
          }

          // Clean classes
          if (el.className) {
            const allowed = ['footnote-ref', 'footnote-item', 'footnote-text', 'footnotes-section', 'footnotes-divider', 'doc-table', 'page-break', 'text-center', 'text-right', 'text-left', 'text-justify'];
            const keepClasses = Array.from(el.classList).filter(c => allowed.includes(c));
            if (keepClasses.length !== el.classList.length) {
              if (keepClasses.length > 0) {
                el.className = keepClasses.join(' ');
              } else {
                el.removeAttribute('class');
              }
              didClean = true;
            }
          }

          // Clean styles (preserve text-align only on block elements)
          if (el.hasAttribute('style')) {
            let align = el.style.textAlign;
            let textDecor = el.style.textDecoration;
            let vertAlign = el.style.verticalAlign;
            el.removeAttribute('style');
            
            // If the alignment is left (default), we can strip it to keep HTML clean
            // We no longer strip 'left' or 'start' to ensure explicit alignments are preserved

            const inlineTags = ['span', 'a', 'b', 'i', 'u', 'strong', 'em', 'sup', 'sub', 'code', 'strike', 's'];
            
            if (align && !inlineTags.includes(el.tagName.toLowerCase())) {
              el.style.textAlign = align;
            }
            if (textDecor && textDecor.includes('line-through')) {
              el.style.textDecoration = textDecor;
            }
            if (vertAlign && (vertAlign === 'super' || vertAlign === 'sub')) {
              el.style.verticalAlign = vertAlign;
            }
            
            didClean = true;
          }

          // Strip legacy align="..." attributes from inline tags just in case
          if (el.hasAttribute('align')) {
            const inlineTags = ['span', 'a', 'b', 'i', 'u', 'strong', 'em', 'sup', 'sub', 'code'];
            if (inlineTags.includes(el.tagName.toLowerCase()) || el.getAttribute('align') === 'left') {
              el.removeAttribute('align');
              didClean = true;
            }
          }

          // Unwrap empty spans
          if (el.tagName.toLowerCase() === 'span' && el.attributes.length === 0) {
            const fragment = document.createDocumentFragment();
            while (el.firstChild) {
              fragment.appendChild(el.firstChild);
            }
            el.parentNode?.replaceChild(fragment, el);
            didClean = true;
          }
        });

        if (didClean) {
          newHtml = doc.body.innerHTML;
        }
      }
      
      newHtml = beautifyHTML(newHtml);
      
      setHtmlContent(newHtml);
      onUpdateContent(chapter.id, newHtml);
      checkActiveFormatting();
    }
  }, [chapter.id, onUpdateContent, syncFootnotes]);

  useEffect(() => {
    const handleInsertSnippet = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (visualEditorRef.current && editorMode !== 'html') {
        visualEditorRef.current.focus();
        document.execCommand('insertHTML', false, customEvent.detail);
        isVisualTypingRef.current = true;
        handleVisualInput();
      }
    };
    
    const handleScrollToHeading = (e: Event) => {
      const customEvent = e as CustomEvent<{ tag: string, text: string }>;
      const { tag, text } = customEvent.detail;
      if (visualEditorRef.current) {
        const elements = Array.from(visualEditorRef.current.querySelectorAll(tag)) as HTMLElement[];
        const target = elements.find(el => el.textContent?.trim() === text);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('bg-blue-100', 'transition-colors', 'duration-500');
          setTimeout(() => target.classList.remove('bg-blue-100'), 1500);
        }
      }
    };

    window.addEventListener('insert-html-snippet', handleInsertSnippet);
    window.addEventListener('scroll-to-heading', handleScrollToHeading);
    return () => {
      window.removeEventListener('insert-html-snippet', handleInsertSnippet);
      window.removeEventListener('scroll-to-heading', handleScrollToHeading);
    };
  }, [editorMode, handleVisualInput]);

  // Sync footnotes when language changes
  useEffect(() => {
    if (visualEditorRef.current) {
      syncFootnotes(visualEditorRef.current);
      const newHtml = visualEditorRef.current.innerHTML;
      if (newHtml !== htmlContent) {
        setHtmlContent(newHtml);
        onUpdateContent(chapter.id, newHtml);
      }
    }
  }, [language, syncFootnotes]);

  // Handle updates from Raw HTML Editor
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlContent(val);
    onUpdateContent(chapter.id, val);
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = val;
    }
  };

  // Intercept Paste to strip <style> blocks and excessive inline styles
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    let html = e.clipboardData.getData('text/html');

    if (html) {
      // Remove <style> tags and their content
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      // Remove class="..."
      html = html.replace(/\sclass="[^"]*"/gi, '');
      // Remove style="..." (inline CSS)
      html = html.replace(/\sstyle="[^"]*"/gi, '');
      
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('insertText', false, text);
    }
    handleVisualInput();
  };

  // Execute formatting commands using standard document.execCommand
  const execCmd = (command: string, value: string = '') => {
    if (editorMode === 'html') {
      return;
    }
    visualEditorRef.current?.focus();
    document.execCommand(command, false, value);
    handleVisualInput();
  };

  const checkActiveFormatting = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikethrough'),
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight'),
        alignJustify: document.queryCommandState('justifyFull'),
        h1: document.queryCommandValue('formatBlock') === 'h1' || document.queryCommandValue('formatBlock') === 'H1',
        h2: document.queryCommandValue('formatBlock') === 'h2' || document.queryCommandValue('formatBlock') === 'H2',
        h3: document.queryCommandValue('formatBlock') === 'h3' || document.queryCommandValue('formatBlock') === 'H3',
        blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
        superscript: document.queryCommandState('superscript')
      });
    } catch (e) {
      // ignore
    }
  };

  const formatBlock = (tag: string) => {
    const rawTag = tag.replace(/[<>]/g, '').toLowerCase();
    
    // If the format is already active, toggle it off by switching to paragraph
    if (
      (rawTag === 'blockquote' && activeFormats.blockquote) ||
      (rawTag === 'h1' && activeFormats.h1) ||
      (rawTag === 'h2' && activeFormats.h2) ||
      (rawTag === 'h3' && activeFormats.h3) ||
      (rawTag === 'pre' && document.queryCommandValue('formatBlock') === 'pre')
    ) {
      execCmd('formatBlock', '<p>');
      return;
    }

    execCmd('formatBlock', tag);
  };

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement;
    if (cell && visualEditorRef.current?.contains(cell)) {
      e.preventDefault();
      setTableMenu({ x: e.clientX, y: e.clientY, cell });
    } else {
      setTableMenu(null);
    }
  };

  const handleTableAction = (action: 'row-above' | 'row-below' | 'col-left' | 'col-right' | 'delete-row' | 'delete-col' | 'delete-table') => {
    if (!tableMenu?.cell) return;
    const cell = tableMenu.cell;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = row.closest('table');
    if (!table) return;
    
    const cellIndex = cell.cellIndex;
    const rowIndex = row.rowIndex;

    if (action === 'delete-table') {
      table.remove();
    } else if (action === 'delete-row') {
      row.remove();
      if (table.rows.length === 0) table.remove();
    } else if (action === 'delete-col') {
      Array.from(table.rows).forEach(r => {
        if (r.cells[cellIndex]) r.deleteCell(cellIndex);
      });
      if (table.rows.length === 0 || table.rows[0]?.cells.length === 0) table.remove();
    } else if (action === 'row-above') {
      const newRow = table.insertRow(rowIndex);
      for (let i = 0; i < row.cells.length; i++) {
        const newCell = newRow.insertCell();
        newCell.innerHTML = '<br/>';
      }
    } else if (action === 'row-below') {
      const newRow = table.insertRow(rowIndex + 1);
      for (let i = 0; i < row.cells.length; i++) {
        const newCell = newRow.insertCell();
        newCell.innerHTML = '<br/>';
      }
    } else if (action === 'col-left') {
      Array.from(table.rows).forEach(r => {
        const newCell = r.insertCell(cellIndex);
        if (r.parentElement?.tagName.toLowerCase() === 'thead') {
          newCell.outerHTML = '<th><br/></th>';
        } else {
          newCell.innerHTML = '<br/>';
        }
      });
    } else if (action === 'col-right') {
      Array.from(table.rows).forEach(r => {
        const newCell = r.insertCell(cellIndex + 1);
        if (r.parentElement?.tagName.toLowerCase() === 'thead') {
          newCell.outerHTML = '<th><br/></th>';
        } else {
          newCell.innerHTML = '<br/>';
        }
      });
    }
    
    setTableMenu(null);
    
    // Give focus back to editor and update state
    visualEditorRef.current?.focus();
    isVisualTypingRef.current = true;
    setHtmlContent(beautifyHTML(visualEditorRef.current?.innerHTML || ''));
    if (onUpdateContent) {
      onUpdateContent(chapter.id, visualEditorRef.current?.innerHTML || '');
    }
  };

  const insertTableSnippet = () => {
    const tableHtml = `
      <table class="doc-table">
        <thead>
          <tr>
            <th>Column Header 1</th>
            <th>Column Header 2</th>
            <th>Column Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data Cell 1</td>
            <td>Data Cell 2</td>
            <td>Data Cell 3</td>
          </tr>
          <tr>
            <td>Data Cell 4</td>
            <td>Data Cell 5</td>
            <td>Data Cell 6</td>
          </tr>
        </tbody>
      </table><p><br/></p>
    `;
    execCmd('insertHTML', tableHtml);
  };

  const handlePageBreak = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !visualEditorRef.current) return;
    const range = sel.getRangeAt(0);
    const editor = visualEditorRef.current;
    if (!editor.contains(range.commonAncestorContainer)) return;

    const endRange = document.createRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.setEnd(editor, editor.childNodes.length);
    
    const secondHalfFragment = endRange.extractContents();
    const firstHalfHtml = editor.innerHTML;
    
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(secondHalfFragment);
    let secondHalfHtml = tempDiv.innerHTML;
    if (!secondHalfHtml.trim()) secondHalfHtml = '<p><br></p>';

    // Redistribute footnotes between the two halves
    const redistributed = redistributeFootnotes([firstHalfHtml, secondHalfHtml]);
    
    onSplitChapter?.(chapter.id, redistributed[0], redistributed[1]);
  }, [chapter.id, onSplitChapter]);

  const insertFootnoteSnippet = () => {
    const editor = visualEditorRef.current;
    if (!editor) return;

    // 1. Calculate next sequential number
    const existingFootnotes = editor.querySelectorAll('.footnote-ref');
    const nextNumber = existingFootnotes.length + 1;
    const fnId = Math.random().toString(36).substr(2, 5);

    // 2. Insert superscript reference at current cursor position
    const refHtml = `<sup class="footnote-ref" id="ref-${fnId}"><a href="#fn-${fnId}" contenteditable="false">${nextNumber}</a></sup>&#8203;`;
    execCmd('insertHTML', refHtml);

    // 3. Ensure a footnotes section exists at the bottom
    let footnotesSection = editor.querySelector('.footnotes-section');
    if (!footnotesSection) {
      const divider = document.createElement('hr');
      divider.className = 'footnotes-divider';
      divider.contentEditable = "false";
      
      footnotesSection = document.createElement('div');
      footnotesSection.className = 'footnotes-section';
      
      editor.appendChild(divider);
      editor.appendChild(footnotesSection);
    }

    // 4. Append new footnote at the bottom
    const footnoteItem = document.createElement('div');
    footnoteItem.id = `fn-${fnId}`;
    footnoteItem.className = 'footnote-item';
    
    footnoteItem.innerHTML = `
      <a href="#ref-${fnId}" contenteditable="false"><sup>${nextNumber}</sup></a>
      <span class="footnote-text" contenteditable="true">&#8203;</span>
    `;
    
    footnotesSection.appendChild(footnoteItem);

    // 5. Save changes
    const updatedHtml = editor.innerHTML;
    setHtmlContent(updatedHtml);
    onUpdateContent(chapter.id, updatedHtml);

    // 6. Jump cursor down into the new footnote text so user can start typing immediately
    setTimeout(() => {
      const textSpan = editor.querySelector(`#fn-${fnId} .footnote-text`);
      if (textSpan) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(textSpan);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
        
        textSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };


  const handleEditorClick = (e: React.MouseEvent) => {
    checkActiveFormatting();
    
    // Intercept clicks on footnote links to jump smoothly
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
      e.preventDefault();
      const hash = anchor.getAttribute('href');
      if (hash) {
        const targetEl = visualEditorRef.current?.querySelector(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (targetEl as HTMLElement).style.transition = 'background-color 0.5s';
          (targetEl as HTMLElement).style.backgroundColor = 'rgba(253, 224, 71, 0.4)';
          setTimeout(() => { (targetEl as HTMLElement).style.backgroundColor = 'transparent'; }, 1500);
        }
      }
    }
  };

  // Determine width class based on settings
  const getPageWidthClass = () => {
    switch (settings.pageWidth) {
      case 'compact': return 'max-w-2xl';
      case 'wide': return 'max-w-4xl';
      case 'full': return 'max-w-full px-6';
      default: return 'max-w-3xl';
    }
  };

  // Determine typography classes
  const getFontFamilyStyle = () => {
    if (settings.fontFamily === 'serif') return 'font-serif';
    if (settings.fontFamily === 'mono') return 'font-mono';
    return 'font-sans';
  };

  const selectedChapters = chapters.filter(c => checkedChapterIds.includes(c.id));

  if (activeLeftTab === 'structure' && selectedChapters.length > 0) {
    return (
      <main className="flex-1 flex flex-col h-full bg-[#f4f7f6] overflow-hidden relative font-sans">
        {/* Mass Editor Toolbar */}
        <div className="bg-white border-b border-slate-200 p-2 flex items-center justify-between shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {selectedChapters.length} Chapters Selected
            </span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1">
              <button onClick={() => onMassAction('align-left', checkedChapterIds)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Align Left">
                <AlignLeft className="w-4 h-4" />
              </button>
              <button onClick={() => onMassAction('align-center', checkedChapterIds)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Align Center">
                <AlignCenter className="w-4 h-4" />
              </button>
              <button onClick={() => onMassAction('align-right', checkedChapterIds)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Align Right">
                <AlignRight className="w-4 h-4" />
              </button>
              <button onClick={() => onMassAction('justify', checkedChapterIds)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Justify">
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <button onClick={() => onMassAction('clear-format', checkedChapterIds)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded flex items-center gap-1.5" title="Clear Formatting">
              <RemoveFormatting className="w-4 h-4" />
              <span className="text-xs font-medium">Clear Format</span>
            </button>
          </div>
        </div>

        {/* Mass Editor Read-Only Scroll View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {selectedChapters.map(chap => (
            <div key={chap.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{chap.title || '(Untitled)'}</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {chap.level === 0 ? 'Volume' : 'Chapter'}
                </span>
              </div>
              <div 
                className={`p-6 prose max-w-none ${getFontFamilyStyle()} editor-content`}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight
                }}
                dir="auto"
                dangerouslySetInnerHTML={{ __html: chap.content || '<p class="text-slate-300 italic">Empty</p>' }}
              />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main 
      id="middle-editor-panel"
      className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative font-sans"
    >
      <>
          {/* Visual / HTML Formatting Ribbon */}
          <div 
            id="editor-ribbon-toolbar"
            className="bg-white border-b border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-1 text-xs select-none shadow-2xs shrink-0 z-30"
          >
        {/* Left Formatting Group */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* History Tools */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('undo'); }}
              title="Undo (Ctrl+Z)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('redo'); }}
              title="Redo (Ctrl+Y)"
              className="p-1.5 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded transition"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          
            {/* Paragraph / Heading Style dropdown */}
            <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
              <button
                onMouseDown={(e) => { e.preventDefault(); formatBlock('<p>'); }}
                title="Normal Paragraph (Ctrl+Alt+0)"
                className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded transition border border-transparent hover:border-slate-200"
              >
                Paragraph
              </button>
              
              {/* Heading Dropdown using CSS group-hover */}
              <div className="relative group">
                <button
                  title="Headings (Ctrl+Alt+1 to 6)"
                  className="px-2 py-1 flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded transition border border-transparent hover:border-slate-200"
                >
                  Headings <span className="text-[9px]">&#9660;</span>
                </button>
                <div className="absolute left-0 top-full mt-0.5 w-32 bg-white border border-slate-200 shadow-lg rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex flex-col py-1">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      onMouseDown={(e) => { e.preventDefault(); formatBlock('<h' + num + '>'); }}
                      className="px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 w-full"
                    >
                      Heading {num} <span className="text-slate-400 text-[9px] float-right">Ctrl+Alt+{num}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Inline Text Styles: B, I, U, S */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
              title="Bold (Ctrl+B)"
              className={`p-1.5 rounded transition ${activeFormats.bold ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
              title="Italic (Ctrl+I)"
              className={`p-1.5 rounded transition ${activeFormats.italic ? 'bg-blue-50 text-blue-600 italic' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
              title="Underline (Ctrl+U)"
              className={`p-1.5 rounded transition ${activeFormats.underline ? 'bg-blue-50 text-blue-600 underline' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('strikeThrough'); }}
              title="Strikethrough"
              className={`p-1.5 rounded transition ${activeFormats.strike ? 'bg-blue-50 text-blue-600 line-through' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('superscript'); }}
              title="Superscript"
              className={`p-1.5 rounded transition font-serif font-bold text-[10px] flex items-center justify-center ${activeFormats.superscript ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              x²
            </button>
          </div>

          {/* Direction Tools */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
                                                      <button
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  visualEditorRef.current?.focus(); 
                  
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    let node = sel.anchorNode;
                    while (node && node !== visualEditorRef.current && node.nodeType !== 1) {
                      node = node.parentNode;
                    }
                    while (node && node !== visualEditorRef.current) {
                      if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'].includes((node as HTMLElement).tagName)) {
                        break;
                      }
                      node = node.parentNode;
                    }
                    
                    if (node && node !== visualEditorRef.current) {
                      const el = node as HTMLElement;
                      if (el.getAttribute('dir') === 'ltr') {
                        el.removeAttribute('dir');
                        el.style.textAlign = '';
                      } else {
                        el.setAttribute('dir', 'ltr');
                        el.style.textAlign = '';
                      }
                      setTimeout(handleVisualInput, 10);
                    }
                  }
                }}
                title="Toggle LTR Direction for Current Paragraph"
                className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded transition border border-slate-200"
              >
                Fix LTR
              </button>
<button
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  visualEditorRef.current?.focus(); 
                  
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    let node = sel.anchorNode;
                    while (node && node !== visualEditorRef.current && node.nodeType !== 1) {
                      node = node.parentNode;
                    }
                    while (node && node !== visualEditorRef.current) {
                      if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI'].includes((node as HTMLElement).tagName)) {
                        break;
                      }
                      node = node.parentNode;
                    }
                    
                    if (node && node !== visualEditorRef.current) {
                      const el = node as HTMLElement;
                      if (el.getAttribute('dir') === 'rtl') {
                        el.removeAttribute('dir');
                        el.style.textAlign = '';
                      } else {
                        el.setAttribute('dir', 'rtl');
                        el.style.textAlign = '';
                      }
                      setTimeout(handleVisualInput, 10);
                    }
                  }
                }}
                title="Toggle RTL Direction for Current Paragraph"
                className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded transition border border-slate-200"
              >
                Fix RTL
              </button>
          </div>

          {/* Alignment Tools: Left, Center, Right, Justify */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
              title="Align Left"
              className={`p-1.5 rounded transition ${activeFormats.alignLeft ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
              title="Align Center"
              className={`p-1.5 rounded transition ${activeFormats.alignCenter ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
              title="Align Right"
              className={`p-1.5 rounded transition ${activeFormats.alignRight ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }}
              title="Justify Text"
              className={`p-1.5 rounded transition ${activeFormats.alignJustify ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lists & Quotes */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-200">
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
              title="Bulleted List"
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
              title="Numbered List"
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); formatBlock('<blockquote>'); }}
              title="Blockquote"
              className={`p-1.5 rounded transition ${activeFormats.blockquote ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); formatBlock('<pre>'); }}
              title="Code Block"
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inserters: Image + Table + Rule */}
          <div className="flex items-center gap-1 px-1.5">
            <button
              id="toolbar-insert-image-btn"
              onClick={onInsertImageClick}
              title="Insert Image (Upload or Web URL)"
              className="px-2 py-1 flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-200 transition"
            >
              <ImageIcon className="w-3 h-3 text-blue-500" /> Image
            </button>
            <button
              onClick={insertTableSnippet}
              title="Insert Table"
              className="p-1.5 rounded transition text-slate-700 hover:bg-slate-100"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={insertFootnoteSnippet}
              title="Insert Footnote"
              className="px-2 py-1 flex items-center gap-1 rounded transition text-slate-700 hover:bg-slate-100 font-medium text-[10px]"
            >
              <span className="font-serif">fn</span>
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('insertHorizontalRule'); }}
              title="Horizontal Rule"
              className="p-1.5 rounded transition text-slate-700 hover:bg-slate-100"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePageBreak}
              title="Divide text into new chapter (Page Break / Ctrl+Enter)"
              className="p-1.5 rounded transition text-slate-700 hover:bg-slate-100 text-[11px] font-medium flex items-center gap-1"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }}
              title="Clear Formatting"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Mode Switchers: Visual / HTML / Split */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
          <button
            onClick={() => setEditorMode('visual')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 ${
              editorMode === 'visual'
                ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" /> Visual
          </button>
          <button
            onClick={() => setEditorMode('html')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 ${
              editorMode === 'html'
                ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3 h-3" /> HTML
          </button>
          <button
            onClick={() => setEditorMode('split')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition flex items-center gap-1 ${
              editorMode === 'split'
                ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3 h-3" /> Split
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar">
        {/* Visual Mode Only */}
        {editorMode === 'visual' && (
          <div 
            className={`w-full ${getPageWidthClass()} p-8 md:p-14 transition-all min-h-[720px] flex flex-col`}
          >
            {/* Chapter Header / Inline Title Editor */}
            <div className="mb-6 pb-4 border-b border-slate-100 relative group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold tracking-wider uppercase">
                  <span>{chapter.level === 0 ? 'Volume' : chapter.level === 1 ? 'Chapter' : `Level ${chapter.level} Section`}</span>
                </div>
                <button
                  onClick={() => onToggleTitle?.(chapter.id, !chapter.hideTitle)}
                  title={chapter.hideTitle ? "Show Title in Export" : "Hide Title in Export"}
                  className={`px-2 py-1 text-[10px] uppercase font-bold rounded flex items-center gap-1.5 transition-all ${
                    chapter.hideTitle 
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                >
                  {chapter.hideTitle ? (
                    <><EyeOff className="w-3 h-3" /> Title Hidden</>
                  ) : (
                    <><Eye className="w-3 h-3" /> Title Visible</>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={chapter.title}
                dir="auto"
                onChange={(e) => onUpdateTitle(chapter.id, e.target.value)}
                placeholder="Chapter Title..."
                className={`w-full text-xl md:text-2xl font-bold tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 transition-opacity ${
                  chapter.hideTitle ? 'text-slate-400 opacity-60 line-through decoration-slate-300' : 'text-slate-900'
                }`}
              />
            </div>

            <div
              ref={visualEditorRef}
              id="wysiwyg-content-canvas"
              contentEditable
              dir="auto"
              suppressContentEditableWarning
              onInput={handleVisualInput}
              onKeyUp={checkActiveFormatting}
              onClick={handleEditorClick}
              onPaste={handlePaste}
              onContextMenu={handleEditorContextMenu}
              onKeyDown={(e) => {

                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handlePageBreak();
                }

                  // Smart Merge: Preserve 'justify' alignment and 'Heading' tags when pressing Delete or Backspace
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    const sel = window.getSelection();
                    if (sel && sel.isCollapsed) {
                      let currentBlock = sel.anchorNode;
                      while (currentBlock && currentBlock !== e.currentTarget && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes((currentBlock as HTMLElement).tagName)) {
                        currentBlock = currentBlock.parentNode;
                      }
                      
                      if (currentBlock && currentBlock !== e.currentTarget) {
                        const range = sel.getRangeAt(0);
                        const testRange = range.cloneRange();
                        const isJustified = (node: HTMLElement) => 
                          node && (node.style?.textAlign === 'justify' || node.classList?.contains('text-justify') || node.getAttribute?.('align') === 'justify');

                        const isHeading = (node: HTMLElement) => 
                          node && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName);

                        const isEmpty = (node: HTMLElement) => 
                          node.textContent?.replace(/\u200B/g, '').trim().length === 0;

                        if (e.key === 'Delete') {
                          testRange.selectNodeContents(currentBlock);
                          testRange.setStart(range.endContainer, range.endOffset);
                          const remainingText = testRange.toString().replace(/\u200B/g, '').trim();
                          
                          if (remainingText.length === 0) {
                            let nextBlock = (currentBlock as HTMLElement).nextElementSibling as HTMLElement;
                            if (nextBlock) {
                              if (isJustified(nextBlock)) {
                                (currentBlock as HTMLElement).style.textAlign = 'justify';
                              }
                              
                              if (isHeading(nextBlock)) {
                                if (isEmpty(currentBlock as HTMLElement)) {
                                  e.preventDefault();
                                  (currentBlock as HTMLElement).remove();
                                  const newSel = window.getSelection();
                                  const newRange = document.createRange();
                                  newRange.setStart(nextBlock, 0);
                                  newRange.collapse(true);
                                  newSel?.removeAllRanges();
                                  newSel?.addRange(newRange);
                                  setTimeout(handleVisualInput, 10);
                                  return;
                                } else {
                                  const newBlock = document.createElement(nextBlock.tagName);
                                  newBlock.innerHTML = (currentBlock as HTMLElement).innerHTML;
                                  if (isJustified(currentBlock as HTMLElement) || isJustified(nextBlock)) {
                                    newBlock.style.textAlign = 'justify';
                                  }
                                  currentBlock.parentNode?.replaceChild(newBlock, currentBlock);
                                  
                                  const newSel = window.getSelection();
                                  const newRange = document.createRange();
                                  newRange.selectNodeContents(newBlock);
                                  newRange.collapse(false);
                                  newSel?.removeAllRanges();
                                  newSel?.addRange(newRange);
                                }
                              }
                              setTimeout(handleVisualInput, 10);
                            }
                          }
                        } else if (e.key === 'Backspace') {
                          testRange.selectNodeContents(currentBlock);
                          testRange.setEnd(range.startContainer, range.startOffset);
                          const priorText = testRange.toString().replace(/\u200B/g, '').trim();
                          
                          if (priorText.length === 0) {
                            let prevBlock = (currentBlock as HTMLElement).previousElementSibling as HTMLElement;
                            if (prevBlock) {
                              if (isJustified(currentBlock as HTMLElement)) {
                                prevBlock.style.textAlign = 'justify';
                              }
                              
                              if (isHeading(currentBlock as HTMLElement)) {
                                if (isEmpty(prevBlock)) {
                                  e.preventDefault();
                                  prevBlock.remove();
                                  setTimeout(handleVisualInput, 10);
                                  return;
                                } else {
                                  const newBlock = document.createElement(currentBlock.tagName);
                                  newBlock.innerHTML = prevBlock.innerHTML;
                                  if (isJustified(prevBlock) || isJustified(currentBlock as HTMLElement)) {
                                    newBlock.style.textAlign = 'justify';
                                  }
                                  prevBlock.parentNode?.replaceChild(newBlock, prevBlock);
                                }
                              }
                              setTimeout(handleVisualInput, 10);
                            }
                          }
                        }
                      }
                    }
                  }

                
                // Heading Shortcuts: Ctrl+Alt+1..6
                if ((e.ctrlKey || e.metaKey) && e.altKey) {
                  switch (e.key) {
                    case '1': e.preventDefault(); formatBlock('<h1>'); break;
                    case '2': e.preventDefault(); formatBlock('<h2>'); break;
                    case '3': e.preventDefault(); formatBlock('<h3>'); break;
                    case '4': e.preventDefault(); formatBlock('<h4>'); break;
                    case '5': e.preventDefault(); formatBlock('<h5>'); break;
                    case '6': e.preventDefault(); formatBlock('<h6>'); break;
                    case '0': e.preventDefault(); formatBlock('<p>'); break;
                  }
                  setTimeout(handleVisualInput, 10);
                }
              }}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight
              }}
              className={`flex-1 focus:outline-none text-slate-800 ${getFontFamilyStyle()} leading-relaxed max-w-none empty:before:content-['Type_your_manuscript_content_here...'] empty:before:text-slate-400`}
            />
          </div>
        )}

        {/* HTML Source Mode Only */}
        {editorMode === 'html' && (
          <div className={`w-full ${getPageWidthClass()} bg-slate-900 text-slate-100 rounded shadow-sm border border-slate-700 p-6 flex flex-col min-h-[640px]`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                Raw HTML Markup: {chapter.title}
              </span>
              <span>UTF-8 • {htmlContent.length} bytes</span>
            </div>
            <textarea
              id="raw-html-textarea"
              value={htmlContent}
              onChange={handleHtmlChange}
              className="flex-1 w-full bg-slate-950 font-mono text-sm p-4 rounded border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Split View (Visual + HTML side-by-side) */}
        {editorMode === 'split' && (
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual Column */}
            <div className="p-6 flex flex-col min-h-[640px]">
              <div className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
                Visual Canvas
              </div>
              <input
                type="text"
                value={chapter.title}
                dir="auto"
                onChange={(e) => onUpdateTitle(chapter.id, e.target.value)}
                className="w-full text-lg font-bold bg-transparent border-b border-slate-200 pb-2 mb-4 focus:outline-none text-slate-900"
              />
              <div
                ref={visualEditorRef}
                contentEditable
                dir="auto"
                suppressContentEditableWarning
                onInput={handleVisualInput}
                onKeyUp={checkActiveFormatting}
                onClick={handleEditorClick}
                onContextMenu={handleEditorContextMenu}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight
                }}
                className={`flex-1 focus:outline-none text-slate-800 ${getFontFamilyStyle()} max-w-none`}
              />
            </div>

            {/* Raw HTML Column */}
            <div className="bg-slate-900 rounded shadow-sm border border-slate-700 p-6 flex flex-col min-h-[640px]">
              <div className="text-xs font-semibold text-indigo-400 mb-4 uppercase tracking-wide">
                Live HTML Source
              </div>
              <textarea
                value={htmlContent}
                onChange={handleHtmlChange}
                className="flex-1 w-full bg-slate-950 font-mono text-xs p-3 rounded border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
      </>

      {/* Context Menu for Tables */}
      {tableMenu && (
        <div
          className="fixed z-[100] bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-xs w-48 font-sans animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tableMenu.x, top: tableMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 font-semibold text-slate-500 bg-slate-50 border-b border-slate-100 mb-1 flex items-center justify-between">
            Table Actions
          </div>
          <button onClick={() => handleTableAction('row-above')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 transition-colors">Insert Row Above</button>
          <button onClick={() => handleTableAction('row-below')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 transition-colors">Insert Row Below</button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button onClick={() => handleTableAction('col-left')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 transition-colors">Insert Column Left</button>
          <button onClick={() => handleTableAction('col-right')} className="w-full text-left px-4 py-2 hover:bg-slate-100 text-slate-700 transition-colors">Insert Column Right</button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button onClick={() => handleTableAction('delete-row')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors">Delete Row</button>
          <button onClick={() => handleTableAction('delete-col')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors">Delete Column</button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button onClick={() => handleTableAction('delete-table')} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 font-semibold transition-colors">Delete Table</button>
        </div>
      )}
    </main>
  );
};

