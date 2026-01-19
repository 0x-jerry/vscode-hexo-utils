import { commands, type TreeViewOptions, window } from 'vscode'
import type { Commands } from '../../commands'
import { sleep } from '../../utils'
import { BaseTreeView, type ViewTypes } from '../common'
import { type ClassifyItem, type ClassifyTypes, HexoClassifyProvider } from './hexoClassifyProvider'

export class ClassifyTreeView extends BaseTreeView<ClassifyItem> {
  provider: HexoClassifyProvider

  constructor(
    viewId: ViewTypes,
    type: ClassifyTypes,
    opts: Partial<TreeViewOptions<ClassifyItem>> = {},
  ) {
    const provider = new HexoClassifyProvider(type)
    super(viewId, provider, {
      ...opts,
      canSelectMany: false,
    })

    this.provider = provider

    this.onDidChanged()

    this.autoFocus()
  }

  private focus(editor = window.activeTextEditor) {
    if (!editor || !this.treeView.visible) {
      return
    }

    const file = editor.document.uri
    const fsPath =
      file.scheme === 'git'
        ? // remove `.git` suffix
          file.fsPath.slice(0, -3)
        : file.fsPath

    const item = this.provider.getItem(fsPath)

    if (!item) {
      return
    }

    this.treeView.reveal(item)
  }

  private autoFocus() {
    this.subscribe(
      window.onDidChangeActiveTextEditor(async (editor) => {
        await sleep(300)
        this.focus(editor)
      }),
    )
  }

  onDidChanged() {
    // this.treeView.onDidChangeSelection((e) => {
    //   console.log(e);
    // });
  }

  registerRefreshCmd(cmd: Commands) {
    const _cmd = commands.registerCommand(cmd, () => this.provider.refresh())
    this.subscribe(_cmd)
  }
}
