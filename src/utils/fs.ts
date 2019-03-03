import * as fs from 'fs-extra';
import * as path from 'path';

async function getDirFiles(dir: string): Promise<string[]> {
  const exist = (await fs.pathExists(dir)) && (await fs.stat(dir)).isDirectory();

  if (!exist) {
    return [];
  }

  return await fs.readdir(dir);
}

async function getMDFiles(dir: string): Promise<string[]> {
  const files = await getDirFiles(dir);
  let mds: string[] = [];

  for (const sub of files) {
    const fPath = path.join(dir, sub);
    if ((await fs.stat(fPath)).isDirectory()) {
      const subFiles = await getMDFiles(fPath);
      mds = mds.concat(subFiles.map(f => sub + '/' + f));
    }
  }

  return mds.concat(files).filter(f => f.endsWith('.md'));
}

export { getDirFiles, getMDFiles };
