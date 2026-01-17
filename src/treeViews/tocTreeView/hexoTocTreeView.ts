import { commands, type TreeViewOptions, window, Selection } from 'vscode'
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
      })
    )
  }
}
