import {
  type CodeLensProvider,
  type TextDocument,
  type CancellationToken,
  CodeLens,
  Range,
} from 'vscode'
import { Commands } from './commands/common'

export class HexoCodeLensProvider implements CodeLensProvider {
  provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
    const lenses: CodeLens[] = []
    const text = document.getText()

    // Only in Front Matter
    const lines = text.split(/\r?\n/)
    let inFrontMatter = false
    let fmStart = -1
    let fmEnd = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '---') {
        if (!inFrontMatter) {
          inFrontMatter = true
          fmStart = i
          continue
        } else {
          fmEnd = i
          break // End of Front Matter
        }
      }

      if (inFrontMatter) {
        if (line.startsWith('tags:')) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(tag) Select Tags',
              command: Commands.selectTags,
            }),
          )
        }

        if (line.startsWith('date:')) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(calendar) Update Date',
              command: Commands.updateDate,
              arguments: ['date'],
            }),
          )
        }

        if (line.startsWith('updated:')) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(calendar) Update Updated',
              command: Commands.updateDate,
              arguments: ['updated'],
            }),
          )
        }
      }
    }

    // If date or updated is missing, provide insert option
    if (fmStart !== -1 && fmEnd !== -1) {
      const hasDate = lines.slice(fmStart, fmEnd).some((l) => l.startsWith('date:'))
      const hasUpdated = lines.slice(fmStart, fmEnd).some((l) => l.startsWith('updated:'))

      const range = new Range(fmStart, 0, fmStart, 0)
      if (!hasDate) {
        lenses.push(
          new CodeLens(range, {
            title: '$(calendar) Insert Date',
            command: Commands.updateDate,
            arguments: ['date'],
          }),
        )
      }
      if (!hasUpdated) {
        lenses.push(
          new CodeLens(range, {
            title: '$(calendar) Insert Updated',
            command: Commands.updateDate,
            arguments: ['updated'],
          }),
        )
      }
    }

    return lenses
  }
}
