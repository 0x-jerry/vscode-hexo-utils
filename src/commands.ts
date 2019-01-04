import * as vscode from 'vscode';
import {
  isHexoProject,
  fsUnlink,
  fsExist,
  fsRename,
  fsMkdir,
  error,
  fsWriteFile,
  fsRead,
  getDirFiles,
  askForNext,
} from './utils';
import { ArticleItem } from './hexoProvider';
import * as path from 'path';
import * as mustache from 'mustache';

export enum ArticleTypes {
  post = 'post',
  draft = 'draft',
}

async function create(type: ArticleTypes, template?: string) {
  if (!isHexoProject()) {
    return null;
  }
  template = template || type;

  const name = await vscode.window.showInputBox({
    value: 'new article',
    prompt: 'Please input new article name',
  });

  if (!name) {
    return null;
  }

  try {
    const typeFolder = path.join(vscode.workspace.rootPath!, 'source', `_${type}s`);
    const scaffoldPath = path.join(vscode.workspace.rootPath!, 'scaffolds');

    if (!(await fsExist(typeFolder))) {
      await fsMkdir(typeFolder);
    }

    const createPath = path.join(typeFolder, name + '.md');

    if ((await fsExist(createPath)) && !(await askForNext('Whether replace exist file?'))) {
      return null;
    }

    const tplPath = path.join(scaffoldPath, template + '.md');
    const tpl = (await fsRead(tplPath)) as string;

    const result = mustache.render(tpl, {
      title: name,
      date: new Date().toISOString(),
    });

    fsWriteFile(createPath, result);
  } catch (err) {
    error(`Create failed on [${template}], ${err}`);
  }
}

async function open(uri: string) {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc);
}

async function createPost() {
  await create(ArticleTypes.post);
}

async function createDraft() {
  await create(ArticleTypes.draft);
}

async function moveFile(item: ArticleItem, to: ArticleTypes) {
  const toPath = path.join(vscode.workspace.rootPath!, 'source', `_${to}s`);

  const filePath = item.resourceUri!.fsPath;

  const fileName = path.basename(filePath);

  if (!(await fsExist(toPath))) {
    await fsMkdir(toPath);
  }

  const destPath = path.join(toPath, fileName);

  if ((await fsExist(destPath)) && !(await askForNext('Whether replace exist file?'))) {
    return null;
  }

  const err = await fsRename(filePath, destPath);
  if (err) {
    error(`Move ${fileName} to ${to} error: ${err}`);
  }
}

async function moveToDraft(item: ArticleItem) {
  await moveFile(item, ArticleTypes.draft);
}

async function moveToPost(item: ArticleItem) {
  await moveFile(item, ArticleTypes.post);
}

async function deleteFile(item: ArticleItem) {
  const filePath = item.resourceUri!.fsPath;

  if (await fsExist(filePath)) {
    await fsUnlink(filePath);
  } else {
    error(`${filePath} is not exist`);
  }
}

async function createWithScaffolds() {
  if (!isHexoProject()) {
    return null;
  }

  const scaffoldPath = path.join(vscode.workspace.rootPath!, 'scaffolds');
  const items = await getDirFiles(scaffoldPath);

  const file = await vscode.window.showQuickPick(items.map((i) => i.substr(0, i.length - 3)));

  if (file) {
    const isDraft = file === 'draft';

    await create(isDraft ? ArticleTypes.draft : ArticleTypes.post, file);
  }
}

async function rename(item: ArticleItem) {
  const filePath = item.resourceUri!.fsPath;
  const oldPath = path.parse(filePath);

  const newName = await vscode.window.showInputBox({
    value: oldPath.name,
    prompt: 'Input a new name',
  });

  if (!newName) {
    return null;
  }

  const newPath = path.join(oldPath.dir, newName + '.md');

  if ((await fsExist(newPath)) && !(await askForNext('Whether replace exist file?'))) {
    return null;
  }

  await fsRename(filePath, newPath);
}

export default {
  createPost,
  createDraft,
  open,
  moveToDraft,
  deleteFile,
  moveToPost,
  createWithScaffolds,
  rename,
};
