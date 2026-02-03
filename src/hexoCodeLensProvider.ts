import { toValue, type Value } from '@0x-jerry/utils'
import {
  type CancellationToken,
  CodeLens,
  type CodeLensProvider,
  Range,
  type TextDocument,
} from 'vscode'
import { Commands } from './commands/common'
import { HexoMetadataKeys, metadataManager } from './metadata'

export class HexoCodeLensProvider implements CodeLensProvider {
  async provideCodeLenses(document: TextDocument, _token: CancellationToken): Promise<CodeLens[]> {
    const lenses: CodeLens[] = []
    const data = await metadataManager.get(document.uri)

    const range = data.range
    if (!range) {
      return lenses
    }

    const { start: fmStart, end: fmEnd } = range

    const lines = document.getText().split(/\r?\n/)

    const hasLens = {
      date: false,
      updated: false,
    }

    for (let i = fmStart + 1; i < fmEnd; i++) {
      const line = lines[i]

      pushLenseIf({
        condition: line.startsWith(`${HexoMetadataKeys.tags}:`),
        line: i,
        title: '$(tag) Select Tags',
        command: Commands.selectTags,
      })

      pushLenseIf({
        condition: line.startsWith(`${HexoMetadataKeys.categories}:`),
        line: i,
        title: '$(list-unordered) Select Categories',
        command: Commands.selectCategories,
      })

      if (line.startsWith(`${HexoMetadataKeys.date}:`)) {
        hasLens.date = true
        pushLenseIf({
          condition: true,
          line: i,
          title: '$(calendar) Update Date',
          command: Commands.updateDate,
          arguments: [HexoMetadataKeys.date],
        })
      }

      if (line.startsWith(`${HexoMetadataKeys.updated}:`)) {
        hasLens.updated = true

        pushLenseIf({
          condition: true,
          line: i,
          title: '$(calendar) Update Updated',
          command: Commands.updateDate,
          arguments: [HexoMetadataKeys.updated],
        })
      }
    }

    pushLenseIf({
      condition: !hasLens.date,
      line: fmStart,
      title: '$(calendar) Insert Date',
      command: Commands.updateDate,
      arguments: [HexoMetadataKeys.date],
    })

    pushLenseIf({
      condition: !hasLens.updated,
      line: fmStart,
      title: '$(calendar) Insert Updated',
      command: Commands.updateDate,
      arguments: [HexoMetadataKeys.updated],
    })

    return lenses

    function pushLenseIf(opt: {
      condition: Value<boolean>
      line: number
      title: string
      command: string
      arguments?: unknown[]
    }) {
      const { line, condition, title, command, arguments: args } = opt

      if (!toValue(condition)) {
        return
      }

      lenses.push(
        new CodeLens(new Range(line, 0, line, 0), {
          title,
          command,
          arguments: args,
        }),
      )
    }
  }
}
