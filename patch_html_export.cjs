const fs = require('fs');

let exportEngine = fs.readFileSync('src/utils/exportEngine.ts', 'utf8');

const target1 = `        ${metadata.subtitle ? \`
          <div class="meta-label">Subtitle:</div>
          <div>${escapeHtml(metadata.subtitle)}</div>
        \` : ''}`;

const replacement1 = `        ${metadata.subtitle ? \`
          <div class="meta-label">Subtitle:</div>
          <div>\${escapeHtml(metadata.subtitle)}</div>
        \` : ''}

        \${metadata.originalTitle ? \`
          <div class="meta-label">Original Name:</div>
          <div>\${escapeHtml(metadata.originalTitle)}</div>
        \` : ''}`;

exportEngine = exportEngine.replace(target1, replacement1);


const target2 = `        ${metadata.isbn ? \`
          <div class="meta-label">ISBN:</div>
          <div>${escapeHtml(metadata.isbn)}</div>
        \` : ''}`;

const replacement2 = `        \${metadata.isbn ? \`
          <div class="meta-label">ISBN:</div>
          <div>\${escapeHtml(metadata.isbn)}</div>
        \` : ''}

        \${metadata.genre ? \`
          <div class="meta-label">Genre:</div>
          <div>\${escapeHtml(metadata.genre)}</div>
        \` : ''}

        \${metadata.tags ? \`
          <div class="meta-label">Tags:</div>
          <div>\${escapeHtml(metadata.tags)}</div>
        \` : ''}`;

exportEngine = exportEngine.replace(target2, replacement2);

fs.writeFileSync('src/utils/exportEngine.ts', exportEngine);