import { error } from '../utils';
import { ArticleItem } from '../hexoArticleProvider';
import { Command, ICommandParsed, Commands, command } from './common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { configs } from '../configs';

@command()
export class DeleteFile extends Command {
  constructor() {
    super(Commands.delete);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    const filePath = item.resourceUri!.fsPath;
    const filename = path.parse(filePath).name;
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      await this.deleteAssetFolder(filename);
    } else {
      error(`${filePath} is not exist`);
    }
  }

  async deleteAssetFolder(filename: string) {
    const assetsFolder = path.join(configs.paths.post, filename);
    if ((await fs.pathExists(assetsFolder)) && (await fs.readdir(assetsFolder)).length === 0) {
      await fs.rmdir(assetsFolder);
    }
  }
}
