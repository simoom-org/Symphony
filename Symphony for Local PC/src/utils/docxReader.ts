import JSZip from 'jszip';
import { DocumentProject, ChapterItem } from '../types';
import { redistributeFootnotes } from './footnoteHelper';



class OOXMLParser {
  private zip: JSZip;
  private styles: Record<string, any> = {};
  private footnotes: Record<string, string> = {};
  
  constructor(zip: JSZip) {
    this.zip = zip;
  }
  
  async parseStyles() {
    const stylesFile = this.zip.file('word/styles.xml');
    if (!stylesFile) return;
    const xml = await stylesFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const styleNodes = doc.getElementsByTagName('w:style');
    for (let i = 0; i < styleNodes.length; i++) {
      const node = styleNodes[i];
      const styleId = node.getAttribute('w:styleId');
      if (!styleId) continue;
      
      const nameNode = node.getElementsByTagName('w:name')[0];
      const basedOnNode = node.getElementsByTagName('w:basedOn')[0];
      const outlineLvlNode = node.getElementsByTagName('w:outlineLvl')[0];
      
      this.styles[styleId] = {
        id: styleId,
        name: nameNode ? nameNode.getAttribute('w:val') : null,
        basedOn: basedOnNode ? basedOnNode.getAttribute('w:val') : null,
        outlineLvl: outlineLvlNode ? parseInt(outlineLvlNode.getAttribute('w:val') || '0', 10) : null
      };
    }
    
    // Resolve inheritance for outlineLvl
    for (const styleId in this.styles) {
      let current = this.styles[styleId];
      let depth = 0;
      while (current.outlineLvl === null && current.basedOn && this.styles[current.basedOn] && depth < 10) {
        current.outlineLvl = this.styles[current.basedOn].outlineLvl;
        current = this.styles[current.basedOn];
        depth++;
      }
    }
  }
  
  resolveHeadingLevel(styleId: string | null): number | null {
    if (!styleId) return null;
    const style = this.styles[styleId];
    
    // 1. outlineLvl
    if (style && style.outlineLvl !== null) {
      const lvl = style.outlineLvl + 1;
      if (lvl >= 1 && lvl <= 6) return lvl;
    }
    
    // 2. style name or ID heuristics
    const name = (style && style.name ? style.name : styleId).toLowerCase();
    const match = name.match(/heading\s*(\d)/) || name.match(/heading(\d)/);
    if (match) {
      const lvl = parseInt(match[1], 10);
      if (lvl >= 1 && lvl <= 6) return lvl;
    }
    return null;
  }
  
  async parseFootnotes() {
    const fnFile = this.zip.file('word/footnotes.xml');
    if (!fnFile) return;
    const xml = await fnFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const fNodes = doc.getElementsByTagName('w:footnote');
    for (let i = 0; i < fNodes.length; i++) {
      const fnNode = fNodes[i];
      const id = fnNode.getAttribute('w:id');
      if (!id || id === '-1' || id === '0') continue; // skip separators
      
      let text = '';
      const tNodes = fnNode.getElementsByTagName('w:t');
      for (let j = 0; j < tNodes.length; j++) {
        text += tNodes[j].textContent || '';
      }
      this.footnotes[id] = escapeHtml(text);
    }
  }
  
