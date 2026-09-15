import os

with open('src/utils/exportEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove from HTML
html_target = """        ${metadata.tags ? `
          <div class="meta-label">Tags:</div>
          <div>${escapeHtml(metadata.tags)}</div>
        ` : ''}"""
content = content.replace(html_target, "")

# 2. Remove from Markdown
md_target = "    if (metadata.tags) md += `**Tags:** ${metadata.tags}\\n`;\n"
content = content.replace(md_target, "")

# 3. Remove from TXT
txt_target = "    if (metadata.tags) txt += `Tags: ${metadata.tags}\\n`;\n"
content = content.replace(txt_target, "")

with open('src/utils/exportEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)