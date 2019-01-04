import * as vscode from 'vscode';
import { askForNext } from '../utils/utils';
import { error } from '../utils/log';
import { fsUnlink, fsExist, fsRename } from '../utils/fs';
import { ArticleItem } from '../hexoProvider';
import * as path from 'path';

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
  deleteFile,
  rename,
};
