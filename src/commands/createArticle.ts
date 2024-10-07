import path from 'path'
import mustache from 'mustache'
import { getDirFiles, askForNext, error, isExist } from '../utils'
import { commands, Uri, window, workspace } from 'vscode'
import { Command, Commands, command, type ICommandParsed } from './common'
import { configs, getConfig, ConfigProperties } from '../configs'
import dayjs from 'dayjs'

export enum ArticleTypes {
  post = 'post',
  draft = 'draft',
}

@command()
export class CreateArticle extends Command {
  constructor() {
    super(Commands.new, Commands.newDraft, Commands.newPost)
  }

  private async createFileWithTemplate(type: ArticleTypes, template?: string) {
    template = template || type

    const name = await window.showInputBox({
      value: 'new article',
      prompt: 'Please input new article name',
    })

    const title = (name || '').trim()
    if (!title) {
      return null
    }

    try {
      const filePath = title.split('.').pop()!
      const file = await this.createWithTpl(filePath, type, template)
      await commands.executeCommand(Commands.open, file)
    } catch (err) {
      error(`Create failed on [${template}], ${err}`)
    }
  }

  private async createWithTpl(filePath: string, type: ArticleTypes, template: string) {
    const filePathInfo = path.parse(filePath + '.md')

    const typeFolder = configs.paths[type]

    await workspace.fs.createDirectory(typeFolder)

    const createFilePath = Uri.joinPath(typeFolder, filePathInfo.dir, filePathInfo.base)

    if ((await isExist(createFilePath)) && !(await askForNext('Whether replace exist file?'))) {
      return null
    }

    const tplPath = Uri.joinPath(configs.paths.scaffold, template + '.md')
    const tpl = await workspace.fs.readFile(tplPath)

    const result = mustache.render(
      tpl.toString(),
      {
        title: filePathInfo.name,
        date: dayjs().format(getConfig(ConfigProperties.generateTimeFormat)),
      },
      undefined,
      {
        // No need to escape, #49.
        escape: (str) => str,
      },
    )

    await workspace.fs.writeFile(createFilePath, Buffer.from(result))

    const resourceDir = Uri.joinPath(typeFolder, filePathInfo.dir, filePathInfo.name)

    await this.createResourceDir(resourceDir)

    return createFilePath
  }

  private async createResourceDir(fileAssetPath: Uri) {
    const hexoConf = await configs.hexoConfig()
    if (hexoConf && hexoConf.post_asset_folder && !(await isExist(fileAssetPath))) {
      await workspace.fs.createDirectory(fileAssetPath)
    }
  }

  async execute(cmd: ICommandParsed) {
    // command from commandPalette
    if (!cmd.args[0]) {
      const items = await getDirFiles(configs.paths.scaffold)

      const file = await window.showQuickPick(items.map(([name]) => name.slice(0, -'.md'.length)))

      if (file) {
        const isDraft = file === 'draft'

        await this.createFileWithTemplate(isDraft ? ArticleTypes.draft : ArticleTypes.post, file)
      }
    } else {
      await this.createFileWithTemplate(cmd.args[0] as ArticleTypes)
    }
  }
}
