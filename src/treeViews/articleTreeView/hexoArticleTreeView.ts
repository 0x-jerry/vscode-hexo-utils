import { HexoArticleProvider, ArticleItem } from './hexoArticleProvider';
import { ArticleTypes, Commands } from '../../commands';
import { TreeViewOptions, commands } from 'vscode';
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
  }

  onDidChanged() {
    this.treeView.onDidChangeSelection((e) => {
      console.log(e);
    });
  }

  registerRefreshCmd(cmd: Commands) {
    const _cmd = commands.registerCommand(cmd, () => this.provider.refresh());
    this.subscribe(_cmd);
  }
}
