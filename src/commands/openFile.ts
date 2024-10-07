import { type Uri, commands, window, workspace } from 'vscode'
import { Command, type ICommandParsed, command, Commands, BuiltInCommands } from './common'

@command()
export class OpenFile extends Command {
  lastClickTime = 0
  lastSelectPath = ''

  constructor() {
    super(Commands.open)
  }

  async execute(cmd: ICommandParsed, uri: Uri): Promise<any> {
    if (this.checkDoubleClick(uri)) {
      const doc = await workspace.openTextDocument(uri)
      await window.showTextDocument(doc, {
        preserveFocus: true,
        preview: false,
      })
    } else {
      await commands.executeCommand(BuiltInCommands.Open, uri)
    }
  }

  checkDoubleClick(uri: Uri) {
    const now = new Date().getTime()
    const currentPath = uri.toString()
    const gap = 500

    const isDbClick = now - this.lastClickTime <= gap
    const isTheSameFile = currentPath === this.lastSelectPath

    this.lastSelectPath = currentPath
    this.lastClickTime = now

    return isDbClick && isTheSameFile
  }
}
