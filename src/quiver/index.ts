import fse from 'fs-extra';
import * as path from 'path';
import ProgressBar from 'progress';
import ora, {Ora} from 'ora';
import TurndownService from 'turndown';
import { utimes } from 'utimes';
import {
  CellType,
  QvLibrary, QvNote, QvNotebook,
} from './type.js';
import { readLibrary, walkThroughNotebookHierarchty, readNoteContent } from './quiver_parse.js';
import { checkOutputDirPath, prepareDirectory, newDistinctNoteName } from './utils.js';

class Quiver {
  private library: QvLibrary;

  private newNotePathRecord: Record<string, string> = {};

  private outputQuiverPath: string = '';

  private noteCount = 0;

  private needReplaceExtNames?: string[];

  private bar?: ProgressBar;
  private spinner?: Ora

  private constructor(library: QvLibrary, extNames: string[] | undefined) {
    this.library = library;
    if (extNames && extNames.length > 0) {
      this.needReplaceExtNames = extNames;
    }
  }

  static async newQuiver(libraryPath: string, extNames?: string[]): Promise<Quiver> {
    const spinner = ora('Loading library...').start();
    const library = await readLibrary(libraryPath);
    const quiver = new Quiver(library, extNames);
    spinner.stop();
    return quiver;
  }

  async transformQvLibraryToObsidian(outputPath: string): Promise<string> {
    checkOutputDirPath(outputPath);

    // add `quiver` to output path
    this.outputQuiverPath = path.join(outputPath, 'quiver');

    this.spinner = ora('Reading library...').start();
    this.walkThroughNotebookHierarchty((notebook, parents) => {
      const newPathList = [this.outputQuiverPath];
      parents.forEach((parentNotebook) => {
        newPathList.push(parentNotebook.meta.name);
      });
      newPathList.push(notebook.meta.name);
      const newPath = path.join(...newPathList);

      // Prevent file name conflicts
      const noteNames: string[] = [];
      notebook.notes.forEach((note) => {
        if (this.newNotePathRecord[note.meta.uuid]) {
          throw new Error(`there has two notes with uuid(${note.meta.uuid}), please check and try again`);
        }
        let noteName = note.meta.title;
        if (noteNames.indexOf(noteName) > -1) {
          noteName = newDistinctNoteName(noteName, noteNames, 2);
        }
        noteNames.push(noteName);
        this.newNotePathRecord[note.meta.uuid] = path.join(newPath, `${noteName}.md`);
      });
    });
    this.noteCount = Object.keys(this.newNotePathRecord).length;
    this.bar = new ProgressBar('Processing [:bar] :current/:total', { total: this.noteCount });
    await this.writeLibrary();
    return this.outputQuiverPath;
  }

  private walkThroughNotebookHierarchty(callback: (notebook: QvNotebook, parents: QvNotebook[]) => void): void {
    const notebooks: Record<string, QvNotebook> = {};
    this.library.notebooks.forEach((notebook) => {
      notebooks[notebook.meta.uuid] = notebook;
    });

    const parents: string[] = [];
    this.library.meta.children?.forEach((meta) => {
      walkThroughNotebookHierarchty(meta, parents, (notebookName, parentNames) => {
        const parentNotebooks: QvNotebook[] = [];
        parentNames.forEach((name) => {
          parentNotebooks.push(notebooks[name]);
        });
        callback(notebooks[notebookName], parentNotebooks);
      });
    });
  }

  private async writeLibrary(): Promise<void> {
    const notebookInfoList: Array<{ notebook: QvNotebook, notebookPath: string }> = [];
    this.walkThroughNotebookHierarchty((notebook, parents) => {
      const newPathList = [this.outputQuiverPath];
      parents.forEach((parentNotebook) => {
        newPathList.push(parentNotebook.meta.name);
      });
      newPathList.push(notebook.meta.name);
      const newNotebookPath = path.join(...newPathList);
      notebookInfoList.push({ notebook, notebookPath: newNotebookPath });
    });
    await Promise.all(notebookInfoList.map(async (n) => {
      await this.writeNotebook(n.notebook, n.notebookPath);
    }));
  }

  private async writeNotebook(notebook: QvNotebook, newNotebookPath: string): Promise<void> {
    prepareDirectory(newNotebookPath);
    await Promise.all(notebook.notes.map(async (note) => {
      const notePath = this.newNotePathRecord[note.meta.uuid];
      await this.writeNote(note, notePath);
    }));
  }

  private async writeNote(note: QvNote, newNotePath: string): Promise<void> {
    await this.writeNoteToMarkdown(note, newNotePath);
    if (note.resources) {
      const resourceDirPath = path.join(this.outputQuiverPath, 'resources');
      prepareDirectory(resourceDirPath);
      await Promise.all(note.resources.files.map(async (file) => {
        const fileName = this.replaceResourceName(file.name, true);
        const srcPath = path.join(note.notePath, 'resources', file.name);
        const dstPath = path.join(resourceDirPath, fileName);
        await fse.copyFile(srcPath, dstPath);
      }));
    }
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
    this.bar?.tick();
  }

