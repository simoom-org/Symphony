const fs = require('fs');

// 1. Patch src/types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(/genreTags:\s*string;/, 'genre: string;\n  tags: string;\n  originalTitle?: string;');
fs.writeFileSync('src/types.ts', types);

// 2. Patch src/utils/storage.ts
let storage = fs.readFileSync('src/utils/storage.ts', 'utf8');
// Replace default ProjectMetadata instantiation
storage = storage.replace(/genreTags:\s*'',/g, "genre: '',\n      tags: '',\n      originalTitle: '',");

// Inject migration logic in safeParseAndUpgrade
const migrationLogic = `
    if (parsed.metadata) {
      if (typeof parsed.metadata.genreTags === 'string') {
        parsed.metadata.tags = parsed.metadata.genreTags;
        delete parsed.metadata.genreTags;
      }
      if (parsed.metadata.genre === undefined) parsed.metadata.genre = '';
      if (parsed.metadata.tags === undefined) parsed.metadata.tags = '';
      if (parsed.metadata.originalTitle === undefined) parsed.metadata.originalTitle = '';
    }
`;
storage = storage.replace(/(const parsed = JSON\.parse\(jsonString\);)/, `$1\n${migrationLogic}`);
fs.writeFileSync('src/utils/storage.ts', storage);

// 3. Patch src/components/RightInspector.tsx
let inspector = fs.readFileSync('src/components/RightInspector.tsx', 'utf8');
// Add Original Title input
const titleInputStr = `onChange={e => onUpdateMetadata('title', e.target.value)}\n          />\n        </div>`;
const originalTitleHtml = `onChange={e => onUpdateMetadata('title', e.target.value)}\n          />\n        </div>\n        <div>\n          <label className="block text-xs font-medium text-slate-500 mb-1">Original Name (If Translated)</label>\n          <input \n            type="text" \n            className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" \n            value={metadata.originalTitle || ''} \n            onChange={e => onUpdateMetadata('originalTitle', e.target.value)} \n          />\n        </div>`;
inspector = inspector.replace(titleInputStr, originalTitleHtml);

// Replace Genre / Tags
const oldTags = `<label className="block text-xs font-medium text-slate-500 mb-1">Genre / Tags</label>\n          <TagInput placeholder="Type tag and press ';' or Enter" value={metadata.genreTags || ''} onChange={(val: string) => onUpdateMetadata('genreTags', val)} />`;
const newTags = `<label className="block text-xs font-medium text-slate-500 mb-1">Genre</label>\n          <input \n            type="text" \n            placeholder="e.g. Fiction, History" \n            className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"\n            value={metadata.genre || ''} \n            onChange={e => onUpdateMetadata('genre', e.target.value)} \n          />\n          <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>\n          <TagInput placeholder="Type tag and press ';' or Enter" value={metadata.tags || ''} onChange={(val: string) => onUpdateMetadata('tags', val)} />`;
inspector = inspector.replace(oldTags, newTags);
fs.writeFileSync('src/components/RightInspector.tsx', inspector);

console.log("Successfully patched types.ts, storage.ts, and RightInspector.tsx");