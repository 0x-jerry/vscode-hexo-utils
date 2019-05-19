import {
  ExtensionContext,
  window,
  TreeDataProvider,
  TreeViewOptions,
  TreeView,
  Disposable,
} from 'vscode';

const treeViews: any[] = [];

export enum ViewTypes {
  post = 'hexo.post',
  draft = 'hexo.draft',
  categories = 'hexo.categories',
  tags = 'hexo.tags',
}

export abstract class BaseTreeView<T> implements Disposable {
  private _disposable: Disposable;

  treeView: TreeView<T>;

  constructor(id: string, provider: TreeDataProvider<T>, opts: Partial<TreeViewOptions<T>>) {
    this.treeView = window.createTreeView(id, {
      treeDataProvider: provider,
      ...opts,
    });

    this._disposable = Disposable.from(this.treeView);
  }

  subscribe(...disposables: Disposable[]) {
    this._disposable = Disposable.from(this._disposable, ...disposables);
  }

  dispose() {
    this._disposable.dispose();
  }
}

export function treeView(): ClassDecorator {
  return (target: any) => {
    treeViews.push(target);
  };
}

export function registerTreeViews(context: ExtensionContext) {
  for (const TreeViewClass of treeViews) {
    context.subscriptions.push(new TreeViewClass(context));
  }
}
