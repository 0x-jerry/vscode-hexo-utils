import { error } from '../utils';
import { ArticleItem } from '../hexoArticleProvider';
import { Command, ICommandParsed, Commands, command } from './common';
import * as fs from 'fs-extra';

@command()
export class DeleteFile extends Command {
  constructor() {
    super(Commands.delete);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    const filePath = item.resourceUri!.fsPath;
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
    } else {
      error(`${filePath} is not exist`);
    }
  }
}
