import { fsUnlink, fsExist, error } from '../utils';
import { ArticleItem } from '../hexoArticleProvider';
import { Command, ICommandParsed, Commands, command } from './common';

@command()
export class DeleteFile extends Command {
  constructor() {
    super(Commands.delete);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    const filePath = item.resourceUri!.fsPath;
    if (await fsExist(filePath)) {
      await fsUnlink(filePath);
    } else {
      error(`${filePath} is not exist`);
    }
  }
}
