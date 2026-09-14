export interface ChapterItem {
  id: string;
  title: string;
  content: string; // HTML or Markdown formatted content
  level: number; // Unlimited level: 1 = Root Chapter, 2 = Subchapter, 3 = Section, 4 = Subsection, etc.
  isExpanded?: boolean;
  hideTitle?: boolean;
  notes?: string;
  updatedAt: string;
}







export interface DocumentCover {
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  titleFont: 'serif' | 'sans' | 'mono' | 'display';
  showSubtitle: boolean;
  themeStyle: 'minimal' | 'classic' | 'modern' | 'academic' | 'bold';
  aspectRatio: 'standard' | 'golden' | 'square' | 'a4';
}

export interface ProjectMetadata {
  title: string;
  subtitle: string;
  authors: string;
  translators: string;
  language: string;
  customLanguage?: string;
  publicationDate: string;
  publisherName: string;
  isbn: string;
  copyrightInfo: string;
  license?: string;
  genre: string;
  tags: string;
  originalTitle?: string;
  description: string;
  cover: DocumentCover;
}

export interface DocumentSnapshot {
  id: string;
  name: string;
  timestamp: string;
  wordCount: number;
  data: string; // serialized json
}

export interface DocumentProject {
  version: string;
  id: string;
  metadata: ProjectMetadata;
  chapters: ChapterItem[];
  activeChapterId: string;
  lastSaved: string;
  settings: {
    fontFamily: 'serif' | 'sans' | 'mono';
    fontSize: number;
    lineHeight: number;
    pageWidth: 'compact' | 'standard' | 'wide' | 'full';
    theme: 'light' | 'sepia' | 'dark' | 'nord';
    autoSaveIntervalMs: number;
    showPageBreaks: boolean;
  };
}

export type RightPanelTab = 'metadata' | 'cover' | 'snapshots' | 'preview';

