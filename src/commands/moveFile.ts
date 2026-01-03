import path from 'node:path'
import { Uri } from 'vscode'
import { AssetFolderType, ConfigProperties, configs, getConfig } from '../configs'
import type { ArticleItem } from '../treeViews/articleTreeView/hexoArticleProvider'
import { askForNext, isExist } from '../utils'
import { Command, Commands, command, type ICommandParsed } from './common'
import { ArticleTypes } from './createArticle'
import { rename } from './utils'

@command()
export class MoveFile extends Command {
  constructor() {
    super(Commands.moveToDraft, Commands.moveToPost)
  }

  static async move(to: ArticleTypes, items: ArticleItem[]) {
    const p = items.map(async (item) => {
      const isToDraft = to === ArticleTypes.draft
      const toPath = isToDraft ? configs.paths.draft : configs.paths.post

      const fromFileUri = item.resourceUri

      if (!fromFileUri) return

      const fileName = path.relative(
        isToDraft ? configs.paths.post.fsPath : configs.paths.draft.fsPath,
        fromFileUri.fsPath,
      )

      const destPath = Uri.joinPath(toPath, fileName)

      if ((await isExist(destPath)) && !(await askForNext('Whether to replace the exist file?'))) {
        return null
      }

      await rename(fromFileUri, destPath)

      // move resource folder
      {
        const assetFolderType = getConfig(ConfigProperties.assetFolderType)
        if (assetFolderType === AssetFolderType.Global) {
          return
        }

        const fromResourceFolder = isToDraft ? configs.paths.post : configs.paths.draft
        const toResourceFolder = isToDraft ? configs.paths.draft : configs.paths.post

        const fileNameWithoutExt = fileName.replace(/\.md$/, '')
        const from = Uri.joinPath(fromResourceFolder, fileNameWithoutExt)
        const to = Uri.joinPath(toResourceFolder, fileNameWithoutExt)

        if (await isExist(from)) {
          if (
            (await isExist(to)) &&
            !(await askForNext('Whether to replace the exist resource folder?'))
          ) {
            return null
          }

          await rename(from, to)
        }
      }
    })

    await Promise.all(p)
  }

  async execute(cmd: ICommandParsed, item: ArticleItem, list: ArticleItem[] = []) {
    if (list.length === 0) {
      list.push(item)
    }
    // hexo.moveTo[post]
    // hexo.moveTo[draft]
    const to = cmd.args[0] as ArticleTypes
    MoveFile.move(to, list)
  }
}
