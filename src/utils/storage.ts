import { DocumentProject, ChapterItem } from '../types';

const STORAGE_KEY = 'portable_doc_studio_current_project';
const TEMP_STORAGE_KEY = 'portable_doc_studio_temp_project';
const DIRECT_MODE_KEY = 'portable_doc_studio_direct_save';
const SNAPSHOTS_KEY = 'portable_doc_studio_snapshots';

export const INITIAL_PROJECT: DocumentProject = {
  version: '1.0.0',
  id: 'doc-initial-001',
    metadata: {
    title: '',
    subtitle: '',
    description: '',
    genreTags: '',
    language: '',
    publicationDate: '',
    publisherName: '',
    isbn: '',
    copyrightInfo: '',
    authors: '',
    translators: '',
    cover: {
      backgroundColor: '#1e293b',
      textColor: '#f8fafc',
      titleFont: 'serif',
      showSubtitle: true,
      themeStyle: 'classic',
      aspectRatio: 'standard'
    }
  },
  chapters: [
    {
      id: 'chap-1',
      title: '1. Introduction: The Need for Resilient Authoring',
      level: 1,
      isExpanded: true,
      updatedAt: new Date().toISOString(),
      content: `<h2>1.1 The Context of Disconnection</h2>
<p>Modern intellectual work requires both boundless connectivity and deep, uninterrupted concentration. When tools mandate continuous cloud round-trips, the writer’s cognitive state is perpetually vulnerable to latency, session timeouts, and network degradation.</p>
<p>As noted by early computational theorists, the ideal creative environment behaves like a self-contained portable vessel: <em>lightweight, immediate, and fully operational in zero-connectivity environments</em>.</p>
<blockquote>"The pen and the offline ledger share a singular virtue: they never ask for permission from a distant server before recording a thought."</blockquote>
<p>In this monograph, we present structural approaches for organizing multi-level manuscripts and verifiable metadata packages without sacrificing minimalist aesthetics.</p>`
    },
    {
      id: 'chap-2',
      title: '1.2 Theoretical Foundations',
      level: 2,
      isExpanded: true,
      updatedAt: new Date().toISOString(),
      content: `<h3>1.2.1 Hierarchical Decomposition of Text</h3>
<p>Complex narratives and academic treatises are rarely linear during composition. Instead, they form a hierarchical tree of concepts, chapters, sub-arguments, and empirical research.</p>
<p>By organizing documents into re-orderable tree nodes, authors can shift structural levels seamlessly across unlimited depths while preserving precise word-count metrics and revision snapshots.</p>
<ul>
  <li><strong>Level 1 Nodes:</strong> Foundational Chapters and Overarching Thematic Divisions.</li>
  <li><strong>Level 2 Nodes:</strong> Subchapters containing localized arguments.</li>
  <li><strong>Level 3+ Nodes:</strong> Specific Sections, subsections, case studies, or mathematical formulations.</li>
</ul>`
    },
    {
      id: 'chap-3',
      title: '2. Modular Information Architecture',
      level: 1,
      isExpanded: true,
      updatedAt: new Date().toISOString(),
      content: `<h2>2.1 The Triple-Panel Ergonomic Paradigm</h2>
<p>Ergonomic research in digital typography suggests three concurrent visual anchors for serious manuscript development:</p>
<ol>
  <li><strong>Navigation Anchor (Left):</strong> Quick structural hierarchy traversal with unlimited drag-and-drop levels.</li>
  <li><strong>Focus Canvas (Center):</strong> A high-contrast, distraction-free drafting surface with visual and raw markup interoperability.</li>
  <li><strong>Contextual Inspector (Right):</strong> Multilateral metadata, internationalization parameters, and export pipelines.</li>
</ol>
<p>When these three zones operate without layout shift or intrusive modal dialogs, authoring velocity increases by upwards of 34%.</p>`
    },
    {
      id: 'chap-4',
      title: '2.2 Advanced Hierarchical Structuring',
      level: 2,
      isExpanded: true,
      updatedAt: new Date().toISOString(),
      content: `<h3>2.2.1 Unlimited Nesting &amp; Reordering</h3>
<p>With multi-level drag-and-drop, writers can seamlessly demote sections to deeper subsections or promote them up to major chapters.</p>`
    },
    {
      id: 'chap-5',
      title: '3. Conclusion and Future Horizons',
      level: 1,
      isExpanded: true,
      updatedAt: new Date().toISOString(),
      content: `<h2>3.1 Summary of Findings</h2>
<p>The return to portable, offline-first publishing tools marks a renewed commitment to author autonomy. By pairing robust browser-level durability with desktop window semantics, modern creators gain the best of both worlds.</p>`
    }
  ],
  activeChapterId: 'chap-1',
  lastSaved: new Date().toISOString(),
  settings: {
    fontFamily: 'serif',
    fontSize: 18,
    lineHeight: 1.7,
    pageWidth: 'standard',
    theme: 'light',
    autoSaveIntervalMs: 3000,
    showPageBreaks: false
  }
};