  // transform note content to markdown and convert TextCell to markdown
  private async writeNoteToMarkdown(note: QvNote, notePath: string): Promise<void> {
    let fd: fse.promises.FileHandle | undefined;
    try {
      await fse.createFile(notePath);
      fd = await fse.promises.open(notePath, 'w+');
      const noteContent = await readNoteContent(note.contentPath);
      noteContent.cells.forEach((cell, i) => {
        if (i !== 0) {
          fd?.write('\n\n');
        }
        const { data } = cell;
        switch (cell.type) {
          case CellType.MarkdownCell: {
            const transformData = this.transformQuiverResourceAndNoteLink(data);
            fd?.write(transformData);
            break;
          }
          case CellType.TextCell: {
            const turndownService = new TurndownService();
            const markdown = turndownService.turndown(data);
            const transformData = this.transformQuiverResourceAndNoteLink(markdown);
            fd?.write(transformData);
            break;
          }
          case CellType.CodeCell: {
            const language = cell.language ?? '';
            fd?.write(`\`\`\`${language}\n${data}\n\`\`\``);
            break;
          }
          case CellType.LatexCell: {
            fd?.write(`\`\`\`latex\n${data}\n\`\`\``);
            break;
          }
          case CellType.DiagramCell: {
            let tool = 'Sequence diagram, see https://bramp.github.io/js-sequence-diagrams';
            if (cell.diagramType === 'flow') {
              tool = 'Flowchart diagram, see http://flowchart.js.org';
            }
            fd?.write(`\`\`\`javascript\n// ${tool}\n${data}\`\`\``);
            break;
          }
          default:
            break;
        }
      });
    } catch (error) {
      throw (error as Error);
    } finally {
      if (fd) { fd.close(); }
    }

    try {
      // rewrite create time and update time of md file
      await utimes(notePath, {
        btime: Number(note.meta.created_at * 1000),
        mtime: Number(note.meta.updated_at * 1000),
        atime: 0,
      });
    } catch (error) {
    // ignore
    }
  }

  // transform quiver resource and note link url
  private transformQuiverResourceAndNoteLink(data: string): string {
    let transformData = data.replace(/quiver-image-url\//g, 'resources/');
    transformData = transformData.replace(/quiver-file-url\//g, 'resources/');
    transformData = this.replaceResourceName(transformData, false);

    // replace note link in content to obsidian link
    // eslint-disable-next-line max-len
    transformData = transformData.replace(/\[.*?\]\((quiver-note-url|quiver:\/\/\/notes)\/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})\)/g, (_, __, uuid) => {
      const linkNotePath = this.newNotePathRecord[uuid];
      const linkNoteName = path.basename(linkNotePath);
      return ` [[${linkNoteName}]]`;
    });
    return transformData;
  }

  // rename resource file names and links
  private replaceResourceName(data: string, isForFile: boolean): string {
    const resourceTag = isForFile ? '' : 'resources/';
    const prefix = isForFile ? '^' : '\\(';
    const suffix = isForFile ? '$' : '\\)';
    // 1.remove url args from img file name, like:
    // `![](resources/47D5523597D28227C87950448B4780A5.jpg =344x387)`
    // `9FFEF50881EA1326EA55C1BC43EC9314.png&w=2048&q=75`
    // `55F20500B6E0C67E3EA78ED6C149B4D9.svg?style=social&label=Follow%20on%20Twitter`
    // eslint-disable-next-line max-len
    const clearSuffixReg = new RegExp(`${prefix}(${resourceTag}.*?\\.(bmp|jpg|png|tif|gif|pcx|tga|exif|fpx|svg|psd|cdr|pcd|dxf|ufo|eps|ai|raw|WMF|webp|jpeg|ico|awebp))(\\s|&|\\?).*${suffix}`, 'gi');
    let transformData = data.replace(clearSuffixReg, (_, group1) => (isForFile ? group1 : `(${group1})`));

    // replace unknown image file ext to `png`
    if (this.needReplaceExtNames && this.needReplaceExtNames.length > 0) {
      const replaceExt = this.needReplaceExtNames.join('|');
      // eslint-disable-next-line max-len
      const renameAwebpReg = new RegExp(`${prefix}(${resourceTag}.*?)\\.(${replaceExt})${suffix}`, 'gi');
      transformData = transformData.replace(renameAwebpReg, (_, group1) => (isForFile ? `${group1}.png` : `(${group1}.png)`));
    }

    // add default ext (png) for none ext resource file like`(resources/BC8755B05A094564A25EA19E438B73B3)`
    // eslint-disable-next-line max-len
    const addDefaultExtReg = new RegExp(`${prefix}(${resourceTag}[0-9A-Z]{32})${suffix}`, 'g');
    transformData = transformData.replace(addDefaultExtReg, (_, group1) => (isForFile ? `${group1}.png` : `(${group1}.png)`));

    return transformData;
  }
}

export default Quiver;
