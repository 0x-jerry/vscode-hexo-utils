import { Selection, window } from 'vscode'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class TocReveal extends Command {
  constructor() {
    super(Commands.tocReveal)
  }

  async execute(_cmd: ICommandParsed, item: { lineStart: number }) {
    const editor = window.activeTextEditor
    if (!editor || !('lineStart' in item)) {
      return
    }

    const lineStart = item.lineStart
    const range = editor.document.lineAt(lineStart).range
    editor.selection = new Selection(range.start, range.start)
    editor.revealRange(range)
  }
}
