import type { TreeViewOptions } from 'vscode'
import { BaseTreeView } from '../common'
import { HexoTocProvider, type TocItem } from './hexoTocProvider'

export class HexoTocTreeView extends BaseTreeView<TocItem> {
  constructor(viewId: string, opts: Partial<TreeViewOptions<TocItem>> = {}) {
    const provider = new HexoTocProvider()

    super(viewId, provider, {
      ...opts,
      dragAndDropController: provider,
      canSelectMany: false,
    })
  }
}
