import os

# 1. Update exportEngine.ts
with open('src/utils/exportEngine.ts', 'r', encoding='utf-8') as f:
    engine_content = f.read()

# HTML
target_html = """        ${metadata.genre ? `
          <div class="meta-label">Genre:</div>
          <div>${escapeHtml(metadata.genre)}</div>
        ` : ''}"""
replace_html = """        ${metadata.genre ? `
          <div class="meta-label">Genre:</div>
          <div>${escapeHtml(metadata.genre.split(';').map(g => g.trim()).filter(Boolean).join(', '))}</div>
        ` : ''}"""
engine_content = engine_content.replace(target_html, replace_html)

# MD
target_md = "    if (metadata.genre) md += `**Genre:** ${metadata.genre}\\n`;"
replace_md = "    if (metadata.genre) md += `**Genre:** ${metadata.genre.split(';').map(g => g.trim()).filter(Boolean).join(', ')}\\n`;"
engine_content = engine_content.replace(target_md, replace_md)

# TXT
target_txt = "    if (metadata.genre) txt += `Genre: ${metadata.genre}\\n`;"
replace_txt = "    if (metadata.genre) txt += `Genre: ${metadata.genre.split(';').map(g => g.trim()).filter(Boolean).join(', ')}\\n`;"
engine_content = engine_content.replace(target_txt, replace_txt)

with open('src/utils/exportEngine.ts', 'w', encoding='utf-8') as f:
    f.write(engine_content)

# 2. Update epubExporter.ts
with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    epub_content = f.read()

target_epub = "  if (project.metadata.genre) titlePageHtml += `\\n    <div class=\"meta-line\"><strong>Genre:</strong> ${escapeXml(project.metadata.genre)}</div>`;"
replace_epub = "  if (project.metadata.genre) titlePageHtml += `\\n    <div class=\"meta-line\"><strong>Genre:</strong> ${escapeXml(project.metadata.genre.split(';').map(g => g.trim()).filter(Boolean).join(', '))}</div>`;"
epub_content = epub_content.replace(target_epub, replace_epub)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(epub_content)
