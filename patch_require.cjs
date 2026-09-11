const fs = require('fs');

const exportPath = "src/utils/exportEngine.ts";
let content = fs.readFileSync(exportPath, "utf8");

// Remove the broken require statement
content = content.replace(/const formatFootnoteNumber = require\('\.\/footnoteHelper'\)\.formatFootnoteNumber;/g, '');

// Ensure it is imported at the top level
if (!content.includes("import {") || (!content.includes("formatFootnoteNumber") && !content.includes("import { formatFootnoteNumber"))) {
  if (content.includes("import { syncChapterFootnotes } from './footnoteHelper';")) {
      content = content.replace("import { syncChapterFootnotes } from './footnoteHelper';", "import { syncChapterFootnotes, formatFootnoteNumber } from './footnoteHelper';");
  } else {
      content = "import { syncChapterFootnotes, formatFootnoteNumber } from './footnoteHelper';\n" + content;
  }
}

fs.writeFileSync(exportPath, content, "utf8");
console.log("exportEngine.ts patched successfully.");

// Let's also double check storage.ts just in case, since our grep showed a false positive match on 'require zero-latency' which is just text, but we should be sure.