  async parseDocument(title: string): Promise<ChapterItem[]> {
    const docFile = this.zip.file('word/document.xml');
    if (!docFile) throw new Error('Invalid DOCX: missing word/document.xml');
    
    const xml = await docFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const chapters: ChapterItem[] = [];
    let currentHtml: string[] = [];
    let currentFootnotes = new Map<string, string>();
    
    let chapterCounter = 1;
    let currentTitle = title;
    
    const paragraphs = doc.getElementsByTagName('w:p');
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pPr = p.getElementsByTagName('w:pPr')[0];
      
      let isPageBreak = false;
      let pStyleId: string | null = null;
      let jc = 'left';
      
      if (pPr) {
        if (pPr.getElementsByTagName('w:pageBreakBefore').length > 0) isPageBreak = true;
        
        const jcNode = pPr.getElementsByTagName('w:jc')[0];
        if (jcNode) {
          const val = jcNode.getAttribute('w:val');
          if (val === 'center') jc = 'center';
          else if (val === 'right' || val === 'end') jc = 'right';
          else if (val === 'both' || val === 'distribute') jc = 'justify';
        }
        
        const pStyleNode = pPr.getElementsByTagName('w:pStyle')[0];
        if (pStyleNode) pStyleId = pStyleNode.getAttribute('w:val');
      }
      
      const brs = p.getElementsByTagName('w:br');
      for (let b = 0; b < brs.length; b++) {
        if (brs[b].getAttribute('w:type') === 'page') isPageBreak = true;
      }
      if (p.getElementsByTagName('w:lastRenderedPageBreak').length > 0) isPageBreak = true;
      
      if (isPageBreak && currentHtml.length > 0) {
        chapters.push(this.finalizeChapter(chapterCounter, currentTitle, currentHtml, currentFootnotes));
        chapterCounter++;
        currentTitle = `Chapter ${chapterCounter}`;
        currentHtml = [];
        currentFootnotes = new Map();
      }
      
      const headingLevel = this.resolveHeadingLevel(pStyleId);
      const htmlTag = headingLevel ? `h${headingLevel}` : 'p';
      let classStr = '';
      if (!headingLevel && jc !== 'left') {
        classStr = ` class="text-${jc}" style="text-align: ${jc};"`;
      }
      
      let pContent = '';
      const runs = Array.from(p.childNodes).filter(n => n.nodeName === 'w:r');
      for (const r of runs) {
        const rEl = r as Element;
        const rPr = rEl.getElementsByTagName('w:rPr')[0];
        let isBold = false;
        let isItalic = false;
        if (rPr) {
          const bNode = rPr.getElementsByTagName('w:b')[0];
          isBold = !!bNode && bNode.getAttribute('w:val') !== '0' && bNode.getAttribute('w:val') !== 'false';
          const iNode = rPr.getElementsByTagName('w:i')[0];
          isItalic = !!iNode && iNode.getAttribute('w:val') !== '0' && iNode.getAttribute('w:val') !== 'false';
        }
        
        let rText = '';
        const tNodes = rEl.getElementsByTagName('w:t');
        for (let j = 0; j < tNodes.length; j++) {
          rText += escapeHtml(tNodes[j].textContent || '');
        }
        
        const fnRefs = rEl.getElementsByTagName('w:footnoteReference');
        for (let j = 0; j < fnRefs.length; j++) {
          const fnId = fnRefs[j].getAttribute('w:id');
          if (fnId && this.footnotes[fnId]) {
            const displayNum = currentFootnotes.size + 1;
            const symId = fnId;
            currentFootnotes.set(symId, this.footnotes[fnId]);
            rText += `<sup class="footnote-ref" id="ref-docx-${symId}"><a href="#fn-docx-${symId}">${displayNum}</a></sup>`;
          }
        }
        
        if (rText) {
          if (isBold) rText = `<strong>${rText}</strong>`;
          if (isItalic) rText = `<em>${rText}</em>`;
          pContent += rText;
        }
      }
      
      if (headingLevel && pContent.replace(/<[^>]+>/g, '').trim() && currentHtml.length === 0) {
        currentTitle = pContent.replace(/<[^>]+>/g, '').trim();
      }
      
      if (pContent.trim()) {
        currentHtml.push(`<${htmlTag}${classStr}>${pContent}</${htmlTag}>`);
      }
    }
    
    if (currentHtml.length > 0) {
      chapters.push(this.finalizeChapter(chapterCounter, currentTitle, currentHtml, currentFootnotes));
    }
    
    if (chapters.length === 0) {
      chapters.push({
        id: `chap-${Date.now()}-1`,
        title: title,
        content: '<p>No content found</p>',
        level: 1,
        isExpanded: true,
        updatedAt: new Date().toISOString()
      });
    }
    
