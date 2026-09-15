

import { DocumentProject, ChapterItem } from '../types';
import { syncChapterFootnotes, formatFootnoteNumber } from './footnoteHelper';

const languageNames: Record<string, string> = {
  en: 'English',
  bn: 'বাংলা',
  ar: 'العربية',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  hi: 'हिन्दी',
  ur: 'اردو',
  id: 'Bahasa Indonesia',
  ru: 'Русский'
};


function getExportNumberedChapters(chapters: ChapterItem[], language: string) {
  let counters: number[] = [];
  let hiddenLevel = -1;

  return chapters.map((chap) => {
    if (chap.level === 0) {
      counters = [];
      hiddenLevel = -1;
      return { ...chap, exportNumbering: '' };
    }

    if (hiddenLevel !== -1 && chap.level <= hiddenLevel) {
      hiddenLevel = -1;
    }

    if (chap.hideTitle) {
      if (hiddenLevel === -1) hiddenLevel = chap.level;
      return { ...chap, exportNumbering: '' };
    }

    if (hiddenLevel !== -1) {
      return { ...chap, exportNumbering: '' };
    }

    while (counters.length < chap.level) counters.push(0);
    if (counters.length > chap.level) counters.length = chap.level;
    counters[counters.length - 1]++;
    
    // We append a dot and space for export headings, e.g. "1.1. "
    
    return { ...chap, exportNumbering: formatFootnoteNumber(counters.join('.'), language) + '. ' };
  });
}

