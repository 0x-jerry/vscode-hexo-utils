import path from 'path';
import yamljs from 'yamljs';
import { Uri, window, workspace } from 'vscode';
import { configs } from '../configs';
import { IHexoMetadata } from '../hexoMetadata';
import { isExist } from './fs';

async function getPkg() {
  const rootPath = configs.hexoRoot;
  if (!rootPath) {
    return null;
  }

  const pkgPath = Uri.joinPath(rootPath, 'package.json');

  if (!isExist(pkgPath)) {
    return null;
  }

  const pkg = await workspace.fs.readFile(pkgPath);

  return JSON.parse(pkg.toString());
}

export async function isHexoProject() {
  const pkg = await getPkg();
  return !!(pkg && pkg.dependencies && pkg.dependencies.hexo);
}

/**
 * true if yse
 * @param placeHolder msg
 */
export async function askForNext(placeHolder: string): Promise<boolean> {
  const replace = await window.showQuickPick(['yes', 'no'], {
    placeHolder,
  });

  return replace === 'yes';
}

export async function getMDFileMetadata(uri: Uri): Promise<IHexoMetadata> {
  const content = await workspace.fs.readFile(uri);
  const stat = await workspace.fs.stat(uri);

  try {
    // /---(data)---/ => $1 === data
    const yamlReg = /^---((.|\n|\r)+?)---$/m;

    const yamlData = yamlReg.exec(content.toString());

    const data = yamljs.parse(yamlData![1]) || {};

    const categories: (string | string[])[] = Array.isArray(data.categories) ? data.categories : [];

    return {
      tags: Array.isArray(data.tags) ? data.tags : [],
      filePath: uri,
      // →  · /
      categories: categories.map((c) => (Array.isArray(c) ? c.join(' / ') : c)),
      title: data.title || '',
      date: data.date || '',
    };
  } catch (error) {
    return {
      tags: [],
      categories: [],
      filePath: uri,
      title: path.parse(uri.fsPath).name,
      date: new Date(stat.ctime),
    };
  }
}