    return chapters;
  }
  
  private finalizeChapter(counter: number, title: string, htmlNodes: string[], footnotes: Map<string, string>): ChapterItem {
    let content = htmlNodes.join('\n');
    if (footnotes.size > 0) {
      content += `\n<hr class="w-1/4 mt-12 mb-4 border-slate-300 footnotes-divider" contenteditable="false"><div class="footnotes-section text-sm text-slate-600 mt-4">`;
      let i = 1;
      footnotes.forEach((text, id) => {
        content += `\n<div id="fn-docx-${id}" class="footnote-item"><a href="#ref-docx-${id}" contenteditable="false"><sup>${i}</sup></a> <span class="footnote-text" contenteditable="true">${text}</span></div>`;
        i++;
      });
      content += `\n</div>`;
    }
    
    return {
      id: `chap-${Date.now()}-${counter}`,
      title: title,
      content: content,
      level: 1,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    };
  }
}

export interface ImportResult {
  title: string;
  chapters: ChapterItem[];
  importedFormat: 'docx' | 'txt' | 'html' | 'md' | 'symphony' | 'json' | 'epub';
  fullProject?: DocumentProject;
}

export async function parseImportedFile(file: File): Promise<ImportResult> {
  const fileName = file.name;
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  if (extension === '.symphony' || extension === '.json') {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data && data.chapters) {
        const { validateAndUpgradeProject } = await import('./storage');
        const upgraded = validateAndUpgradeProject(data);
        return {
          title: upgraded.metadata.title || file.name.replace(/\.(symphony|json)$/i, ''),
          chapters: upgraded.chapters,
          importedFormat: extension === '.symphony' ? 'symphony' : 'json',
          fullProject: upgraded
        };
      }
    } catch (e) {
      throw new Error('Invalid project file format.');
    }
  }

  if (extension === '.epub') {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) throw new Error('Invalid EPUB: Missing container.xml');
    const containerXml = await containerFile.async('text');
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) throw new Error('Invalid EPUB: Cannot find rootfile in container.xml');
    const opfPath = rootfileMatch[1];
    
    const opfFile = zip.file(opfPath);
    if (!opfFile) throw new Error('Invalid EPUB: Missing OPF file');
    const opfXml = await opfFile.async('text');
    
    const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    const title = titleMatch ? titleMatch[1] : file.name.replace(/\.epub$/i, '');
    
    const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"/gi;
    const manifestMap: Record<string, string> = {};
    let m;
    while ((m = itemRegex.exec(opfXml)) !== null) {
       manifestMap[m[1]] = m[2].split('#')[0]; // simple href extract
    }
    
    const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"/gi;
    const spine: string[] = [];
    while ((m = spineRegex.exec(opfXml)) !== null) {
       spine.push(m[1]);
    }
    
    const chapters: ChapterItem[] = [];
    let chapCounter = 1;
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    
    for (const idref of spine) {
       let href = manifestMap[idref];
       if (!href) continue;
       // URL decode href in case it has %20
       try { href = decodeURIComponent(href); } catch(e){}
       
       const fullPath = opfDir + href;
       const htmlFile = zip.file(fullPath);
       if (!htmlFile) continue;
       
       const htmlContent = await htmlFile.async('text');
       const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
       let rawHtml = bodyMatch ? bodyMatch[1] : htmlContent;
       
       // Process images: replace relative src with base64 data URI
       // Handle both <img src="..."> and SVG <image href="..."> or <image xlink:href="...">
       const imgRegex = /<(?:img|image)[^>]+(?:src|href|xlink:href)=["']([^"']+)["']/gi;
       let imgMatch;
       while ((imgMatch = imgRegex.exec(rawHtml)) !== null) {
         let imgSrc = imgMatch[1];
         try { imgSrc = decodeURIComponent(imgSrc); } catch(e){}
         
         // resolve path relative to current html file
         const currentDir = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/') + 1) : '';
         
         // basic path resolution (handle ../)
         let resolvedPath = currentDir + imgSrc;
         while (resolvedPath.includes('../')) {
           resolvedPath = resolvedPath.replace(/[^\/]+\/\.\.\//, '');
         }
         if (resolvedPath.startsWith('../')) resolvedPath = resolvedPath.replace('../', '');
         
         const imgFile = zip.file(resolvedPath);
         if (imgFile) {
           const imgBuffer = await imgFile.async('uint8array');
           
           let mime = 'image/jpeg';
           if (resolvedPath.toLowerCase().endsWith('.png')) mime = 'image/png';
           else if (resolvedPath.toLowerCase().endsWith('.gif')) mime = 'image/gif';
           else if (resolvedPath.toLowerCase().endsWith('.svg')) mime = 'image/svg+xml';
           else if (resolvedPath.toLowerCase().endsWith('.webp')) mime = 'image/webp';
           
           // Convert Uint8Array to base64
           let binary = '';
           for (let i = 0; i < imgBuffer.byteLength; i++) {
               binary += String.fromCharCode(imgBuffer[i]);
           }
           const base64 = btoa(binary);
           const dataUri = `data:${mime};base64,${base64}`;
           
           rawHtml = rawHtml.replace(imgMatch[0], imgMatch[0].replace(imgMatch[1], dataUri));
         }
       }
       
       // Attempt to derive chapter name from H1/H2
       const h1Match = rawHtml.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
       let chapTitle = `Chapter ${chapCounter}`;
       if (h1Match) chapTitle = h1Match[1].replace(/<[^>]+>/g, '').trim() || chapTitle;
       
       // Clean up HTML a bit for the editor
       rawHtml = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
       
       chapters.push({
          id: `chap-${Date.now()}-${chapCounter}`,
          title: chapTitle,
          content: rawHtml,
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString()
       });
       chapCounter++;
    }
    
    return {
      title,
      chapters: chapters.length > 0 ? chapters : [{ id: `chap-${Date.now()}-1`, title, content: '<p>No content found</p>', level: 1, isExpanded: true, updatedAt: new Date().toISOString() }],
      importedFormat: 'epub'
    };
  }

  if (extension === '.docx') {
    const arrayBuffer = await file.arrayBuffer();
    const JSZipModule = await import('jszip');
    const zip = await JSZipModule.default.loadAsync(arrayBuffer);
    
    const parser = new OOXMLParser(zip);
    await parser.parseStyles();
    await parser.parseFootnotes();
    const chapters = await parser.parseDocument(file.name.replace(/\.docx$/i, ''));
    
    return {
      title: file.name.replace(/\.docx$/i, ''),
      chapters,
      importedFormat: 'docx'
    };
  }

  if (extension === '.html' || extension === '.htm') {
    const text = await file.text();
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const rawHtml = bodyMatch ? bodyMatch[1] : text;
    const chapters = splitHtmlIntoChapters(rawHtml, file.name.replace(/\.html?$/i, ''));
    return {
      title: file.name.replace(/\.html?$/i, ''),
      chapters,
      importedFormat: 'html'
    };
  }

  // Plain Text / Markdown
  const text = await file.text();
  const formattedHtml = convertTextToHtml(text);
  const chapters = splitTextIntoChapters(text, file.name.replace(/\.(txt|md)$/i, ''));

  return {
    title: file.name.replace(/\.(txt|md)$/i, ''),
    chapters: chapters.length > 0 ? chapters : [
      {
        id: `chap-${Date.now()}-1`,
        title: 'Imported Document',
        content: formattedHtml,
        level: 1,
        isExpanded: true,
        updatedAt: new Date().toISOString()
      }
    ],
    importedFormat: extension === '.md' ? 'md' : 'txt'
  };
}

