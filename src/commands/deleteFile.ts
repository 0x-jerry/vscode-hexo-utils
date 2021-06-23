import { error, isExist } from '../utils';
import { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider';
import { Command, ICommandParsed, Commands, command } from './common';
import path from 'path';
import { configs } from '../configs';
import { Uri, workspace } from 'vscode';

@command()
export class DeleteFile extends Command {
  constructor() {
    super(Commands.delete);
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<any> {
    const fileUri = item.resourceUri!;
    const filename = path.parse(fileUri.fsPath).name;
    if (await isExist(fileUri)) {
      await workspace.fs.delete(fileUri)
      await this.deleteAssetFolder(filename);
    } else {
      error(`${fileUri} is not exist`);
    }
  }

  async deleteAssetFolder(filename: string) {
    const assetsFolder = Uri.joinPath(configs.paths.post, filename);
    if ((await isExist(assetsFolder)) && (await workspace.fs.readDirectory(assetsFolder)).length === 0) {
      await workspace.fs.delete(assetsFolder)
    }
  }
}
