import * as vscode from 'vscode';
import { isHexoProject, exec, fsUnlink, fsExist, fsRename, fsMkdir } from './utils';
import { getConfig, ConfigProperties } from './configs';
import { ArticleItem } from './hexoProvider';
import * as os from 'os';
import * as path from 'path';

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
    placeHolder: 'new article',
    prompt: 'Please input new article name',
  });

  if (!name) {
    vscode.window.showWarningMessage(`Invalid article name`);
    return null;
  }

  try {
    const cmd = getConfig(ConfigProperties.pkgManager) as string;

    await exec(cmd, ['hexo', 'new', type, `"${name}"`]);

    vscode.window.showInformationMessage(`Create a new [${type}] named [${name}]`);
  } catch (error) {
    vscode.window.showErrorMessage(`Create failed on [${type}], ${error}`);
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

  const err = await fsRename(filePath, path.join(toPath, fileName));
  if (err) {
    vscode.window.showErrorMessage(`Move ${fileName} to ${to} error: ${err}`);
  } else {
    vscode.window.showInformationMessage(`Move ${fileName} to ${to}`);
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

    vscode.window.showInformationMessage(`delete file ${filePath}`);
  } else {
    vscode.window.showErrorMessage(`${filePath} is not exist`);
  }
}

export default { createPost, createDraft, open, moveToDraft, deleteFile, moveToPost };
