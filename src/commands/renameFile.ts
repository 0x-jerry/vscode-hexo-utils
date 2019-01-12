import * as path from 'path';
import { fsExist, fsRename, askForNext } from '../utils';
import { ArticleItem } from '../hexoArticleProvider';
import { window } from 'vscode';
import { Command, ICommandParsed, Commands, command } from './common';

@command()
export class RenameFile extends Command {
  constructor() {
    super(Commands.rename);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    const filePath = item.resourceUri!.fsPath;
    const oldPath = path.parse(filePath);

    const newName = await window.showInputBox({
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
}
