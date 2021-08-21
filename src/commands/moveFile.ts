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

  private async _move(to: ArticleTypes, items: ArticleItem[]) {
    const p = items.map(async (item) => {
      const toPath = to === ArticleTypes.draft ? configs.paths.draft : configs.paths.post;
      const sourceUri = item.resourceUri!;

      const fileName = path.relative(
        to === ArticleTypes.draft ? configs.paths.post.fsPath : configs.paths.draft.fsPath,
        sourceUri.fsPath,
      );

      const destPath = Uri.joinPath(toPath, fileName);

      if ((await isExist(destPath)) && !(await askForNext('Whether to replace the exist file?'))) {
        return null;
      }

      await rename(sourceUri, destPath);
    });

    await Promise.all(p);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem, list: ArticleItem[] = []): Promise<any> {
    if (list.length === 0) {
      list.push(item);
    }
    // hexo.moveTo[post]
    // hexo.moveTo[draft]
    const to = cmd.args[0] as ArticleTypes;
    this._move(to, list);
  }
}