function convertTextToHtml(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) {
        return `<h2>${escapeHtml(trimmed.substring(2))}</h2>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h3>${escapeHtml(trimmed.substring(3))}</h3>`;
      }
      return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitHtmlIntoChapters(html: string, defaultTitle: string): ChapterItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // --- FOOTNOTE EXTRACTION ---
  const footnoteMap = new Map<string, string>();
  const mammothFootnotesList = doc.querySelectorAll('li[id^="footnote-"]');
  mammothFootnotesList.forEach(li => {
    const id = li.id; // "footnote-1"
    const backLink = li.querySelector(`a[href^="#footnote-ref-"]`);
    if (backLink) {
      const parent = backLink.parentNode;
      backLink.remove();
      if (parent && parent.nodeName.toLowerCase() === 'p' && parent.textContent?.trim() === '') {
        parent.parentNode?.removeChild(parent);
      }
    }
    footnoteMap.set(id, li.innerHTML.trim());
  });

  doc.querySelectorAll('ol, section').forEach(el => {
    if (el.querySelector('li[id^="footnote-"]')) el.remove();
  });

  const mammothRefs = doc.querySelectorAll('a[id^="footnote-ref-"]');
  mammothRefs.forEach(aRef => {
    const fnIdMammoth = aRef.getAttribute('href')?.replace('#', '');
    if (fnIdMammoth && footnoteMap.has(fnIdMammoth)) {
      const symId = fnIdMammoth.replace('footnote-', '');
      const symRefId = `ref-docx-${symId}`;
      const symFnId = `fn-docx-${symId}`;
      
      const sup = doc.createElement('sup');
      sup.className = 'footnote-ref';
      sup.id = symRefId;
      sup.innerHTML = `<a href="#${symFnId}">${symId}</a>`;
      
      // Mammoth usually wraps aRef in <sup>, so replace the parent if it is <sup>
      if (aRef.parentNode?.nodeName.toLowerCase() === 'sup') {
        aRef.parentNode.parentNode?.replaceChild(sup, aRef.parentNode);
      } else {
        aRef.parentNode?.replaceChild(sup, aRef);
      }
    }
  });

  function finalizeChapterContent(nodes: string[]): string {
    let htmlContent = nodes.join('');
    const matches = [...htmlContent.matchAll(/id="ref-docx-([^"]+)"/g)];
    if (matches.length > 0) {
      let fnsHtml = `<hr class="w-1/4 mt-12 mb-4 border-slate-300 footnotes-divider" contenteditable="false"><div class="footnotes-section text-sm text-slate-600 mt-4">`;
      
      matches.forEach(m => {
        const symId = m[1];
        const fnIdMammoth = `footnote-${symId}`;
        const fnTextHtml = footnoteMap.get(fnIdMammoth) || '';
        const cleanText = fnTextHtml.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim();

        fnsHtml += `<div id="fn-docx-${symId}" class="footnote-item"><a href="#ref-docx-${symId}" contenteditable="false"><sup>${symId}</sup></a> <span class="footnote-text" contenteditable="true">${cleanText}</span></div>`;
      });
      fnsHtml += `</div>`;
      htmlContent += fnsHtml;
    }
    return htmlContent;
  }
  // --- END FOOTNOTE EXTRACTION ---

  const pageBreaks = Array.from(doc.querySelectorAll('hr, .page-break, [style*="page-break-before: always"], [style*="break-before: page"]')).length;
  
  if (pageBreaks === 0) {
    return [
      {
        id: `chap-${Date.now()}-1`,
        title: defaultTitle || 'Chapter 1',
        content: finalizeChapterContent([doc.body.innerHTML || `<p>${defaultTitle}</p>`]),
        level: 1,
        isExpanded: true,
        updatedAt: new Date().toISOString()
      }
    ];
  }

  const chapters: ChapterItem[] = [];
  let currentTitle = defaultTitle;
  let currentLevel = 1;
  let currentNodes: string[] = [];

  const childNodes = Array.from(doc.body.childNodes);

  for (let i = 0; i < childNodes.length; i++) {
    const node = childNodes[i];
    const nodeName = node.nodeName.toLowerCase();

    const classNameStr = (node as HTMLElement).className || '';
    const isPageBreak = nodeName === 'hr' || (node.nodeType === Node.ELEMENT_NODE && (
      (node as HTMLElement).style?.pageBreakBefore === 'always' || 
      (node as HTMLElement).style?.breakBefore === 'page' ||
      (typeof classNameStr === 'string' && classNameStr.includes('page-break'))
    ));

    const isChapterStart = isPageBreak;

    if (isChapterStart) {
      if (currentNodes.length > 0) {
        chapters.push({
          id: `chap-${Date.now()}-${chapters.length + 1}`,
          title: currentTitle,
          content: finalizeChapterContent(currentNodes),
          level: currentLevel,
          isExpanded: true,
          updatedAt: new Date().toISOString()
        });
        currentNodes = [];
      }
      
      currentTitle = `Chapter ${chapters.length + 1}`;
      currentLevel = 1;
      // Do not push the hr node to the new chapter to keep it clean
    } else {
      // For the first node after a page break, if it's a heading, we could potentially use it as the title.
      // But user requested to split ONLY by page break, so we don't start chapters on headings.
      // We just push everything to currentNodes.
      if (node.nodeType === Node.ELEMENT_NODE) {
        currentNodes.push((node as HTMLElement).outerHTML || '');
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        currentNodes.push(`<p>${escapeHtml(node.textContent)}</p>`);
      }
    }
  }

  if (currentNodes.length > 0) {
    chapters.push({
      id: `chap-${Date.now()}-${chapters.length + 1}`,
      title: currentTitle,
      content: finalizeChapterContent(currentNodes),
      level: currentLevel,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    });
  }

  let finalChapters = chapters.length > 0 ? chapters : [
    {
      id: `chap-${Date.now()}-1`,
      title: defaultTitle,
      content: finalizeChapterContent([html]),
      level: 1,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    }
  ];

  const rawContents = finalChapters.map(c => c.content);
  const redistributed = redistributeFootnotes(rawContents);
  finalChapters.forEach((c, i) => c.content = redistributed[i]);

  return finalChapters;
}

