import path from 'node:path'
import { Uri, workspace } from 'vscode'
import { configs } from '../configs'
import type { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider'
import { error, isExist } from '../utils'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class DeleteFile extends Command {
  constructor() {
    super(Commands.delete)
  }

  async execute(_: ICommandParsed, _file: ArticleItem, list: ArticleItem[] = []) {
    if (list.length === 0) {
      list.push(_file)
    }

    const p = list.map(async (item) => {
      const fileUri = item.resourceUri
      if (!fileUri) {
        return
      }

      const filename = path.parse(fileUri.fsPath).name

      if (await isExist(fileUri)) {
        await workspace.fs.delete(fileUri)
        await this.deleteAssetFolder(filename)
      } else {
        error(`${fileUri} is not exist`)
      }
    })

    await Promise.all(p)
  }

  async deleteAssetFolder(filename: string) {
    const assetsFolder = Uri.joinPath(configs.paths.post, filename)
    if (
      (await isExist(assetsFolder)) &&
      (await workspace.fs.readDirectory(assetsFolder)).length === 0
    ) {
      await workspace.fs.delete(assetsFolder, { recursive: true, useTrash: true })
    }
  }
}
