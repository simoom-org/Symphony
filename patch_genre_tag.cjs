const fs = require('fs');

// 1. Patch RightInspector.tsx
let inspector = fs.readFileSync('src/components/RightInspector.tsx', 'utf8');

const oldBlock = `        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Genre</label>
          <input type="text" placeholder="e.g. Fiction, History" className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 mb-4" value={metadata.genre || ''} onChange={e => onUpdateMetadata('genre', e.target.value)} />
          <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
          <TagInput placeholder="Type tag and press ';' or Enter" value={metadata.tags || ''} onChange={(val: string) => onUpdateMetadata('tags', val)} />
        </div>`;

const newBlock = `        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Genre</label>
          <TagInput placeholder="Type genre and press ';' or Enter" value={metadata.genre || ''} onChange={(val: string) => onUpdateMetadata('genre', val)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
          <TagInput placeholder="Type tag and press ';' or Enter" value={metadata.tags || ''} onChange={(val: string) => onUpdateMetadata('tags', val)} />
        </div>`;

inspector = inspector.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/RightInspector.tsx', inspector);

// 2. Patch epubExporter.ts
let epubExporter = fs.readFileSync('src/utils/epubExporter.ts', 'utf8');
const oldGenreDc = "  const dcGenre = project.metadata.genre ? `<dc:type>${escapeXml(project.metadata.genre)}</dc:type>` : '';";
const newGenreDc = `  const genreList = extractList(project.metadata.genre);
  const dcGenre = genreList.map(g => \`<dc:type>\${escapeXml(g)}</dc:type>\`).join('\\n    ');`;

epubExporter = epubExporter.replace(oldGenreDc, newGenreDc);
fs.writeFileSync('src/utils/epubExporter.ts', epubExporter);

console.log("Patched RightInspector and epubExporter.");