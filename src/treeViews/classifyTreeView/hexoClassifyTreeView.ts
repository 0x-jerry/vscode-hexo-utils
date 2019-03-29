import { Commands } from '../../commands';
import { TreeViewOptions, ExtensionContext, commands } from 'vscode';
import { BaseTreeView } from '../common';
import { ClassifyItem, HexoClassifyProvider, ClassifyTypes } from './hexoClassifyProvider';

export class ClassifyTreeView extends BaseTreeView<ClassifyItem> {
  ctx: ExtensionContext;
  provider: HexoClassifyProvider;

  constructor(
    ctx: ExtensionContext,
    viewId: string,
    type: ClassifyTypes,
    opts: Partial<TreeViewOptions<ClassifyItem>> = {},
  ) {
    const provider = new HexoClassifyProvider(type);
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
