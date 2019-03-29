import * as path from 'path';
import { askForNext, error } from '../utils';
import { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider';
import { ArticleTypes } from './createArticle';
import { Command, command, ICommandParsed, Commands } from './common';
import * as fs from 'fs-extra';
import { configs } from '../configs';

@command()
export class MoveFile extends Command {
  constructor() {
    super(Commands.moveToDraft, Commands.moveToPost);
  }

  private async _move(item: ArticleItem, to: ArticleTypes) {
    const toPath = to === ArticleTypes.draft ? configs.paths.draft : configs.paths.post;
    const filePath = item.resourceUri!.fsPath;

    const fileName = path.relative(
      to === ArticleTypes.draft ? configs.paths.post : configs.paths.draft,
      filePath,
    );

    const destPath = path.join(toPath, fileName);

    await fs.ensureDir(path.dirname(destPath));

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
