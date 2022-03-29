export interface QvLibrary {
  meta: QvLibraryMeta;
  notebooks: QvNotebook[];
}

export interface QvLibraryMeta {
  uuid: string;
  children?: QvLibraryMeta[];
}

export interface QvNotebook {
  notes: QvNote[];
  meta: QvNotebookMeta;
}

export interface QvNotebookMeta {
  name: string;
  uuid: string;
}

export interface QvNote {
  notePath: string;
  contentPath: string;
  meta: QvNoteMeta;
  resources?: QvNoteResource;
}

export interface QvNoteMeta {
  title: string;
  uuid: string;
  created_at: number;
  updated_at: number;
  tags: string[];
}

export enum CellType {
  CodeCell = 'code',
  TextCell = 'text',
  MarkdownCell = 'markdown',
  LatexCell = 'latex',
  DiagramCell = 'diagram',
}

export interface Cell {
  type: CellType;
  language?: string;
  diagramType?: string;
  data: string;
}

export interface QvNoteContent {
  cells: Cell[];
  title: string;
}

export interface QvNoteResource {
  files: QvNoteResourceFile[];
}

export interface QvNoteResourceFile {
  name: string;
}
