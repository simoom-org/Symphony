import os

with open('src/utils/exportEngine.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """        ${metadata.subtitle ? `
          <div class="meta-label">Subtitle:</div>
          <div>${escapeHtml(metadata.subtitle)}</div>
        ` : ''}"""

replacement1 = """        ${metadata.subtitle ? `
          <div class="meta-label">Subtitle:</div>
          <div>${escapeHtml(metadata.subtitle)}</div>
        ` : ''}

        ${metadata.originalTitle ? `
          <div class="meta-label">Original Name:</div>
          <div>${escapeHtml(metadata.originalTitle)}</div>
        ` : ''}"""

content = content.replace(target1, replacement1)

target2 = """        ${metadata.isbn ? `
          <div class="meta-label">ISBN:</div>
          <div>${escapeHtml(metadata.isbn)}</div>
        ` : ''}"""

replacement2 = """        ${metadata.isbn ? `
          <div class="meta-label">ISBN:</div>
          <div>${escapeHtml(metadata.isbn)}</div>
        ` : ''}

        ${metadata.genre ? `
          <div class="meta-label">Genre:</div>
          <div>${escapeHtml(metadata.genre)}</div>
        ` : ''}

        ${metadata.tags ? `
          <div class="meta-label">Tags:</div>
          <div>${escapeHtml(metadata.tags)}</div>
        ` : ''}"""

content = content.replace(target2, replacement2)

with open('src/utils/exportEngine.ts', 'w', encoding='utf-8') as f:
    f.write(content)