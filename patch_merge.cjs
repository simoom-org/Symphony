const fs = require('fs');
const editorPath = "src/components/MiddleEditor.tsx";
let content = fs.readFileSync(editorPath, "utf8");

// We will replace the entire 'if (e.key === 'Delete' || e.key === 'Backspace') {' block.
// First, find the start and end of that block.
// It starts around line 351 (based on previous greps).
const startStr = "if (e.key === 'Delete' || e.key === 'Backspace') {";
const endStr = "                  // Heading Shortcuts";

let startIndex = content.indexOf(startStr);
let endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find the block");
    process.exit(1);
}

const newBlock = `if (e.key === 'Delete' || e.key === 'Backspace') {
                    const sel = window.getSelection();
                    if (sel && sel.isCollapsed) {
                      let currentBlock = sel.anchorNode;
                      while (currentBlock && currentBlock !== e.currentTarget && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes((currentBlock as HTMLElement).tagName)) {
                        currentBlock = currentBlock.parentNode;
                      }
                      
                      if (currentBlock && currentBlock !== e.currentTarget) {
                        const range = sel.getRangeAt(0);
                        const testRange = range.cloneRange();
                        const isEmpty = (node: HTMLElement) => node.textContent?.replace(/\\u200B/g, '').trim().length === 0;

                        if (e.key === 'Delete') {
                          testRange.selectNodeContents(currentBlock);
                          testRange.setStart(range.endContainer, range.endOffset);
                          const remainingText = testRange.toString().replace(/\\u200B/g, '').trim();
                          
                          if (remainingText.length === 0) {
                            let nextBlock = (currentBlock as HTMLElement).nextElementSibling as HTMLElement;
                            if (nextBlock) {
                              if (isEmpty(nextBlock)) {
                                e.preventDefault();
                                nextBlock.remove();
                                setTimeout(handleVisualInput, 10);
                                return;
                              } else {
                                // Apply NEXT block's format to CURRENT block (since they are merging into current block)
                                const newBlock = document.createElement(nextBlock.tagName);
                                newBlock.innerHTML = (currentBlock as HTMLElement).innerHTML;
                                newBlock.className = nextBlock.className;
                                newBlock.style.cssText = nextBlock.style.cssText;
                                currentBlock.parentNode?.replaceChild(newBlock, currentBlock);
                                
                                // Restore selection
                                const newSel = window.getSelection();
                                const newRange = document.createRange();
                                newRange.selectNodeContents(newBlock);
                                newRange.collapse(false);
                                newSel?.removeAllRanges();
                                newSel?.addRange(newRange);
                              }
                              setTimeout(handleVisualInput, 10);
                            }
                          }
                        } else if (e.key === 'Backspace') {
                          testRange.selectNodeContents(currentBlock);
                          testRange.setEnd(range.startContainer, range.startOffset);
                          const priorText = testRange.toString().replace(/\\u200B/g, '').trim();
                          
                          if (priorText.length === 0) {
                            let prevBlock = (currentBlock as HTMLElement).previousElementSibling as HTMLElement;
                            if (prevBlock) {
                              if (isEmpty(prevBlock)) {
                                e.preventDefault();
                                prevBlock.remove();
                                setTimeout(handleVisualInput, 10);
                                return;
                              } else {
                                // Apply CURRENT block's format to PREV block
                                const newBlock = document.createElement((currentBlock as HTMLElement).tagName);
                                newBlock.innerHTML = prevBlock.innerHTML;
                                newBlock.className = (currentBlock as HTMLElement).className;
                                newBlock.style.cssText = (currentBlock as HTMLElement).style.cssText;
                                prevBlock.parentNode?.replaceChild(newBlock, prevBlock);
                              }
                              setTimeout(handleVisualInput, 10);
                            }
                          }
                        }
                      }
                    }
                  }

`;

content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
fs.writeFileSync(editorPath, content, "utf8");
console.log("MiddleEditor.tsx patched successfully.");