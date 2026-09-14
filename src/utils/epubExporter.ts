

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DocumentProject } from '../types';


function getChapterPrefix(lang: string, index: number): string {
  const num = index;
  switch (lang) {
    case 'en': return `Chapter ${num}: `;
    case 'bn': return `অধ্যায় ${num.toLocaleString('bn-BD')}: `;
    case 'ar': return `الفصل ${num.toLocaleString('ar-EG')}: `;
    case 'fr': return `Chapitre ${num}: `;
    case 'es': return `Capítulo ${num}: `;
    case 'pt': return `Capítulo ${num}: `;
    case 'hi': return `अध्याय ${num}: `;
    case 'ur': return `باب ${num.toLocaleString('ar-EG')}: `;
    case 'id': return `Bab ${num}: `;
    case 'ru': return `Глава ${num}: `;
    case 'other': return '';
    default: return '';
  }
}


function localizeNumber(num: string | number, lang: string) {
  const numStr = String(num);
  if (lang === 'bn' || lang === 'Bengali' || lang === 'Bangla') {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return numStr.replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  }
  if (lang === 'ar' || lang === 'Arabic') {
    const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return numStr.replace(/\d/g, (d) => arDigits[parseInt(d, 10)]);
  }
  return numStr;
}

export async function generateEpubBlob(project: DocumentProject): Promise<Blob> {
  const metadata = project.metadata;

  const zip = new JSZip();

  // 1. mimetype (must be uncompressed, but jszip handles it if it's the first file)
  zip.file('mimetype', 'application/epub+zip');

  // 2. META-INF/container.xml
  const metaInf = zip.folder('META-INF');
  metaInf?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS structure
  const oebps = zip.folder('OEBPS');
  
  // Generate content for each chapter
  let spineItems = '';
  let manifestItems = '';
  
  let tocNavMap = '';
  let tocStack: number[] = [];
  let htmlTocStack: number[] = [];
  let playOrder = 1;
  let chapterCounters = [0, 0, 0, 0, 0, 0, 0, 0]; // Supports up to 8 levels

  
  let imageCounter = 0;
  const imagesFolder = oebps?.folder('images');
  let coverMeta = '';

  // Process Cover Image
  if (metadata.cover && metadata.cover.imageUrl && metadata.cover.imageUrl.startsWith('data:image/')) {
    const mimeMatch = metadata.cover.imageUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (mimeMatch) {
      const ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];
      const base64Data = mimeMatch[2];
      imagesFolder?.file(`cover.${ext}`, base64Data, { base64: true });
      manifestItems += `    <item id="cover-image" href="images/cover.${ext}" media-type="image/${mimeMatch[1]}" properties="cover-image"/>\n`;
      manifestItems += `    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n`;
      coverMeta = '<meta name="cover" content="cover-image" />';
      
      const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <style type="text/css">
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100%; }
  
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
  <img src="images/cover.${ext}" alt="Cover Image" />
</body>
</html>`;
      oebps?.file('cover.xhtml', coverHtml);
      spineItems += `    <itemref idref="cover" linear="yes"/>\n`;
    }
  }

  // Create HTML TOC
  manifestItems += `    <item id="toc-html" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n`;
  spineItems += `    <itemref idref="toc-html" linear="yes"/>\n`;
  
  let htmlTocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <style>
    body { font-family: 'Georgia', 'SolaimanLipi', 'Scheherazade New', serif; margin: 2em; }
    h1 { text-align: center; margin-bottom: 1.5em; }
    .toc-list { list-style: none; padding: 0; }
    .toc-item { margin-bottom: 0.5em; font-size: 1.1em; }
    a { text-decoration: none; color: #000; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Table of Contents</h1>
  <nav epub:type="toc" id="toc">
    <ol class="toc-list">`;


  project.chapters.forEach((chapter, index) => {
    const chapterId = `chapter_${index}`;
    const chapterFilename = `${chapterId}.html`;

    
    let prefix = '';
    let isBold = false;
    let currentLevel = chapter.level || 0;

    if (currentLevel === 0) {
      isBold = true;
      chapterCounters[0]++;
      // Reset deeper levels
      chapterCounters.fill(0, 1);
    } else {
      chapterCounters[currentLevel]++;
      chapterCounters.fill(0, currentLevel + 1);
      
      let parts = [];
      for (let i = 1; i <= currentLevel; i++) {
        // If a higher level was skipped, just show 0 or skip it? Let's just include it.
        parts.push(chapterCounters[i]);
      }
      prefix = parts.join('.') + '. ';
      prefix = localizeNumber(prefix, metadata.language || '');
    }

    const displayTitle = chapter.title || 'Untitled';
    const finalHtmlTocTitle = isBold ? `<strong>${escapeXml(displayTitle)}</strong>` : `${prefix}${escapeXml(displayTitle)}`;
    const finalNcxTitle = `${prefix}${escapeXml(displayTitle)}`;

    // Add to manifest
    manifestItems += `    <item id="${chapterId}" href="${chapterFilename}" media-type="application/xhtml+xml"/>\n`;
    
    // Add to spine
    spineItems += `    <itemref idref="${chapterId}"/>\n`;

    // Add to TOC
    if (!chapter.hideTitle) {
      
      // Close navPoints until we are at the right level for NCX
      while (tocStack.length > 0 && tocStack[tocStack.length - 1] >= currentLevel) {
        tocNavMap += `    </navPoint>\n`;
        tocStack.pop();
      }

      tocNavMap += `    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}">
      <navLabel><text>${finalNcxTitle}</text></navLabel>
      <content src="${chapterFilename}"/>
    </navPoint>\n`;
      
      tocStack.push(currentLevel);
      playOrder++;
      
      // Indent HTML TOC visually
      const indent = currentLevel * 1.5;
      htmlTocContent += `\n      <li class="toc-item" style="margin-left: ${indent}em;"><a href="${chapterFilename}">${finalHtmlTocTitle}</a></li>`;
    }


    let chapterContent = chapter.content;

    // Fix XHTML unclosed tags (<br>, <hr>)
    chapterContent = chapterContent.replace(/<br\s*>/gi, '<br/>');
    chapterContent = chapterContent.replace(/<hr([^>]*)>/gi, (match, attrs) => {
       if (attrs.trim().endsWith('/')) return match;
       return `<hr${attrs} />`;
    });

    // Extract base64 images and save to EPUB images folder
    chapterContent = chapterContent.replace(/<img([^>]+)>/gi, (match, attrs) => {
      let newAttrs = attrs;
      if (!newAttrs.trim().endsWith('/')) {
        newAttrs += ' /';
      }
      
      const srcMatch = newAttrs.match(/src="([^"]+)"/);
      if (srcMatch) {
        const src = srcMatch[1];
        if (src.startsWith('data:image/')) {
          const mimeMatch = src.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
          if (mimeMatch) {
            const ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];
            const base64Data = mimeMatch[2];
            const imageName = `img_${imageCounter}.${ext}`;
            
            imagesFolder?.file(imageName, base64Data, { base64: true });
            manifestItems += `    <item id="img_${imageCounter}" href="images/${imageName}" media-type="image/${mimeMatch[1]}"/>\n`;
            
            newAttrs = newAttrs.replace(src, `images/${imageName}`);
            imageCounter++;
          }
        }
      }
      return `<img${newAttrs}>`;
    });

    let bodyHtml = '';
    if (chapter.level === 0) {
      bodyHtml = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; text-align: center;">
          <h1 style="font-size: 1.833em; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; padding-top: 30vh;">${escapeXml(chapter.title)}</h1>
        </div>
      `;
    } else {
      bodyHtml = `
        ${chapter.hideTitle ? '' : `<h1>${finalNcxTitle}</h1>`}
        ${chapterContent}
      `;
    }


    const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" dir="auto">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <style>
    body, div, h1, h2, h3, h4, h5, h6, li, th, td, blockquote {
      font-family: 'Georgia', 'SolaimanLipi', 'Scheherazade New', serif;
      unicode-bidi: plaintext;
      text-align: start;
    }
    p {
      font-family: 'Georgia', 'SolaimanLipi', 'Scheherazade New', serif;
      unicode-bidi: plaintext;
      text-align: justify;
      text-justify: inter-word;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    oebps?.file(chapterFilename, xhtmlContent);
  });

  // Create content.opf
  const title = project.metadata.title ? project.metadata.title : (project.id || 'Untitled Document');
  
  const extractList = (str: any) => {
    if (!str) return [];
    if (typeof str !== 'string') return [];
    return str.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  };

  const authorsList = extractList(project.metadata.authors);
  if (authorsList.length === 0) authorsList.push('Unknown Author');

  const tagsList = extractList(project.metadata.tags);
  const translatorsList = extractList(project.metadata.translators);

  const dcCreators = authorsList.map(name => `<dc:creator opf:role="aut" opf:file-as="${escapeXml(name)}">${escapeXml(name)}</dc:creator>`).join('\n    ');
  const dcSubjects = tagsList.map(tag => `<dc:subject>${escapeXml(tag)}</dc:subject>`).join('\n    ');
  const dcGenre = project.metadata.genre ? `<dc:type>${escapeXml(project.metadata.genre)}</dc:type>` : '';
  const dcTranslators = translatorsList.map(name => `<dc:contributor opf:role="trl" opf:file-as="${escapeXml(name)}">${escapeXml(name)}</dc:contributor>`).join('\n    ');

  // Close remaining navPoints
  while (tocStack.length > 0) {
    tocNavMap += `    </navPoint>\n`;
    tocStack.pop();
  }

  // Close remaining HTML TOC tags
  while (htmlTocStack.length > 1) {
    htmlTocContent += `</li>\n</ol>\n`;
    htmlTocStack.pop();
  }
  if (htmlTocStack.length === 1) {
    htmlTocContent += `</li>\n`;
    htmlTocStack.pop();
  }

  htmlTocContent += `
    </ol>
  </nav>
</body>
</html>`;
  oebps?.file('toc.xhtml', htmlTocContent);

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    ${dcCreators}
${dcSubjects ? '    ' + dcSubjects : ''}
${dcTranslators ? '    ' + dcTranslators : ''}
    <dc:language>${metadata.language && metadata.language !== 'other' ? metadata.language : (metadata.customLanguage || 'en')}</dc:language>
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : '12345-67890'}</dc:identifier>
      ${coverMeta}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItems}  </spine>
</package>`;

  oebps?.file('content.opf', contentOpf);

  // Create toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345-67890"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${tocNavMap}  </navMap>
</ncx>`;

  oebps?.file('toc.ncx', tocNcx);

  // Generate the zip and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
    return content;
  }

  export async function exportToEpub(project: DocumentProject) {
    const blob = await generateEpubBlob(project);
    const title = project.metadata.title || 'Untitled';
    saveAs(blob, `${title.replace(/[<>:"/\\|?*]+/g, '_')}.epub`);
  }

function escapeXml(unsafe: any) {
  if (typeof unsafe !== 'string') {
    if (Array.isArray(unsafe)) {
      return unsafe.map(item => typeof item === 'object' && item !== null && item.name ? escapeXml(item.name) : escapeXml(String(item))).join(', ');
    }
    return unsafe === null || unsafe === undefined ? '' : escapeXml(String(unsafe));
  }
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}
