import * as path from 'path';
import { askForNext, error } from '../utils';
import { ArticleItem } from '../hexoArticleProvider';
import { ArticleTypes } from './createArticle';
import { Command, command, ICommandParsed, Commands } from './common';
import { workspace } from 'vscode';
import * as fs from 'fs-extra';

@command()
export class MoveFile extends Command {
  constructor() {
    super(Commands.moveToDraft, Commands.moveToPost);
  }

  private async _move(item: ArticleItem, to: ArticleTypes) {
    const toPath = path.join(workspace.rootPath!, 'source', `_${to}s`);
    const filePath = item.resourceUri!.fsPath;

    const fileName = path.basename(filePath);

    await fs.ensureDir(toPath);

    const destPath = path.join(toPath, fileName);

    if ((await fs.pathExists(destPath)) && !(await askForNext('Whether replace exist file?'))) {
      return null;
    }

    try {
      await fs.rename(filePath, destPath);
    } catch (err) {
      error(`Move ${fileName} to ${to} error: ${err}`);
    }
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    // hexo.moveTo[post]
    // hexo.moveTo[draft]
    const to = cmd.args[0] as ArticleTypes;
    this._move(item, to);
  }
}
