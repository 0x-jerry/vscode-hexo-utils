import { commands, type TreeViewOptions, window, Selection, Range } from 'vscode'
import { BaseTreeView } from '../common'
import { HexoTocProvider, TocItem } from './hexoTocProvider'

export class HexoTocTreeView extends BaseTreeView<TocItem> {
  provider: HexoTocProvider

  constructor(viewId: string, opts: Partial<TreeViewOptions<TocItem>> = {}) {
    const provider = new HexoTocProvider()
    super(viewId, provider, {
      ...opts,
      dragAndDropController: provider,
      canSelectMany: false,
    })

    this.provider = provider

    this.registerCommands()
  }

  private registerCommands() {
    this.subscribe(
      commands.registerCommand('hexo.toc.reveal', (item: TocItem | { lineStart: number }) => {
        const editor = window.activeTextEditor
        if (!editor || !('lineStart' in item)) {
          return
        }

        const lineStart = item.lineStart
        const range = editor.document.lineAt(lineStart).range
        editor.selection = new Selection(range.start, range.start)
        editor.revealRange(range)
      }),
      commands.registerCommand('hexo.toc.rename', async (item: TocItem) => {
          // If called from context menu, it might pass current selection if multiple.
          // But we expect one item.
          await this.provider.refresh() // Ensure we have latest line numbers

          const newTitle = await window.showInputBox({
              value: typeof item.label === 'string' ? item.label : item.label?.label,
              prompt: 'Enter new title'
          })

          if (!newTitle) return

          const editor = window.activeTextEditor
          if (!editor) return

          const line = editor.document.lineAt(item.lineStart)
          const match = line.text.match(/^(#{1,6})\s+(.*)$/)
          if (match) {
              const hashes = match[1]
              await editor.edit(editBuilder => {
                  editBuilder.replace(line.range, `${hashes} ${newTitle}`)
              })
          }
      }),
      commands.registerCommand('hexo.toc.delete', async (item: TocItem) => {
          const editor = window.activeTextEditor
          if (!editor) return

          const deleteRange = new Range(item.lineStart, 0, item.lineEnd + 1, 0)
          await editor.edit(editBuilder => {
              editBuilder.delete(deleteRange)
          })
      })
    )
  }
}
