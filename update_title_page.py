import os
import re

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "// Generate Title/Copyright Page"
end_marker = "  oebps?.file('title-page.xhtml', titlePageHtml);"

if start_marker in content and end_marker in content:
    pre_content = content[:content.index(start_marker)]
    post_content = content[content.index(end_marker):]
    
    new_block = """// Generate Title/Copyright Page
    const lang = metadata.language || 'en';
    const labels: Record<string, any> = {
      bn: {
        originalName: "মূল বইঃ",
        translator: "অনুবাদকঃ",
        publisher: "প্রকাশকঃ",
        pubDate: "প্রকাশকালঃ",
        license: "লাইসেন্সঃ",
        copyright: "কপিরাইটঃ"
      },
      en: {
        originalName: "Original Book:",
        translator: "Translated by:",
        publisher: "Publisher:",
        pubDate: "Publication Date:",
        license: "License:",
        copyright: "Copyright:"
      }
    };
    const l = labels[lang] || labels.en;

    const authorsHtml = project.metadata.authors ? 
      project.metadata.authors.split(';').map(s => `<div>${escapeXml(s.trim())}</div>`).filter(Boolean).join('') : 
      '<div>Unknown Author</div>';
      
    const translatorsHtml = project.metadata.translators ? 
      project.metadata.translators.split(';').map(s => `<div>${escapeXml(s.trim())}</div>`).filter(Boolean).join('') : 
      '';

    let titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml" dir="auto">
  <head>
    <title>Title Page</title>
    <style type="text/css">
      body { font-family: 'Georgia', 'SolaimanLipi', 'Scheherazade New', serif; text-align: center; margin: 2em; line-height: 1.6; }
      .title-section { margin-top: 10%; }
      h1 { font-size: 2em; margin-bottom: 0.2em; font-weight: bold; }
      h2 { font-size: 1.5em; font-weight: normal; margin-top: 0; color: #444; }
      h3 { font-size: 1.2em; font-weight: normal; margin-top: 1.5em; color: #555; }
      .author-section { margin-top: 15%; margin-bottom: 15%; }
      .authors { font-size: 1.3em; font-weight: bold; margin-bottom: 1em; }
      .translators { font-size: 1.1em; color: #333; margin-top: 1.5em; }
      .translator-label { font-weight: bold; margin-bottom: 0.5em; }
      .bottom-section { text-align: left; font-size: 0.9em; border-top: 1px solid #ccc; padding-top: 1.5em; margin-top: 15%; }
      .meta-line { margin-bottom: 0.5em; }
    </style>
  </head>
  <body>
    <div class="title-section">
      <h1>${escapeXml(title)}</h1>`;

    if (project.metadata.subtitle) {
      titlePageHtml += `
      <h2>${escapeXml(project.metadata.subtitle)}</h2>`;
    }
    if (project.metadata.originalTitle) {
      titlePageHtml += `
      <h3>${l.originalName} ${escapeXml(project.metadata.originalTitle)}</h3>`;
    }
    
    titlePageHtml += `
    </div>
    
    <div class="author-section">
      <div class="authors">${authorsHtml}</div>`;
      
    if (translatorsHtml) {
      titlePageHtml += `
      <div class="translators">
        <div class="translator-label">${l.translator}</div>
        ${translatorsHtml}
      </div>`;
    }
    
    titlePageHtml += `
    </div>
    
    <div class="bottom-section">`;
    
    if (project.metadata.publisherName) titlePageHtml += `
      <div class="meta-line"><strong>${l.publisher}</strong> ${escapeXml(project.metadata.publisherName)}</div>`;
    if (project.metadata.publicationDate) titlePageHtml += `
      <div class="meta-line"><strong>${l.pubDate}</strong> ${escapeXml(project.metadata.publicationDate)}</div>`;
    if (project.metadata.isbn) titlePageHtml += `
      <div class="meta-line"><strong>ISBN:</strong> ${escapeXml(project.metadata.isbn)}</div>`;
    if (project.metadata.license) titlePageHtml += `
      <div class="meta-line"><strong>${l.license}</strong> ${escapeXml(project.metadata.license)}</div>`;
    if (project.metadata.copyrightInfo) titlePageHtml += `
      <div class="meta-line"><strong>${l.copyright}</strong> ${escapeXml(project.metadata.copyrightInfo)}</div>`;
    
    titlePageHtml += `
    </div>
  </body>
  </html>`;
  
"""
    
    with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
        f.write(pre_content + new_block + post_content)
else:
    print("Could not find markers")