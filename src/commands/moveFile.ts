import * as path from 'path';
import { askForNext } from '../utils/utils';
import { error } from '../utils/log';
import { fsExist, fsRename, fsMkdir } from '../utils/fs';
import { ArticleItem } from '../hexoProvider';
import { ArticleTypes } from './createArticle';
import { Command, command, ICommandParsed, Commands } from './common';
import { workspace } from 'vscode';

@command()
export class MoveFile extends Command {
  constructor() {
    super(Commands.moveToDraft, Commands.moveToPost);
  }

  private async _move(item: ArticleItem, to: ArticleTypes) {
    const toPath = path.join(workspace.rootPath!, 'source', `_${to}s`);
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

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    // hexo.moveTo[post]
    // hexo.moveTo[draft]
    const to = cmd.args[0] as ArticleTypes;
    this._move(item, to);
  }
}
