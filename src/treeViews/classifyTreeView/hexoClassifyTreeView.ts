import { Commands } from '../../commands';
import { TreeViewOptions, commands } from 'vscode';
import { BaseTreeView, ViewTypes } from '../common';
import { ClassifyItem, HexoClassifyProvider, ClassifyTypes } from './hexoClassifyProvider';

export class ClassifyTreeView extends BaseTreeView<ClassifyItem> {
  provider: HexoClassifyProvider;

  constructor(
    viewId: ViewTypes,
    type: ClassifyTypes,
    opts: Partial<TreeViewOptions<ClassifyItem>> = {},
  ) {
    const provider = new HexoClassifyProvider(type);
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
