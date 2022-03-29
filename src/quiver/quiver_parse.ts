import fse from 'fs-extra';
import * as path from 'path';
import {
  QvLibrary, QvLibraryMeta, QvNote, QvNotebook, QvNotebookMeta, QvNoteContent, QvNoteMeta, QvNoteResourceFile,
} from './type.js';

// read note
const isQvNote = async (notePath: string): Promise<boolean> => {
  try {
    const stat = await fse.stat(notePath);
    if (stat.isDirectory() && notePath.endsWith('.qvnote')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const readNoteMeta = async (metaPath:string): Promise<QvNoteMeta> => {
  try {
    const stat = await fse.stat(metaPath);
    if (stat.isFile()) {
      const content = await fse.readFile(metaPath);
      return JSON.parse(content.toString()) as QvNoteMeta;
    }
    throw new Error(`no such file ${metaPath}`);
  } catch (error) {
    throw (error as Error);
  }
};

export const readNoteContent = async (contentPath: string): Promise<QvNoteContent> => {
  try {
    const stat = await fse.stat(contentPath);
    if (stat.isFile()) {
      const content = await fse.readFile(contentPath);
      return JSON.parse(content.toString()) as QvNoteContent;
    }
    throw new Error(`no such file ${contentPath}`);
  } catch (error) {
    throw (error as Error);
  }
};

const readNoteResources = async (resourcesPath: string): Promise<QvNoteResourceFile[] | undefined> => {
  if (!await fse.pathExists(resourcesPath)) {
    return undefined;
  }
  try {
    const stat = await fse.stat(resourcesPath);
    if (stat.isDirectory()) {
      const names = await fse.readdir(resourcesPath);
      const resources: QvNoteResourceFile[] = [];
      names.forEach((name) => {
        resources.push({ name });
      });
      return resources;
    }
    throw new Error(`no such directory ${resourcesPath}`);
  } catch (error) {
    throw (error as Error);
  }
};

const readNote = async (notePath: string): Promise<QvNote> => {
  if (!isQvNote(notePath)) {
    throw new Error(`${notePath} is not a quiver note dir, please check and try again`);
  }
  const meta = await readNoteMeta(path.join(notePath, 'meta.json'));
  // delay read
  const contentPath = path.join(notePath, 'content.json');
  if (!fse.existsSync(contentPath)) {
    throw new Error(`no such file ${contentPath}`);
  }
  const resourceFiles = await readNoteResources(path.join(notePath, 'resources'));
  const note: QvNote = {
    meta,
    notePath,
    contentPath,
  };
  if (resourceFiles) {
    note.resources = { files: resourceFiles };
  }
  return note;
};

// read notebook
const isQvNoteBook = async (notebookPath: string): Promise<boolean> => {
  try {
    const stat = await fse.stat(notebookPath);
    if (stat.isDirectory() && notebookPath.endsWith('.qvnotebook')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const readNotebookMeta = async (metaPath: string): Promise<QvNotebookMeta> => {
  const content = await fse.readFile(metaPath);
  return JSON.parse(content.toString()) as QvNotebookMeta;
};

const readNoteBook = async (notebookPath: string): Promise<QvNotebook> => {
  if (!await isQvNoteBook(notebookPath)) {
    throw new Error(`${notebookPath} is not a quiver notebook dir, please check and try again`);
  }
  const names = await fse.readdir(notebookPath);
  let meta: QvNotebookMeta | undefined;
  const notes: QvNote[] = [];
  await Promise.all(names.map(async (name) => {
    const filePath = path.join(notebookPath, name);
    const stat = fse.statSync(filePath);
    if (stat.isFile() && name === 'meta.json') {
      // read library meta
      meta = await readNotebookMeta(filePath);
    } else if (stat.isDirectory()) {
      // read notebook
      notes.push(await readNote(filePath));
    }
  }));

  if (!meta) {
    throw new Error(`no such file ${path.join(notebookPath, 'meta.json')}`);
  }
  return {
    meta,
    notes,
  };
};

// read library
const isQvLibrary = async (libraryPath: string): Promise<boolean> => {
  try {
    const stat = fse.statSync(libraryPath);
    if (stat.isDirectory() && libraryPath.endsWith('.qvlibrary')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const readLibraryMeta = async (metaPath: string): Promise<QvLibraryMeta> => {
  const content = await fse.readFile(metaPath);
  return JSON.parse(content.toString()) as QvLibraryMeta;
};

export const readLibrary = async (libraryPath: string): Promise<QvLibrary> => {
  if (!await isQvLibrary(libraryPath)) {
    throw new Error(`${libraryPath} is not a quiver library dir, please check and try again`);
  }

  const names = await fse.readdir(libraryPath);
  let meta: QvLibraryMeta | undefined;
  const notebooks: QvNotebook[] = [];
  await Promise.all(names.map(async (name) => {
    const filePath = path.join(libraryPath, name);
    const stat = await fse.stat(filePath);
    if (stat.isFile() && name === 'meta.json') {
      // read library meta
      meta = await readLibraryMeta(filePath);
    } else if (stat.isDirectory()) {
      // read notebook
      notebooks.push(await readNoteBook(filePath));
    }
  }));

  if (!meta) {
    throw new Error(`no such file ${path.join(libraryPath, 'meta.json')}`);
  }
  return {
    meta,
    notebooks,
  };
};

export function walkThroughNotebookHierarchty(
  libraryMeta: QvLibraryMeta,
  parents: string[],
  callback: (notebookName: string, parents: string[]) => void,
): void {
  callback(libraryMeta.uuid, parents);
  if (libraryMeta.children && libraryMeta.children.length > 0) {
    const p = [...parents, libraryMeta.uuid];
    libraryMeta.children?.forEach((meta) => {
      walkThroughNotebookHierarchty(meta, p, callback);
    });
  }
}
