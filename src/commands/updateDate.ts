import dayjs from 'dayjs'
import { window } from 'vscode'
import { ConfigProperties, getConfig } from '../configs'
import { updateDocumentFrontmatter } from '../metadata'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class UpdateDate extends Command {
  constructor() {
    super(Commands.updateDate)
  }

  async execute(_cmd: ICommandParsed, ...args: unknown[]) {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    const key = args[0] as string
    if (!key || (key !== 'date' && key !== 'updated')) {
      return
    }

    const timeFormat = getConfig(ConfigProperties.generateTimeFormat)
    const now = timeFormat ? dayjs().format(timeFormat) : dayjs().format()

    await updateDocumentFrontmatter(editor.document, key, now)
  }
}
