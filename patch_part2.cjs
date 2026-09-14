const fs = require('fs');

let exportEngine = fs.readFileSync('src/utils/exportEngine.ts', 'utf8');

// HTML Export
exportEngine = exportEngine.replace(
  /const subtitleHtml = metadata\.subtitle \? `<h2 class="doc-subtitle">([^`]+)` : '';/,
  'const subtitleHtml = metadata.subtitle ? `<h2 class="doc-subtitle">${escapeHtml(metadata.subtitle)}</h2>` : \'\';\n      const originalTitleHtml = metadata.originalTitle ? `<h3 class="doc-original-title" style="margin-top:0.5em; color:#555; font-weight:normal;">Original Name: ${escapeHtml(metadata.originalTitle)}</h3>` : \'\';'
);
exportEngine = exportEngine.replace(
  /<h1 class="doc-title">\$\{escapeHtml\(metadata\.title\)\}<\/h1>\\n\s*\$\{subtitleHtml\}/,
  '<h1 class="doc-title">${escapeHtml(metadata.title)}</h1>\n          ${subtitleHtml}\n          ${originalTitleHtml}'
);

exportEngine = exportEngine.replace(
  /const isbnHtml = metadata\.isbn \? `<p class="doc-isbn"><strong>ISBN:<\/strong> \$\{escapeHtml\(metadata\.isbn\)\}<\/p>` : '';/,
  'const isbnHtml = metadata.isbn ? `<p class="doc-isbn"><strong>ISBN:</strong> ${escapeHtml(metadata.isbn)}</p>` : \'\';\n      const genreHtml = metadata.genre ? `<p class="doc-genre"><strong>Genre:</strong> ${escapeHtml(metadata.genre)}</p>` : \'\';\n      const tagsHtml = metadata.tags ? `<p class="doc-tags"><strong>Tags:</strong> ${escapeHtml(metadata.tags)}</p>` : \'\';'
);
exportEngine = exportEngine.replace(
  /\$\{isbnHtml\}\\n\s*\$\{copyrightHtml\}/,
  '${isbnHtml}\n          ${genreHtml}\n          ${tagsHtml}\n          ${copyrightHtml}'
);


// Markdown Export
exportEngine = exportEngine.replace(
  /if \(metadata\.subtitle\) md \+= `\*\$\{metadata\.subtitle\}\*\\n\\n`;/,
  'if (metadata.subtitle) md += `*${metadata.subtitle}*\\n\\n`;\n    if (metadata.originalTitle) md += `**Original Name:** ${metadata.originalTitle}\\n`;'
);
exportEngine = exportEngine.replace(
  /if \(metadata\.isbn\) md \+= `\*\*ISBN:\*\* \$\{metadata\.isbn\}\\n`;/,
  'if (metadata.isbn) md += `**ISBN:** ${metadata.isbn}\\n`;\n    if (metadata.genre) md += `**Genre:** ${metadata.genre}\\n`;\n    if (metadata.tags) md += `**Tags:** ${metadata.tags}\\n`;'
);

// TXT Export
exportEngine = exportEngine.replace(
  /if \(metadata\.subtitle\) txt \+= `\$\{metadata\.subtitle\}\\n`;/,
  'if (metadata.subtitle) txt += `${metadata.subtitle}\\n`;\n    if (metadata.originalTitle) txt += `Original Name: ${metadata.originalTitle}\\n`;'
);
exportEngine = exportEngine.replace(
  /if \(metadata\.isbn\) txt \+= `ISBN: \$\{metadata\.isbn\}\\n`;/,
  'if (metadata.isbn) txt += `ISBN: ${metadata.isbn}\\n`;\n    if (metadata.genre) txt += `Genre: ${metadata.genre}\\n`;\n    if (metadata.tags) txt += `Tags: ${metadata.tags}\\n`;'
);

fs.writeFileSync('src/utils/exportEngine.ts', exportEngine);


let epubExporter = fs.readFileSync('src/utils/epubExporter.ts', 'utf8');
// Title Page
epubExporter = epubExporter.replace(
  /<h1 class="book-title">\$\{escapeXml\(title\)\}<\/h1>`;/,
  '<h1 class="book-title">${escapeXml(title)}</h1>`;\n    if (project.metadata.originalTitle) {\n      titlePageContent += `\\n      <h3 class="book-original-title" style="margin-top:0.5em; color:#555; font-weight:normal;">Original Name: ${escapeXml(project.metadata.originalTitle)}</h3>`;\n    }'
);

// OPF Metadata
epubExporter = epubExporter.replace(
  /const dcSubjects = tagsList\.map\(tag => `<dc:subject>\$\{escapeXml\(tag\)\}<\/dc:subject>`\)\.join\('\\n    '\);/,
  'const dcSubjects = tagsList.map(tag => `<dc:subject>${escapeXml(tag)}</dc:subject>`).join(\'\\n    \');\n  const dcGenre = project.metadata.genre ? `<dc:type>${escapeXml(project.metadata.genre)}</dc:type>` : \'\';'
);
epubExporter = epubExporter.replace(
  /<\/dc:title>\\n\s*<dc:language>/,
  '</dc:title>\n    ${dcGenre}\n    <dc:language>'
);

fs.writeFileSync('src/utils/epubExporter.ts', epubExporter);

console.log("Successfully patched exportEngine.ts and epubExporter.ts");