import * as vscode from 'vscode';
import { isHexoProject, exec, fsUnlink, fsExist } from './utils';
import { configs, ConfigProperties } from './configs';
import { HexoItem } from './hexoProvider';
import * as os from 'os';

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
    const cmd = configs(ConfigProperties.pkgManager) as string;

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

async function removeToDraft(item: HexoItem) {
  vscode.window.showInformationMessage('Working on it');
}

async function deleteFile(item: HexoItem) {
  const fileUri = item.resourceUri!.path;
  const filePath = os.platform() === 'win32' ? fileUri.slice(1) : fileUri;

  if (await fsExist(filePath)) {
    await fsUnlink(filePath);

    vscode.window.showInformationMessage(`delete file ${filePath}`);
  } else {
    vscode.window.showErrorMessage(`${filePath} is not exist`);
  }
}

export default { createPost, createDraft, open, removeToDraft, deleteFile };
