import {
  type CancellationToken,
  CodeLens,
  type CodeLensProvider,
  Range,
  type TextDocument,
} from 'vscode'
import { Commands } from './commands/common'
import { HexoMetadataKeys } from './hexoMetadata'

export class HexoCodeLensProvider implements CodeLensProvider {
  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken,
  ): CodeLens[] | Thenable<CodeLens[]> {
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
        if (line.startsWith(`${HexoMetadataKeys.tags}:`)) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(tag) Select Tags',
              command: Commands.selectTags,
            }),
          )
        }

        if (line.startsWith(`${HexoMetadataKeys.date}:`)) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(calendar) Update Date',
              command: Commands.updateDate,
              arguments: [HexoMetadataKeys.date],
            }),
          )
        }

        if (line.startsWith(`${HexoMetadataKeys.updated}:`)) {
          const range = new Range(i, 0, i, 0)
          lenses.push(
            new CodeLens(range, {
              title: '$(calendar) Update Updated',
              command: Commands.updateDate,
              arguments: [HexoMetadataKeys.updated],
            }),
          )
        }
      }
    }

    // If date or updated is missing, provide insert option
    if (fmStart !== -1 && fmEnd !== -1) {
      const hasDate = lines
        .slice(fmStart, fmEnd)
        .some((l) => l.startsWith(`${HexoMetadataKeys.date}:`))
      const hasUpdated = lines
        .slice(fmStart, fmEnd)
        .some((l) => l.startsWith(`${HexoMetadataKeys.updated}:`))

      const range = new Range(fmStart, 0, fmStart, 0)
      if (!hasDate) {
        lenses.push(
          new CodeLens(range, {
            title: '$(calendar) Insert Date',
            command: Commands.updateDate,
            arguments: [HexoMetadataKeys.date],
          }),
        )
      }
      if (!hasUpdated) {
        lenses.push(
          new CodeLens(range, {
            title: '$(calendar) Insert Updated',
            command: Commands.updateDate,
            arguments: [HexoMetadataKeys.updated],
          }),
        )
      }
    }

    return lenses
  }
}
