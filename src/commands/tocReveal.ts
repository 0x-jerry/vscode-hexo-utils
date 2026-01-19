import { Range, Selection, window } from 'vscode'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class TocReveal extends Command {
  constructor() {
    super(Commands.tocReveal)
  }

  async execute(_cmd: ICommandParsed, range: Range) {
    const editor = window.activeTextEditor
    if (!editor || !(range instanceof Range)) {
      return
    }

    editor.selection = new Selection(range.start, range.end)
    editor.revealRange(range)
    await window.showTextDocument(editor.document, { preserveFocus: false })
  }
}
