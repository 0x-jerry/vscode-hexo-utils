import * as vscode from 'vscode';
import { isHexoProject, exec } from './utils';
import { configs, ConfigProperties } from './configs';

export enum ArticleTypes {
  post = 'post',
  draft = 'draft',
}

async function create(type: ArticleTypes) {
  if (!isHexoProject()) {
    return null;
  }

  try {
    const name =
      (await vscode.window.showInputBox({
        placeHolder: 'new article',
        prompt: 'Please input new article name',
      })) || 'new article';

    const cmd = configs(ConfigProperties.pkgManager) as string;

    await exec(cmd, ['hexo', 'new', type, `"${name}"`]);

    vscode.window.showInformationMessage(`Create a new [${type}] named [${name}]`);
  } catch (error) {
    console.log(error);
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

export default { createPost, createDraft, open };
