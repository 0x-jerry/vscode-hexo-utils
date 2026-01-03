import { window, type TextEditor, Range, Position } from 'vscode'
import { Command, command, Commands, type ICommandParsed } from './common'
import { getConfig, ConfigProperties } from '../configs'
import dayjs from 'dayjs'

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

    // Find Front Matter boundaries
    const lines = text.split(/\r?\n/)
    let fmStart = -1
    let fmEnd = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        if (fmStart === -1) {
          fmStart = i
        } else {
          fmEnd = i
          break
        }
      }
    }

    if (fmStart === -1 || fmEnd === -1) {
      return
    }

    const timeFormat = getConfig(ConfigProperties.generateTimeFormat)
    const now = timeFormat ? dayjs().format(timeFormat) : dayjs().format()
    const newValue = `${key}: ${now}`

    // Find the key within Front Matter
    let keyLine = -1
    for (let i = fmStart + 1; i < fmEnd; i++) {
      if (lines[i].startsWith(`${key}:`)) {
        keyLine = i
        break
      }
    }

    await editor.edit((editBuilder) => {
      if (keyLine !== -1) {
        // Update existing key
        const range = new Range(keyLine, 0, keyLine, lines[keyLine].length)
        editBuilder.replace(range, newValue)
      } else {
        // Insert new key
        // Try to insert after title, or at the top of Front Matter
        let insertLine = fmStart + 1
        for (let i = fmStart + 1; i < fmEnd; i++) {
          if (lines[i].startsWith('title:')) {
            insertLine = i + 1
            break
          }
        }
        editBuilder.insert(new Position(insertLine, 0), `${newValue}\n`)
      }
    })
  }
}
