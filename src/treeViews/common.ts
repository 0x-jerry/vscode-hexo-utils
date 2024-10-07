import {
  type ExtensionContext,
  window,
  type TreeDataProvider,
  type TreeViewOptions,
  type TreeView,
  Disposable,
} from 'vscode'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const treeViews: any[] = []

export enum ViewTypes {
  post = 'hexo.post',
  draft = 'hexo.draft',
  categories = 'hexo.categories',
  tags = 'hexo.tags',
}

export class BaseDispose implements Disposable {
  private _disposable?: Disposable

  subscribe(...disposables: Disposable[]) {
    if (this._disposable) {
      this._disposable = Disposable.from(this._disposable, ...disposables)
    } else {
      this._disposable = Disposable.from(...disposables)
    }
  }

  dispose() {
    this._disposable?.dispose()
  }
}

export abstract class BaseTreeView<T> extends BaseDispose {
  treeView: TreeView<T>

  constructor(id: string, provider: TreeDataProvider<T>, opts: Partial<TreeViewOptions<T>>) {
    super()
    this.treeView = window.createTreeView(id, {
      canSelectMany: true,
      treeDataProvider: provider,
      ...opts,
    })
    this.subscribe(this.treeView)
  }
}

export function treeView(): ClassDecorator {
  return (target) => {
    treeViews.push(target)
  }
}

export function registerTreeViews(context: ExtensionContext) {
  for (const TreeViewClass of treeViews) {
    context.subscriptions.push(new TreeViewClass(context))
  }
}
