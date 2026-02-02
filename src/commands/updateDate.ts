import dayjs from 'dayjs'
import { Range, type TextEditor, WorkspaceEdit, window, workspace } from 'vscode'
import { ConfigProperties, getConfig } from '../configs'
import { updateFrontMatter } from '../utils'
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

    await this.updateEditor(editor, key)
  }

  protected async updateEditor(editor: TextEditor, key: string) {
    const document = editor.document
    const text = document.getText()

    const timeFormat = getConfig(ConfigProperties.generateTimeFormat)
    const now = timeFormat ? dayjs().format(timeFormat) : dayjs().format()

    const newText = updateFrontMatter(text, key, now)

    if (newText !== text) {
      const edit = new WorkspaceEdit()
      edit.replace(
        document.uri,
        new Range(
          0,
          0,
          document.lineCount,
          document.lineAt(document.lineCount - 1).range.end.character,
        ),
        newText,
      )
      await workspace.applyEdit(edit)
      await document.save()
    }
  }
}
