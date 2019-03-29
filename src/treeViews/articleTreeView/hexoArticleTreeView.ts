import { HexoArticleProvider, ArticleItem } from './hexoArticleProvider';
import { ArticleTypes, Commands } from '../../commands';
import { TreeViewOptions, ExtensionContext, commands } from 'vscode';
import { BaseTreeView } from '../common';

export class ArticleTreeView extends BaseTreeView<ArticleItem> {
  ctx: ExtensionContext;
  provider: HexoArticleProvider;

  constructor(
    ctx: ExtensionContext,
    viewId: string,
    type: ArticleTypes,
    opts: Partial<TreeViewOptions<ArticleItem>> = {},
  ) {
    const provider = new HexoArticleProvider(type);
    super(viewId, provider, opts);

    this.ctx = ctx;
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
    this.ctx.subscriptions.push(_cmd);
  }
}
