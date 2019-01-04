import * as vscode from 'vscode';
import { askForNext } from '../utils/utils';
import { error } from '../utils/log';
import { fsUnlink, fsExist, fsRename, fsMkdir } from '../utils/fs';
import { ArticleItem } from '../hexoProvider';
import * as path from 'path';
import { ArticleTypes } from './createArticle';

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
  moveToDraft,
  deleteFile,
  moveToPost,
  rename,
};
