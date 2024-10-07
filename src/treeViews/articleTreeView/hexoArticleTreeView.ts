import {
  HexoArticleProvider,
  type ArticleItem,
  type HexoArticleOption,
} from './hexoArticleProvider'
import type { ArticleTypes, Commands } from '../../commands'
import { type TreeViewOptions, commands, window } from 'vscode'
import { BaseTreeView, type ViewTypes } from '../common'
import { sleep } from '../../utils'

export class ArticleTreeView extends BaseTreeView<ArticleItem> {
  provider: HexoArticleProvider

  constructor(
    viewId: ViewTypes,
    type: ArticleTypes,
    providerOpt: HexoArticleOption,
    opts: Partial<TreeViewOptions<ArticleItem>> = {},
  ) {
    const provider = new HexoArticleProvider(type, providerOpt)
    super(viewId, provider, {
      ...opts,
      dragAndDropController: provider,
    })

    this.provider = provider

    this.onDidChanged()

    this.autoFocus()
  }

  private async focus(editor = window.activeTextEditor) {
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
      // Make sure load all tree view items, then try to focus again.
      await sleep(300)
      return
    }

    this.treeView.reveal(item)
  }

  private autoFocus() {
    this.subscribe(
      window.onDidChangeActiveTextEditor((editor) => {
        this.focus(editor)
      }),
    )

    this.subscribe(this.treeView.onDidChangeVisibility(() => this.focus()))
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
