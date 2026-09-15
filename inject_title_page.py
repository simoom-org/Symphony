import os
import re

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to inject the creation of title-page.xhtml after cover.xhtml
pattern = r"(manifestItems \+= `    <item id=\"toc-html\" href=\"toc.xhtml\" media-type=\"application/xhtml\+xml\" properties=\"nav\"/>\\n`;)"

replacement = """
  // Generate Title/Copyright Page
  const authorsHtml = project.metadata.authors ? project.metadata.authors.split(';').map(s=>escapeXml(s.trim())).filter(Boolean).join('<br/>') : 'Unknown Author';
  const translatorsHtml = project.metadata.translators ? project.metadata.translators.split(';').map(s=>escapeXml(s.trim())).filter(Boolean).join('<br/>') : '';

  let titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" dir="auto">
<head>
  <title>Title Page</title>
  <style type="text/css">
    body { font-family: sans-serif; margin: 2em; text-align: center; line-height: 1.6; }
    h1 { font-size: 2em; margin-bottom: 0.2em; }
    h2 { font-size: 1.5em; font-weight: normal; margin-top: 0; color: #444; }
    h3 { font-size: 1.2em; font-weight: normal; margin-top: 1em; color: #555; }
    .authors { margin-top: 2em; font-size: 1.2em; font-weight: bold; }
    .translators { margin-top: 1em; font-size: 1.1em; color: #333; }
    .copyright { margin-top: 4em; font-size: 0.9em; text-align: left; border-top: 1px solid #ccc; padding-top: 1em; }
    .meta-line { margin-bottom: 0.5em; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>`;

  if (project.metadata.subtitle) {
    titlePageHtml += `\n  <h2>${escapeXml(project.metadata.subtitle)}</h2>`;
  }
  if (project.metadata.originalTitle) {
    titlePageHtml += `\n  <h3>Original Name: ${escapeXml(project.metadata.originalTitle)}</h3>`;
  }
  
  titlePageHtml += `\n  <div class="authors">${authorsHtml}</div>`;
  if (translatorsHtml) {
    titlePageHtml += `\n  <div class="translators">Translated by:<br/>${translatorsHtml}</div>`;
  }

  titlePageHtml += `\n  <div class="copyright">`;
  if (project.metadata.publisherName) titlePageHtml += `\n    <div class="meta-line"><strong>Publisher:</strong> ${escapeXml(project.metadata.publisherName)}</div>`;
  if (project.metadata.publicationDate) titlePageHtml += `\n    <div class="meta-line"><strong>Publication Date:</strong> ${escapeXml(project.metadata.publicationDate)}</div>`;
  if (project.metadata.isbn) titlePageHtml += `\n    <div class="meta-line"><strong>ISBN:</strong> ${escapeXml(project.metadata.isbn)}</div>`;
  if (project.metadata.genre) titlePageHtml += `\n    <div class="meta-line"><strong>Genre:</strong> ${escapeXml(project.metadata.genre)}</div>`;
  if (project.metadata.copyrightInfo) titlePageHtml += `\n    <div class="meta-line"><strong>Copyright:</strong> ${escapeXml(project.metadata.copyrightInfo)}</div>`;
  if (project.metadata.license) titlePageHtml += `\n    <div class="meta-line"><strong>License:</strong> ${escapeXml(project.metadata.license)}</div>`;
  
  titlePageHtml += `\n  </div>\n</body>\n</html>`;

  oebps?.file('title-page.xhtml', titlePageHtml);
  manifestItems += `    <item id="title-page" href="title-page.xhtml" media-type="application/xhtml+xml"/>\\n`;
  spineItems += `    <itemref idref="title-page" linear="yes"/>\\n`;

  \\1"""

new_content = re.sub(pattern, replacement, content)

# Update the metadata to include Subtitle if it's not there!
sub_target = """    <dc:title>${escapeXml(title)}</dc:title>"""
sub_replace = """    <dc:title>${escapeXml(title)}</dc:title>
    ${project.metadata.subtitle ? `<dc:description>${escapeXml(project.metadata.subtitle)}</dc:description>` : ''}"""
new_content = new_content.replace(sub_target, sub_replace)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)