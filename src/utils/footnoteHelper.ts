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


export function formatFootnoteNumber(num: number | string, language: string): string {
  const numStr = String(num);
  if (language === 'Bangla' || language === 'Bengali' || language === 'bn') {
    const bnDigits = ['\u09E6', '\u09E7', '\u09E8', '\u09E9', '\u09EA', '\u09EB', '\u09EC', '\u09ED', '\u09EE', '\u09EF'];
    return numStr.replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
  }
  if (language === 'Arabic' || language === 'ar') {
    const arDigits = ['\u0660', '\u0661', '\u0662', '\u0663', '\u0664', '\u0665', '\u0666', '\u0667', '\u0668', '\u0669'];
    return numStr.replace(/\d/g, (d) => arDigits[parseInt(d, 10)]);
  }
  if (language === 'Urdu' || language === 'ur') {
    const urDigits = ['\u06F0', '\u06F1', '\u06F2', '\u06F3', '\u06F4', '\u06F5', '\u06F6', '\u06F7', '\u06F8', '\u06F9'];
    return numStr.replace(/\d/g, (d) => urDigits[parseInt(d, 10)]);
  }
  if (language === 'Hindi' || language === 'hi') {
    const hiDigits = ['\u0966', '\u0967', '\u0968', '\u0969', '\u096A', '\u096B', '\u096C', '\u096D', '\u096E', '\u096F'];
    return numStr.replace(/\d/g, (d) => hiDigits[parseInt(d, 10)]);
  }
  return numStr;
}

export function syncChapterFootnotes(html: string, language: string): string {
  if (!html.includes('footnote-ref')) return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const refs = Array.from(doc.querySelectorAll('.footnote-ref')).filter(ref => !ref.closest('.footnotes-section'));
  
  let footnotesSection = doc.querySelector('.footnotes-section');
  if (!footnotesSection && refs.length > 0) {
    const divider = doc.createElement('hr');
    divider.className = 'w-1/4 mt-12 mb-4 border-slate-300 footnotes-divider';
    divider.setAttribute('contenteditable', 'false');
    
    footnotesSection = doc.createElement('div');
    footnotesSection.className = 'footnotes-section text-sm text-slate-600 mt-4';
    
    doc.body.appendChild(divider);
    doc.body.appendChild(footnotesSection);
  }

  if (footnotesSection) {
    const existingItems = Array.from(footnotesSection.querySelectorAll('.footnote-item'));
    const itemsMap = new Map<string, Element>();
    existingItems.forEach(item => itemsMap.set(item.id, item));

    footnotesSection.innerHTML = ''; // Clear for re-insertion

    refs.forEach((ref, index) => {
      const nextNumber = index + 1;
      const formattedNextNumber = formatFootnoteNumber(nextNumber, language);
      const refId = ref.id; 
      const fnId = refId.replace('ref-', 'fn-');
      
      const refAnchor = ref.querySelector('a');
      if (refAnchor && refAnchor.textContent !== formattedNextNumber) {
        refAnchor.textContent = formattedNextNumber;
      }

      let item = itemsMap.get(fnId);
      if (!item) {
        item = doc.createElement('div');
        item.id = fnId;
        item.className = 'footnote-item';
        item.innerHTML = `<a href="#${refId}" contenteditable="false"><sup>${formattedNextNumber}</sup></a><div class="footnote-text" contenteditable="true">&#8203;</div>`;
      } else {
        const itemAnchor = item.querySelector('a');
        if (itemAnchor) {
          const sup = itemAnchor.querySelector('sup');
          if (sup && sup.textContent !== formattedNextNumber) {
            sup.textContent = formattedNextNumber;
          }
        }
      }
      footnotesSection.appendChild(item);
    });

    if (refs.length === 0) {
      footnotesSection.remove();
      const divider = doc.querySelector('.footnotes-divider');
      if (divider) divider.remove();
    }
  }
  
  return doc.body.innerHTML;
}
