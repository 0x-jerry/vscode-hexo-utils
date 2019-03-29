import { ExtensionContext, window, TreeDataProvider, TreeViewOptions, TreeView } from 'vscode';

const treeViews: any[] = [];

export abstract class BaseTreeView<T> {
  treeView: TreeView<T>;

  constructor(id: string, provider: TreeDataProvider<T>, opts: Partial<TreeViewOptions<T>>) {
    console.log(id, provider, opts);

    this.treeView = window.createTreeView(id, {
      treeDataProvider: provider,
      ...opts,
    });
  }
}

export function treeView(): ClassDecorator {
  return (target: any) => {
    treeViews.push(target);
  };
}

export function registerTreeViews(context: ExtensionContext) {
  for (const TreeViewClass of treeViews) {
    const tv: BaseTreeView<any> = new TreeViewClass(context);

    context.subscriptions.push(tv.treeView);
  }
}