function splitTextIntoChapters(text: string, defaultTitle: string): ChapterItem[] {
  const lines = text.split('\n');
  const chapters: ChapterItem[] = [];
  let currentTitle = defaultTitle;
  let currentLevel = 1;
  let currentBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isTextPageBreak = trimmed === '\f' || trimmed === '***' || trimmed === '---' || trimmed === '___';
    
    if (/^(chapter|part|section|\d+\.)\s+/i.test(trimmed) || trimmed.startsWith('#') || isTextPageBreak) {
      if (currentBuffer.length > 0) {
        chapters.push({
          id: `chap-${Date.now()}-${chapters.length + 1}`,
          title: currentTitle,
          content: convertTextToHtml(currentBuffer.join('\n')),
          level: currentLevel,
          isExpanded: true,
          updatedAt: new Date().toISOString()
        });
        currentBuffer = [];
      }
      
      if (isTextPageBreak && !trimmed.startsWith('#') && !/^(chapter|part|section|\d+\.)\s+/i.test(trimmed)) {
        currentTitle = `Chapter ${chapters.length + 1}`;
        currentLevel = 1;
      } else {
        const matchHash = trimmed.match(/^(#+)\s*(.*)$/);
        if (matchHash) {
          currentLevel = matchHash[1].length;
          currentTitle = matchHash[2] || `Section ${chapters.length + 1}`;
        } else {
          currentTitle = trimmed;
          currentLevel = /^(section|\d+\.\d+)/i.test(trimmed) ? 2 : 1;
        }
      }
    } else {
      currentBuffer.push(line);
    }
  }

  if (currentBuffer.length > 0) {
    chapters.push({
      id: `chap-${Date.now()}-${chapters.length + 1}`,
      title: currentTitle,
      content: convertTextToHtml(currentBuffer.join('\n')),
      level: currentLevel,
      isExpanded: true,
      updatedAt: new Date().toISOString()
    });
  }

  return chapters;
}

