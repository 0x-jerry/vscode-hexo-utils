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
} from './utils';
import { ArticleItem } from './hexoProvider';
import * as os from 'os';
import * as path from 'path';
import * as mustache from 'mustache';

export enum ArticleTypes {
  post = 'post',
  draft = 'draft',
}

async function create(type: ArticleTypes) {
  if (!isHexoProject()) {
    return null;
  }

  const name = await vscode.window.showInputBox({
    value: 'new article',
    prompt: 'Please input new article name',
  });

  if (!name) {
    return warn(`Invalid article name`);
  }

  try {
    const filePath = path.join(vscode.workspace.rootPath!, 'source', `_${type}s`);
    const scaffoldPath = path.join(vscode.workspace.rootPath!, 'scaffolds');

    if (!(await fsExist(filePath))) {
      await fsMkdir(filePath);
    }

    const tpl = (await fsRead(path.join(scaffoldPath, type + '.md'))) as string;

    const result = mustache.render(tpl, {
      title: name,
      date: new Date().toISOString(),
    });

    fsWriteFile(path.join(filePath, name + '.md'), result);
  } catch (err) {
    error(`Create failed on [${type}], ${err}`);
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

export default { createPost, createDraft, open, moveToDraft, deleteFile, moveToPost };