export function generateCompiledHtml(project: DocumentProject): string {
  const { metadata, chapters, settings } = project;
  const displayLang = metadata.language === 'other' ? (metadata.customLanguage || 'Custom') : (languageNames[metadata.language] || metadata.language);
    const authorNames = metadata.authors ? metadata.authors.split(';').map(s=>escapeHtml(s.trim())).filter(Boolean).join('<br/>') : '';
  const translatorNames = metadata.translators ? metadata.translators.split(';').map(s=>escapeHtml(s.trim())).filter(Boolean).join('<br/>') : '';

  const numberedChaps = getExportNumberedChapters(chapters, metadata.language || 'English');
  const chaptersHtml = numberedChaps
    .map((chap) => {
      if (chap.level === 0) {
        return `
          <div class="volume-container" id="chapter-${chap.id}">
            <h1 class="volume-title" dir="auto">${escapeHtml(chap.title)}</h1>
          </div>
        `;
      }
      
      const headingLevel = Math.min(Math.max(chap.level, 1), 6);
      const headingTag = `h${headingLevel}`;
      const levelClass = `chapter-level-${chap.level}`;
      
      const headerHtml = chap.hideTitle ? '' : `
          <header class="chapter-header">
              <${headingTag} class="chapter-title" dir="auto">${chap.exportNumbering}${escapeHtml(chap.title)}</${headingTag}>
          </header>
      `;
      
      let contentHtml = chap.content;
      try {
        const doc = new DOMParser().parseFromString(contentHtml || '', 'text/html');
        doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h, i) => {
          h.id = `heading-${chap.id}-${i}`;
        });
        contentHtml = doc.body.innerHTML;
      } catch (e) {}

      return `
        <article class="chapter-container ${levelClass}" id="chapter-${chap.id}">
          ${headerHtml}
          <div class="chapter-body" dir="auto">
            ${contentHtml}
          </div>
        </article>
      `;
    })
    .join('\n<div class="page-divider"></div>\n');

  const coverHtml = metadata.cover ? `
    <section class="cover-page" style="background-color: ${metadata.cover.backgroundColor}; color: ${metadata.cover.textColor}; ${metadata.cover.imageUrl ? `background-image: url('${metadata.cover.imageUrl}'); background-size: cover; background-position: center;` : ''}">
      ${!metadata.cover.imageUrl ? `
      <div class="cover-content">
        <h1 class="cover-title">${escapeHtml(metadata.title)}</h1>
        ${metadata.subtitle ? `<h2 class="cover-subtitle">${escapeHtml(metadata.subtitle)}</h2>` : ''}
        ${(() => {
            const list = metadata.authors ? metadata.authors.split(';').map(s=>s.trim()).filter(Boolean) : ['Author'];
            const hasLong = list.some(a => a.length > 18);
            const size = (list.length > 2 || hasLong) ? '0.8rem' : '1.1rem';
            return `<div class="cover-authors" style="font-size: ${size}; line-height: 1.4;">${authorNames || 'Author'}</div>`;
          })()}
        
      </div>
      ` : ''}
    </section>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  <style>
    :root {
      --font-family: 'Georgia', 'SolaimanLipi', 'Scheherazade New', serif;
      --font-size: ${settings.fontSize}px;
      --line-height: ${settings.lineHeight};
      --text-color: #1e293b;
      --bg-color: #ffffff;
      --accent-color: #0284c7;
    }
    @media print {
      @page {
        margin: 20mm 25mm 20mm 25mm;
        size: auto;
      }
      body {
        background: #fff !important;
        color: #000 !important;
        font-size: 11pt !important;
      }
      .cover-page {
        page-break-after: always;
        height: 100vh;
      }
      .chapter-level-1 {
        page-break-before: always;
      }
      .page-divider {
        display: none;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: var(--font-family);
      font-size: var(--font-size);
      line-height: var(--line-height);
      color: var(--text-color);
      background-color: #f8fafc;
      padding: 0;
    }
    .manuscript-wrapper {
      max-width: 800px;
      margin: 40px auto;
      background: var(--bg-color);
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      border-radius: 6px;
      overflow: hidden;
    }
    .cover-page {
      padding: 80px 48px;
      aspect-ratio: 1 / 1.414;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      margin: 0 auto;
    }
    .cover-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      padding-top: 10px;
      line-height: 1.4;
    }
    .cover-subtitle {
      font-size: 1.25rem;
      font-weight: 400;
      opacity: 0.85;
      margin-bottom: 32px;
    }
    .cover-authors {
      font-size: 1.1rem;
      font-weight: 500;
      margin-top: 24px;
    }
    
    .metadata-page {
      padding: 48px;
      border-bottom: 1px solid #e2e8f0;
      background: #fdfdfd;
      font-size: 0.95rem;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 10px 16px;
      margin-top: 16px;
    }
    .meta-label {
      font-weight: 600;
      color: #64748b;
    }
    .toc-section {
      padding: 48px;
      border-bottom: 1px solid #e2e8f0;
      background: #fafafa;
    }
    .toc-title {
      font-size: 1.4rem;
      margin-bottom: 20px;
      color: #0f172a;
    }
    .toc-list {
      list-style: none;
    }
    .toc-item {
      margin-bottom: 8px;
    }
    .toc-link {
      color: #334155;
      text-decoration: none;
    }
    .toc-link:hover {
      color: var(--accent-color);
      text-decoration: underline;
    }
    .content-area {
      padding: 64px 56px;
    }
    .chapter-container {
      margin-bottom: 48px;
    }
    .chapter-header {
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .chapter-title {
      color: #0f172a;
    }
    
    
    
    .volume-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      text-align: center;
      page-break-before: always;
      page-break-after: always;
    }
    .volume-title { font-size: 1.833em;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #0f172a;
    }
    .chapter-body p, 
    .chapter-body div, 
    .chapter-body h1, 
    .chapter-body h2, 
    .chapter-body h3, 
    .chapter-body h4, 
    .chapter-body h5, 
    .chapter-body h6, 
    .chapter-body li, 
    .chapter-body th, 
    .chapter-body td,
    .chapter-body blockquote {
      unicode-bidi: plaintext;
      text-align: start;
    }
    .chapter-body p {
      margin-bottom: 1.25em;
      text-align: justify;
      text-justify: inter-word;
    }
    .chapter-body blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 18px;
      margin: 1.5em 0;
      font-style: italic;
      color: #475569;
    }
    .chapter-body ul, .chapter-body ol {
      margin: 1em 0 1.5em 28px;
    }
    .chapter-body li {
      margin-bottom: 0.4em;
    }
    .chapter-body img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 1.5em 0;
    }
    .doc-footnote-ref {
      font-size: 0.75em;
      line-height: 0;
      vertical-align: super;
      font-weight: 600;
      color: var(--accent-color);
      padding: 0 1px;
    }
    .doc-footnote-ref a {
      color: var(--accent-color);
      text-decoration: none;
    }
    .doc-footnote-ref a:hover {
      text-decoration: underline;
    }
    .doc-footnotes {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      font-size: 0.85em;
      color: #475569;
    }
    .doc-footnotes-title {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 8px;
    }
    .doc-footnotes-list {
      padding-left: 20px;
    }
    .doc-footnotes-list li {
      margin-bottom: 6px;
      line-height: 1.35;
    }
    .doc-footnote-backref { color: var(--accent-color); text-decoration: none; font-weight: 600; }
    .footnote-ref {
      font-size: 0.75em;
      line-height: 0;
      vertical-align: super;
      color: var(--accent-color, #2563eb);
      padding: 0 1px;
    }
    .footnote-ref a {
      color: inherit;
      text-decoration: none;
    }
    .footnote-ref a:hover {
      text-decoration: underline;
    }
    hr.footnotes-divider {
      margin-top: 3em;
      margin-bottom: 1em;
      border: 0;
      border-top: 1px solid #cbd5e1;
      width: 30%;
    }
    .footnotes-section {
      font-size: 0.85em;
      color: #475569;
      padding-top: 0.5em;
    }
    .footnote-item {
      margin-bottom: 0.5em;
      line-height: 1.35;
      display: flex;
      gap: 8px;
    }
    .footnote-item a {
      color: var(--accent-color, #2563eb);
      text-decoration: none;
      font-weight: 600;
    }
    .footnote-item a:hover {
      text-decoration: underline;
    }
    .footnote-text {
      flex: 1;
      text-align: justify;
    }

    .page-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 48px 0;
    }
    .top-actions-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
    }
    .print-btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #0369a1;
    }
  
#wysiwyg-content-canvas h1, .chapter-body h1 {
  font-size: 1.833em !important;
  font-weight: bold !important;
  line-height: 1.3;
}
#wysiwyg-content-canvas h2, .chapter-body h2 {
  font-size: 1.666em !important;
  font-weight: bold !important;
  line-height: 1.35;
}
#wysiwyg-content-canvas h3, .chapter-body h3 {
  font-size: 1.5em !important;
  font-weight: bold !important;
  line-height: 1.4;
}
#wysiwyg-content-canvas h4, .chapter-body h4 {
  font-size: 1.333em !important;
  font-weight: bold !important;
  line-height: 1.4;
}
#wysiwyg-content-canvas h5, .chapter-body h5 {
  font-size: 1.166em !important;
  font-weight: bold !important;
  line-height: 1.45;
}
#wysiwyg-content-canvas h6, .chapter-body h6 {
  font-size: 1em !important;
  font-weight: bold !important;
  line-height: 1.45;
  text-transform: none !important;
  letter-spacing: normal !important;
  color: inherit !important;
}
/* Hierarchy Headings Output mapping */
.chapter-level-0 .volume-title { font-size: 1.833em; font-weight: bold; }
.chapter-level-1 .chapter-title { font-size: 1.666em; font-weight: bold; }
.chapter-level-2 .chapter-title { font-size: 1.5em; font-weight: bold; }
.chapter-level-3 .chapter-title { font-size: 1.333em; font-weight: bold; }
.chapter-level-4 .chapter-title { font-size: 1.166em; font-weight: bold; }
.chapter-level-5 .chapter-title { font-size: 1em; font-weight: bold; }
.chapter-level-6 .chapter-title { font-size: 1em; font-weight: bold; }
</style>
</head>
<body>
  <div class="top-actions-bar no-print">
    <div>
      <strong>${escapeHtml(metadata.title)}</strong> &mdash; Compiled Manuscript Preview
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save to PDF</button>
  </div>

  <div class="manuscript-wrapper">
    ${coverHtml}

    <section class="metadata-page">
      <h3 style="margin-bottom: 12px; font-size: 1.1rem; color: #0f172a;">Publication Details</h3>
      <div class="metadata-grid">
        <div class="meta-label">Title:</div>
        <div>${escapeHtml(metadata.title)}</div>

        ${metadata.subtitle ? `
          <div class="meta-label">Subtitle:</div>
          <div>${escapeHtml(metadata.subtitle)}</div>
        ` : ''}

        <div class="meta-label">Authors:</div>
        <div>${authorNames || 'Unspecified'}</div>

        ${translatorNames ? `
          <div class="meta-label">Translators:</div>
          <div>${escapeHtml(translatorNames)}</div>
        ` : ''}

        ${metadata.publisherName ? `
          <div class="meta-label">Publisher:</div>
          <div>${escapeHtml(metadata.publisherName)}</div>
        ` : ''}

        ${metadata.isbn ? `
          <div class="meta-label">ISBN:</div>
          <div>${escapeHtml(metadata.isbn)}</div>
        ` : ''}

        ${false ? `
          <div class="meta-label">DOI:</div>
          <div>${escapeHtml("")}</div>
        ` : ''}

        ${metadata.language ? `
            <div class="meta-label">Language:</div>
            <div>${escapeHtml(displayLang)}</div>
          ` : ''}

          ${metadata.publicationDate ? `
            <div class="meta-label">Publication Date:</div>
            <div>${escapeHtml(metadata.publicationDate)}</div>
          ` : ''}
  
          ${metadata.copyrightInfo ? `
            <div class="meta-label">Copyright:</div>
            <div>${escapeHtml(metadata.copyrightInfo)}</div>
          ` : ''}
  
          ${metadata.license ? `
            <div class="meta-label">License:</div>
            <div>${escapeHtml(metadata.license)}</div>
          ` : ''}
      </div>
    </section>

    <section class="toc-section">
      <h3 class="toc-title">Table of Contents</h3>
      <ul class="toc-list">
        ${numberedChaps.filter(c => !c.hideTitle && c.exportNumbering !== undefined).map((c) => {
          const indentPx = c.level === 0 ? 0 : c.level * 20;
          const fontWeight = c.level === 0 ? '700' : '400';
          const marginTop = c.level === 0 ? '16px' : c.level === 1 ? '8px' : '4px';
          const textTransform = c.level === 0 ? 'uppercase' : 'none';
          
          let headingsHtml = '';
          try {
            const doc = new DOMParser().parseFromString(c.content || '', 'text/html');
            const hNodes = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            if (hNodes.length > 0) {
              headingsHtml = '<ul class="toc-list" style="margin-top: 4px;">' + hNodes.map((h, i) => `
                <li class="toc-item-heading" style="padding-left: ${indentPx + 20}px;">
                  <a class="toc-link" href="#heading-${c.id}-${i}">${escapeHtml(h.textContent?.trim() || '')}</a>
                </li>
              `).join('\n') + '</ul>';
            }
          } catch (e) {}

          return `
            <li class="toc-item" style="padding-left: ${indentPx}px; font-weight: ${fontWeight}; margin-top: ${marginTop}; text-transform: ${textTransform};">
              <a class="toc-link" href="#chapter-${c.id}">${c.exportNumbering}${escapeHtml(c.title)}</a>
            </li>
            ${headingsHtml}
          `;
        }).join('\n')}
      </ul>
    </section>

    <main class="content-area">
      ${chaptersHtml}
    </main>
  </div>
</body>
</html>`;
}

