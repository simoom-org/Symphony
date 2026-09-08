export function redistributeFootnotes(htmlChunks: string[]): string[] {
  const footnoteMap = new Map<string, string>();

  const parser = new DOMParser();

  // 1. Extract all footnotes
  htmlChunks.forEach(html => {
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll(".footnote-item");
    items.forEach(item => {
      const a = item.querySelector("a");
      if (a) {
        let href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          const refId = href.substring(1); // e.g. ref-123
          footnoteMap.set(refId, item.outerHTML);
        }
      }
    });
  });

  // 2. Process each chunk
  return htmlChunks.map(html => {
    const doc = parser.parseFromString(html, "text/html");
    
    // Remove existing footnote sections
    doc.querySelectorAll(".footnotes-section, hr.footnotes-divider").forEach(el => el.remove());

    // Find all references in this chunk
    const refs = doc.querySelectorAll(".footnote-ref");
    const usedFootnotes: string[] = [];
    
    refs.forEach(ref => {
      const refId = ref.id;
      if (refId && footnoteMap.has(refId)) {
        usedFootnotes.push(footnoteMap.get(refId)!);
      }
    });

    // Append if we have used footnotes
    if (usedFootnotes.length > 0) {
      const divider = doc.createElement("hr");
      divider.className = "footnotes-divider";
      divider.setAttribute("contenteditable", "false");
      
      const section = doc.createElement("div");
      section.className = "footnotes-section";
      section.innerHTML = usedFootnotes.join("");

      doc.body.appendChild(divider);
      doc.body.appendChild(section);
    }

    return doc.body.innerHTML;
  });
}
