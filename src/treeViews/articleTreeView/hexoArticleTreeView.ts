import { HexoArticleProvider, ArticleItem } from './hexoArticleProvider';
import { ArticleTypes, Commands } from '../../commands';
import { TreeViewOptions, commands, window } from 'vscode';
import { BaseTreeView, ViewTypes } from '../common';

export class ArticleTreeView extends BaseTreeView<ArticleItem> {
  provider: HexoArticleProvider;

  constructor(
    viewId: ViewTypes,
    type: ArticleTypes,
    opts: Partial<TreeViewOptions<ArticleItem>> = {},
  ) {
    const provider = new HexoArticleProvider(type);
    super(viewId, provider, opts);

    this.provider = provider;

    this.onDidChanged();

    this.autoFocus();
  }

  private autoFocus() {
    const _dispose = window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor || !this.treeView.visible) {
        return;
      }

      const file = editor.document.uri;

      const fsPath =
        file.scheme === 'git'
          ? // remove `.git` suffix
            file.fsPath.slice(0, -3)
          : file.fsPath;

      const item = this.provider.getItem(fsPath);
      if (!item) {
        return;
      }

      this.treeView.reveal(item);
    });

    this.subscribe(_dispose);
  }

  onDidChanged() {
    // this.treeView.onDidChangeSelection((e) => {
    //   console.log(e);
    // });
  }

  registerRefreshCmd(cmd: Commands) {
    const _cmd = commands.registerCommand(cmd, () => this.provider.refresh());
    this.subscribe(_cmd);
  }
}
