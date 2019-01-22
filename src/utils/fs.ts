import * as fs from 'fs-extra';

async function getDirFiles(dir: string): Promise<string[]> {
  const exist = (await fs.pathExists(dir)) && (await fs.stat(dir)).isDirectory();

  if (!exist) {
    return [];
  }

  return await fs.readdir(dir);
}

export { getDirFiles };
