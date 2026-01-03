import { window, type TextEditor, Range } from 'vscode'
import yamljs from 'yamljs'
import { Command, command, Commands } from './common'
import { HexoMetadataUtils } from '../hexoMetadata'

abstract class ClassifyCommand extends Command {
  protected getCurrentValues(editor: TextEditor, key: string): string[] {
    const text = editor.document.getText()
    const yamlReg = /^---((.|\n|\r)+?)---$/m
    const match = yamlReg.exec(text)
    if (!match) {
      return []
    }

    try {
      const data = yamljs.parse(match[1]) || {}
      const val = data[key]

      if (Array.isArray(val)) {
        return val.map((v) => String(v))
      }
      if (typeof val === 'string') {
        return [val]
      }
    } catch (e) {
      // ignore
    }

    return []
  }

  protected async updateEditor(editor: TextEditor, key: string, values: string[]) {
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

    // Find the key within Front Matter
    let keyStartLine = -1
    let keyEndLine = -1
    for (let i = fmStart + 1; i < fmEnd; i++) {
      if (lines[i].startsWith(`${key}:`)) {
        keyStartLine = i
        // Find where this key's value ends (next key or end of front matter)
        let j = i + 1
        while (
          j < fmEnd &&
          (lines[j].startsWith(' ') || lines[j].startsWith('-') || lines[j].trim() === '')
        ) {
          j++
        }
        keyEndLine = j - 1
        break
      }
    }

    let newValue = ''
    if (key === 'categories') {
      if (values.length === 0) {
        newValue = `${key}: []`
      } else if (values.length === 1 && !values[0].includes(' / ')) {
        newValue = `${key}: ${values[0]}`
      } else {
        newValue = `${key}:\n`
        for (const val of values) {
          const parts = val.split(' / ')
          if (parts.length > 1) {
            newValue += `  - [${parts.join(', ')}]\n`
          } else {
            newValue += `  - ${parts[0]}\n`
          }
        }
        newValue = newValue.trimEnd()
      }
    } else {
      // tags
      if (values.length > 1) {
        newValue = `${key}: [${values.join(', ')}]`
      } else if (values.length === 1) {
        newValue = `${key}: ${values[0]}`
      } else {
        newValue = `${key}: []`
      }
    }

    if (keyStartLine !== -1) {
      const range = new Range(keyStartLine, 0, keyEndLine, lines[keyEndLine].length)
      editor.edit((editBuilder) => {
        editBuilder.replace(range, newValue)
      })
    } else {
      // Key not found, insert after the first ---
      editor.edit((editBuilder) => {
        editBuilder.insert(document.lineAt(fmStart + 1).range.start, `${newValue}\n`)
      })
    }
  }
}

@command()
export class SelectTags extends ClassifyCommand {
  constructor() {
    super(Commands.selectTags)
  }

  async execute(): Promise<void> {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    const currentTags = this.getCurrentValues(editor, 'tags')
    const allTags = await HexoMetadataUtils.getTags()

    const items = allTags
      .map((tag) => ({
        label: tag,
        picked: currentTags.includes(tag),
      }))
      .sort((a, b) => Number(b.picked) - Number(a.picked))

    const selected = await window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select tags',
    })

    if (selected) {
      this.updateEditor(
        editor,
        'tags',
        selected.map((item) => item.label),
      )
    }
  }
}

