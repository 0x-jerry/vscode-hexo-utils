import * as vscode from 'vscode';
import {
  isHexoProject,
  fsUnlink,
  fsExist,
  fsRename,
  fsMkdir,
  error,
  warn,
  fsWriteFile,
  fsRead,
  getDirFiles,
  info,
} from './utils';
import { ArticleItem } from './hexoProvider';
import * as os from 'os';
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

    const tplPath = path.join(scaffoldPath, template + '.md');
    const tpl = (await fsRead(tplPath)) as string;

    const result = mustache.render(tpl, {
      title: name,
      date: new Date().toISOString(),
    });

    fsWriteFile(path.join(typeFolder, name + '.md'), result);
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

  const fileUri = item.resourceUri!.path;
  const filePath = os.platform() === 'win32' ? fileUri.slice(1) : fileUri;
  const fileName = path.basename(filePath);

  if (!(await fsExist(toPath))) {
    await fsMkdir(toPath);
  }

  const destPath = path.join(toPath, fileName);
  if (await fsExist(destPath)) {
    return warn(`[${fileName}] has exist in ${to}`);
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
  const fileUri = item.resourceUri!.path;
  const filePath = os.platform() === 'win32' ? fileUri.slice(1) : fileUri;

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

  console.log('Working on it');
}

export default {
  createPost,
  createDraft,
  open,
  moveToDraft,
  deleteFile,
  moveToPost,
  createWithScaffolds,
};
