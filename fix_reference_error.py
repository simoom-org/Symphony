import os
import re

with open('src/utils/epubExporter.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the declaration from its current place
content = content.replace("  const title = project.metadata.title ? project.metadata.title : (project.id || 'Untitled Document');\n", "")

# 2. Add it at the top of generateEpubBlob
pattern = r"(export async function generateEpubBlob\(project: DocumentProject, chapters: ExportChapter\[\] = \[\]\) \{\n)"
replacement = r"\1  const title = project.metadata.title ? project.metadata.title : (project.id || 'Untitled Document');\n"
content = re.sub(pattern, replacement, content)

with open('src/utils/epubExporter.ts', 'w', encoding='utf-8') as f:
    f.write(content)