export function generateMarkdownManuscript(project: DocumentProject): string {
  const { metadata, chapters } = project;
  let md = `# ${metadata.title}\n\n`;
  const numberedChaps = getExportNumberedChapters(chapters, metadata.language || 'English');
  if (metadata.subtitle) md += `*${metadata.subtitle}*\n\n`;
    if (metadata.originalTitle) md += `**Original Name:** ${metadata.originalTitle}\n`;
  md += `**Authors:**\n${metadata.authors ? metadata.authors.split(';').map(s=>s.trim()).filter(Boolean).map(s=>'- '+s).join('\n') : ''}\n`;
  if (metadata.publisherName) md += `**Publisher:** ${metadata.publisherName}\n`;
  if (metadata.publicationDate) md += `**Publication Date:** ${metadata.publicationDate}\n`;
  if (metadata.copyrightInfo) md += `**Copyright:** ${metadata.copyrightInfo}\n`;
  if (metadata.license) md += `**License:** ${metadata.license}\n`;
  if (metadata.isbn) md += `**ISBN:** ${metadata.isbn}\n`;
    if (metadata.genre) md += `**Genre:** ${metadata.genre}\n`;
    if (metadata.tags) md += `**Tags:** ${metadata.tags}\n`;
  md += `\n---\n\n`;

  for (const chap of chapters) {
    if (!chap.hideTitle) {
      const hashes = '#'.repeat(Math.max(chap.level, 1));
      md += `${hashes} ${chap.title}\n\n`;
    }
    const cleanContent = chap.content
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    md += `${cleanContent.trim()}\n\n---\n\n`;
  }

  return md;
}

