import path from 'path';
import { askForNext, isExist } from '../utils';
import { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider';
import { ArticleTypes } from './createArticle';
import { Command, command, ICommandParsed, Commands } from './common';
import { configs } from '../configs';
import { rename } from './utils';
import { Uri } from 'vscode';

@command()
export class MoveFile extends Command {
  constructor() {
    super(Commands.moveToDraft, Commands.moveToPost);
  }

  private async _move(item: ArticleItem, to: ArticleTypes) {
    const toPath = to === ArticleTypes.draft ? configs.paths.draft : configs.paths.post;
    const filePath = item.resourceUri!.fsPath;

    const fileName = path.relative(
      to === ArticleTypes.draft ? configs.paths.post.fsPath : configs.paths.draft.fsPath,
      filePath,
    );

    const destPath = Uri.joinPath(toPath, fileName);

    if ((await isExist(destPath)) && !(await askForNext('Whether to replace the exist file?'))) {
      return null;
    }

    rename(filePath, destPath);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    // hexo.moveTo[post]
    // hexo.moveTo[draft]
    const to = cmd.args[0] as ArticleTypes;
    this._move(item, to);
  }
}
