import os
import re

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    epub_content = f.read()

pattern = r"(if \(project\.metadata\.genre\) titlePageHtml \+= `\n\s*<div class=\"meta-line\"><strong>Genre:</strong> \$\{escapeXml\(project\.metadata\.genre\)\}</div>`;)"
replace = r"if (project.metadata.genre) titlePageHtml += `\n    <div class=\"meta-line\"><strong>Genre:</strong> ${escapeXml(project.metadata.genre.split(';').map(g => g.trim()).filter(Boolean).join(', '))}</div>`;"

new_epub_content = re.sub(pattern, replace, epub_content)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(new_epub_content)