/**
 * Storage Helpers
 */

export const getDirectSaveMode = (): boolean => {
  try {
    return localStorage.getItem(DIRECT_MODE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDirectSaveMode = (isOn: boolean) => {
  try {
    localStorage.setItem(DIRECT_MODE_KEY, isOn ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set direct save mode', e);
  }
};

export const saveTempProjectToStorage = (project: DocumentProject) => {
  try {
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('Failed to save temp project', e);
  }
};

export const clearTempProject = () => {
  try {
    localStorage.removeItem(TEMP_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear temp project', e);
  }
};

export function loadSavedProject(): DocumentProject | null {
  clearTempProject();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
            if (parsed && parsed.chapters && parsed.metadata) {
        // --- Migration from old complex metadata to simple string metadata ---
        if (Array.isArray(parsed.metadata.authors)) {
          parsed.metadata.authors = parsed.metadata.authors.map((a: any) => a.name || '').filter(Boolean).join(', ');
        }
        if (Array.isArray(parsed.metadata.translators)) {
          parsed.metadata.translators = parsed.metadata.translators.map((t: any) => t.name || '').filter(Boolean).join(', ');
        }
        if (parsed.metadata.publisher && typeof parsed.metadata.publisher === 'object') {
          parsed.metadata.publisherName = parsed.metadata.publisher.name || '';
          parsed.metadata.publicationDate = parsed.metadata.publisher.publicationYear || '';
          parsed.metadata.isbn = parsed.metadata.publisher.isbn || '';
        }
        if (parsed.metadata.primaryLanguage) {
           parsed.metadata.language = parsed.metadata.primaryLanguage;
        }
        // ---------------------------------------------------------------------
        if (parsed.settings) {
          parsed.settings.theme = 'light';
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved project, starting fresh', e);
  }
  return null;
}

export function saveProjectToStorage(project: DocumentProject): void {
  try {
    const updated = {
      ...project,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save project', e);
  }
}

export function validateAndUpgradeProject(data: any): DocumentProject {
  const defaultProj = createNewProject('blank');
  
  // Helper to convert legacy arrays (e.g. [{name: "Bob"}]) to semicolon-separated strings
  const stringifyMeta = (val: any) => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val.map(item => typeof item === 'object' && item !== null && item.name ? item.name : String(item)).join('; ');
    }
    return val === null || val === undefined ? '' : String(val);
  };
  
  const rawMeta = data.metadata || {};
  const upgradedMeta = {
    ...defaultProj.metadata,
    ...rawMeta,
    authors: stringifyMeta(rawMeta.authors),
    translators: stringifyMeta(rawMeta.translators),
    editors: stringifyMeta(rawMeta.editors),
    tags: stringifyMeta(rawMeta.tags),
  };

  return {
    ...defaultProj,
    ...data,
    metadata: upgradedMeta,
    settings: {
      ...defaultProj.settings,
      ...(data.settings || {})
    },
    chapters: (data.chapters && data.chapters.length > 0 ? data.chapters : defaultProj.chapters).map((c: any) => ({
      ...c,
      content: typeof c.content === 'string' ? c.content : '',
      title: typeof c.title === 'string' ? c.title : 'Untitled Chapter'
    })),
    activeChapterId: data.activeChapterId || (data.chapters?.[0]?.id ?? defaultProj.activeChapterId)
  };
}

// ---- File System Access API ----

export async function pickFileToOpen(): Promise<{ handle: any, project: DocumentProject }> {
  if (!('showOpenFilePicker' in window)) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.symphony,.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('AbortError'));
          return;
        }
        try {
          const contents = await file.text();
          resolve({ handle: null, project: validateAndUpgradeProject(JSON.parse(contents)) });
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }

  // @ts-ignore
  const [handle] = await window.showOpenFilePicker({
    types: [{ 
      description: 'Symphony Project', 
      accept: { 
        'application/json': ['.symphony', '.json'],
        'text/plain': ['.symphony']
      } 
    }]
  });
  const file = await handle.getFile();
  const contents = await file.text();
  return { handle, project: validateAndUpgradeProject(JSON.parse(contents)) };
}

export async function pickFileToSave(project: DocumentProject): Promise<any> {
  console.log('pickFileToSave called', 'showSaveFilePicker' in window);
  if (!('showSaveFilePicker' in window)) {
    // Fallback for browsers/Electron without File System Access API
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.metadata.title || 'Untitled'}.symphony`;
    a.click();
    URL.revokeObjectURL(url);
    return null; // Return null handle, meaning autosave will just trigger download again if we don't handle it
  }

  // @ts-ignore
  const handle = await window.showSaveFilePicker({
    suggestedName: `${(project.metadata.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '_')}.symphony`,
    types: [{ 
      description: 'Symphony Project', 
      accept: { 
        'application/json': ['.symphony', '.json'],
        'text/plain': ['.symphony']
      } 
    }]
  });
  await writeToFileHandle(handle, project);
  return handle;
}

export async function writeToFileHandle(handle: any, project: DocumentProject): Promise<void> {
  const updated = {
    ...project,
    lastSaved: new Date().toISOString()
  };
  
  if (!handle) {
    // Fallback: If handle is null, we can't write in-place. Trigger a download.
    const blob = new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.metadata.title || 'Untitled'}.symphony`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(updated));
  await writable.close();
}

export function createNewProject(templateType: 'blank' | 'monograph' | 'novel' | 'academic' = 'blank'): DocumentProject {
  const baseId = `doc-${Date.now()}`;
  if (templateType === 'novel') {
    return {
      version: '1.0.0',
      id: baseId,
        metadata: {
    title: '',
    subtitle: '',
    description: '',
    genreTags: '',
    language: '',
    publicationDate: '',
    publisherName: '',
    isbn: '',
    copyrightInfo: '',
    authors: '',
    translators: '',
    cover: {
          backgroundColor: '#0f172a',
          textColor: '#f1f5f9',
          titleFont: 'serif',
          showSubtitle: true,
          themeStyle: 'modern',
          aspectRatio: 'standard'
        }
      },
      chapters: [
        {
          id: `chap-${Date.now()}-1`,
          title: 'Prologue: The Forgotten Signal',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Prologue</h2><p>The fog settled over the harbor like cold breath upon glass...</p>'
        },
        {
          id: `chap-${Date.now()}-2`,
          title: 'Departure',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Departure</h2><p>Begin your story here.</p>'
        },
        {
          id: `chap-${Date.now()}-3`,
          title: 'The Old Station',
          level: 2,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<p>Describe the setting and the initial confrontation.</p>'
        }
      ],
      activeChapterId: `chap-${Date.now()}-1`,
      lastSaved: new Date().toISOString(),
      settings: {
        fontFamily: 'serif',
        fontSize: 18,
        lineHeight: 1.75,
        pageWidth: 'standard',
        theme: 'sepia',
        autoSaveIntervalMs: 3000,
        showPageBreaks: false
      }
    };
  }

  if (templateType === 'academic') {
    return {
      version: '1.0.0',
      id: baseId,
        metadata: {
    title: '',
    subtitle: '',
    description: '',
    genreTags: '',
    language: '',
    publicationDate: '',
    publisherName: '',
    isbn: '',
    copyrightInfo: '',
    authors: '',
    translators: '',
    cover: {
          backgroundColor: '#1e3a8a',
          textColor: '#ffffff',
          titleFont: 'sans',
          showSubtitle: true,
          themeStyle: 'academic',
          aspectRatio: 'a4'
        }
      },
      chapters: [
        {
          id: `chap-${Date.now()}-1`,
          title: 'Abstract',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Abstract</h2><p>This paper presents a formal analysis of offline resilient document pipelines...</p>'
        },
        {
          id: `chap-${Date.now()}-2`,
          title: 'Introduction',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Introduction</h2><p>Distributed computing paradigms require zero-latency local write mechanisms...</p>'
        },
        {
          id: `chap-${Date.now()}-3`,
          title: 'Methodology & Architecture',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Methodology</h2><p>Detailing the measurement protocol and node topology.</p>'
        },
        {
          id: `chap-${Date.now()}-4`,
          title: 'Benchmarking Protocol',
          level: 2,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h3>Protocol</h3><p>Test parameters and dataset characteristics.</p>'
        },
        {
          id: `chap-${Date.now()}-5`,
          title: 'Results & Discussion',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Results</h2><p>Empirical observations and statistical comparisons.</p>'
        },
        {
          id: `chap-${Date.now()}-6`,
          title: 'Summary',
          level: 1,
          isExpanded: true,
          updatedAt: new Date().toISOString(),
          content: '<h2>Summary</h2><p>Concluding insights and experimental synthesis.</p>'
        }
      ],
      activeChapterId: `chap-${Date.now()}-1`,
      lastSaved: new Date().toISOString(),
      settings: {
        fontFamily: 'sans',
        fontSize: 16,
        lineHeight: 1.6,
        pageWidth: 'standard',
        theme: 'light',
        autoSaveIntervalMs: 3000,
        showPageBreaks: false
      }
    };
  }

  // Blank template
  return {
    version: '1.0.0',
    id: baseId,
      metadata: {
    title: '',
    subtitle: '',
    description: '',
    genreTags: '',
    language: '',
    publicationDate: '',
    publisherName: '',
    isbn: '',
    copyrightInfo: '',
    authors: '',
    translators: '',
    cover: {
        backgroundColor: '#334155',
        textColor: '#ffffff',
        titleFont: 'sans',
        showSubtitle: false,
        themeStyle: 'minimal',
        aspectRatio: 'standard'
      }
    },
    chapters: [
      {
        id: `chap-${Date.now()}-1`,
        title: 'Chapter 1: Getting Started',
        level: 1,
        isExpanded: true,
        updatedAt: new Date().toISOString(),
        content: '<h2>Departure</h2><p>Type your text here. Use the formatting toolbar above for bold, italics, alignments, headings, and images.</p>'
      }
    ],
    activeChapterId: `chap-${Date.now()}-1`,
    lastSaved: new Date().toISOString(),
    settings: {
      fontFamily: 'serif',
      fontSize: 18,
      lineHeight: 1.7,
      pageWidth: 'standard',
      theme: 'light',
      autoSaveIntervalMs: 3000,
      showPageBreaks: false
    }
  };

}

export function getStoredSnapshots(): { id: string; name: string; timestamp: string; wordCount: number; data: string }[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveSnapshot(project: DocumentProject, name?: string): { id: string; name: string; timestamp: string; wordCount: number; data: string } {
  const snapshots = getStoredSnapshots();
  const totalWords = project.chapters.reduce((acc, chap) => {
    const text = chap.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return acc + (text ? text.split(/\s+/).length : 0);
  }, 0);

  const newSnapshot = {
    id: `snap-${Date.now()}`,
    name: name || `Revision ${snapshots.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
    timestamp: new Date().toISOString(),
    wordCount: totalWords,
    data: JSON.stringify(project)
  };

  const updated = [newSnapshot, ...snapshots].slice(0, 20); // keep up to 20 snapshots
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not persist snapshot', e);
  }
  return newSnapshot;
}


export async function pickSaveAsFile(project: DocumentProject): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) {
    alert("Your browser does not support the advanced Save As window. Please use a Chromium-based browser.");
    return null;
  }

  try {
    // @ts-ignore
    const handle = await window.showSaveFilePicker({
      suggestedName: `${project.metadata.title || 'Untitled'}`,
      types: [
        {
          description: 'Symphony Project (.symphony)',
          accept: { 'application/json': ['.symphony'] }
        },
        {
          description: 'EPUB eBook (.epub)',
          accept: { 'application/epub+zip': ['.epub'] }
        },
        {
          description: 'HTML Document (.html)',
          accept: { 'text/html': ['.html'] }
        },
        {
          description: 'Markdown (.md)',
          accept: { 'text/markdown': ['.md'] }
        },
        {
          description: 'Plain Text (.txt)',
          accept: { 'text/plain': ['.txt'] }
        }
      ]
    });
    return handle;
  } catch (e: any) {
    if (e.name !== 'AbortError') console.error('pickSaveAsFile error:', e);
    return null;
  }
}
