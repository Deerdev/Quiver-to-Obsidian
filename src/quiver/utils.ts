import fse from 'fs-extra';
import * as path from 'path';

// check weather the `${outputPath}/quiver` path is exists
export const checkOutputDirPath = (outputPath: string): void => {
  let stat: fse.Stats;
  try {
    stat = fse.statSync(outputPath);
  } catch (error) {
    // not exists, we will create it later
    return;
  }
  if (stat.isDirectory()) {
    const outputQuiverPath = path.join(outputPath, 'quiver');
    try {
      stat = fse.statSync(outputQuiverPath);
    } catch (error) {
      // not exists, we will create it later
      return;
    }
    throw new Error(`${outputQuiverPath} is already exists`);
  }
  throw new Error('output path must be a directory!');
};

// create dirs
export const prepareDirectory = (dirPath: string): void => {
  if (!fse.existsSync(dirPath)) {
    fse.mkdirpSync(dirPath);
  }
};

const MAX_RENAME_COUNT = 100;
// rename file name to prevent conflicts
export function newDistinctNoteName(noteName: string, currentNames: string[], index: number): string {
  if (index > MAX_RENAME_COUNT) {
    throw new Error(`rename resource name failed: ${noteName}`);
  }
  const newName = `${noteName} ${index}`;
  if (currentNames.indexOf(newName) > -1) {
    return newDistinctNoteName(noteName, currentNames, index + 1);
  }
  return newName;
}
