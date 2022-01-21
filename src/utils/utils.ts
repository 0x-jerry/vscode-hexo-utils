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

const metaCache: Record<string, IHexoMetadata> = {};

export async function getMDFileMetadata(uri: Uri): Promise<IHexoMetadata> {
  const stat = await workspace.fs.stat(uri);

  const cacheId = uri.toString();
  const hit = metaCache[cacheId];

  if (hit && stat.mtime === hit.mtime) {
    return hit;
  }

  try {
    const content = await workspace.fs.readFile(uri);
    // /---(data)---/ => $1 === data
    const yamlReg = /^---((.|\n|\r)+?)---$/m;

    const yamlData = yamlReg.exec(content.toString());

    const data = yamljs.parse(yamlData![1]) || {};

    const categories: (string | string[])[] = Array.isArray(data.categories)
      ? data.categories
      : typeof data.categories === 'string'
      ? [data.categories]
      : [];

    const hasSubCategory = categories.find((n) => Array.isArray(n));

    const normalizedCategories = hasSubCategory
      ? categories.map((c) => (Array.isArray(c) ? c.join(' / ') : c))
      : categories.length
      ? [categories.join(' / ')]
      : [];

    const metadata = {
      tags: Array.isArray(data.tags) ? data.tags : [],
      filePath: uri,
      // →  · /
      categories: normalizedCategories,
      title: data.title || '',
      date: data.date || '',
      mtime: stat.mtime,
    };

    metaCache[cacheId] = metadata;

    return metadata;
  } catch (error) {
    const metadata = {
      tags: [],
      categories: [],
      filePath: uri,
      title: path.parse(uri.fsPath).name,
      date: new Date(stat.ctime),
      mtime: 0,
    };

    metaCache[cacheId] = metadata;

    return metadata;
  }
}

export function sleep(ts = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ts));
}

export function isVirtualWorkspace() {
  const isVirtualWorkspace =
    workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== 'file');

  return isVirtualWorkspace;
}