export function generatePlainTextManuscript(project: DocumentProject): string {
  const { metadata, chapters } = project;
  let txt = `${metadata.title.toUpperCase()}\n`;
  const numberedChaps = getExportNumberedChapters(chapters, metadata.language || 'English');
  if (metadata.subtitle) txt += `${metadata.subtitle}\n`;
    if (metadata.originalTitle) txt += `Original Name: ${metadata.originalTitle}\n`;
  txt += `By:\n${metadata.authors ? metadata.authors.split(';').map(s=>s.trim()).filter(Boolean).map(s=>'  '+s).join('\n') : ''}\n`;
  if (metadata.publisherName) txt += `Publisher: ${metadata.publisherName}\n`;
  if (metadata.publicationDate) txt += `Publication Date: ${metadata.publicationDate}\n`;
  if (metadata.isbn) txt += `ISBN: ${metadata.isbn}\n`;
    if (metadata.genre) txt += `Genre: ${metadata.genre}\n`;
    if (metadata.tags) txt += `Tags: ${metadata.tags}\n`;
  if (metadata.copyrightInfo) txt += `Copyright: ${metadata.copyrightInfo}\n`;
  if (metadata.license) txt += `License: ${metadata.license}\n`;
  if (metadata.publisherName) txt += `Publisher: ${metadata.publisherName}\n`;
    if (metadata.publicationDate) txt += `Publication Date: ${metadata.publicationDate}\n`;
    if (metadata.isbn) txt += `ISBN: ${metadata.isbn}\n`;
    if (metadata.copyrightInfo) txt += `Copyright: ${metadata.copyrightInfo}\n`;
    if (metadata.license) txt += `License: ${metadata.license}\n`;
    txt += `=========================================================\n\n`;

  for (const chap of chapters) {
    txt += `\n\n---------------------------------------------------------\n`;
    if (!chap.hideTitle) {
      txt += `${'  '.repeat(Math.max(chap.level - 1, 0))}${chap.title} (Level ${chap.level})\n`;
      txt += `---------------------------------------------------------\n\n`;
    }
    const cleanText = chap.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    txt += `${cleanText}\n`;
  }

  return txt;
}

function escapeHtml(str: any) {
  if (typeof str !== 'string') {
    if (Array.isArray(str)) {
      return str.map(item => typeof item === 'object' && item !== null && item.name ? escapeHtml(item.name) : escapeHtml(String(item))).join(', ');
    }
    return str === null || str === undefined ? '' : escapeHtml(String(str));
  }
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

