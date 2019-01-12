// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, languages, workspace, TreeDataProvider, window } from 'vscode';
import { HexoArticleProvider } from './hexoArticleProvider';
import { HexoClassifyProvider, ClassifyTypes } from './hexoClassifyProvider';
import * as debounce from 'debounce';
import { ArticleTypes, registerCommands } from './commands';
import { HexoCompletionProvider } from './hexoCompletionProvider';

export function activate(context: ExtensionContext) {
  const postProvider = new HexoArticleProvider(ArticleTypes.post);
  const draftProvider = new HexoArticleProvider(ArticleTypes.draft);
  const categoryProvider = new HexoClassifyProvider(ClassifyTypes.category);
  const tagProvider = new HexoClassifyProvider(ClassifyTypes.tag);

  const selectors = [
    { language: 'markdown', scheme: 'file' },
    { language: 'markdown', scheme: 'untitled' },
  ];

  const completionItemProvider = languages.registerCompletionItemProvider(
    selectors,
    new HexoCompletionProvider(),
    '(',
  );

  context.subscriptions.push(completionItemProvider);

  const refreshProvider = debounce(() => {
    postProvider.refresh();
    draftProvider.refresh();
    categoryProvider.refresh();
    tagProvider.refresh();
  }, 20);

  const markdownFileWatcher = workspace.createFileSystemWatcher('**/*.md');
  context.subscriptions.push(markdownFileWatcher);

  markdownFileWatcher.onDidCreate(() => {
    refreshProvider();
  });

  markdownFileWatcher.onDidDelete(() => {
    refreshProvider();
  });

  interface IBindProvider {
    viewId: string;
    provider: TreeDataProvider<any>;
    showCollapseAll?: boolean;
  }

  const bindProvider: IBindProvider[] = [
    {
      viewId: 'hexo.post',
      provider: postProvider,
    },
    {
      viewId: 'hexo.draft',
      provider: draftProvider,
    },
    {
      viewId: 'hexo.categories',
      provider: categoryProvider,
      showCollapseAll: true,
    },
    {
      viewId: 'hexo.tags',
      provider: tagProvider,
      showCollapseAll: true,
    },
  ];

  bindProvider.forEach((info) => {
    const disposable = window.createTreeView(info.viewId, {
      treeDataProvider: info.provider,
      showCollapseAll: info.showCollapseAll,
    });
    context.subscriptions.push(disposable);
  });

  registerCommands(context);
}

export function deactivate() {}
