import { Commands } from '../../commands';
import { TreeViewOptions, commands, window } from 'vscode';
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

    this.autoFocus();
  }

  private autoFocus() {
    const _dispose = window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || !this.treeView.visible) {
        return;
      }

      const file = editor.document.uri.toString();
      const item = this.provider.getItem(file);

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
