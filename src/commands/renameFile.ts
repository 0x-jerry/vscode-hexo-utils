import path from 'node:path'
import { askForNext, isExist } from '../utils'
import type { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider'
import { Uri, window } from 'vscode'
import { Command, type ICommandParsed, Commands, command } from './common'
import { rename } from './utils'

@command()
export class RenameFile extends Command {
  constructor() {
    super(Commands.rename)
  }

  async execute(cmd: ICommandParsed, item: ArticleItem): Promise<unknown> {
    const filePath = item.resourceUri
    const oldPath = filePath

    if (!oldPath) return

    const newName = await window.showInputBox({
      value: path.parse(oldPath.fsPath).name,
      prompt: 'Input a new name',
    })
    if (!newName) {
      return null
    }

    const newPath = Uri.joinPath(oldPath, '..', `${newName}.md`)
    if ((await isExist(newPath)) && !(await askForNext('Whether replace exist file?'))) {
      return null
    }

    await rename(filePath, newPath)
  }
}
