// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import commands, { ArticleTypes } from './commands';
import { HexoArticleProvider } from './hexoProvider';
import { HexoClassifyProvider, ClassifyTypes } from './hexoClassifyProvider';
import * as debounce from 'debounce';

export enum HexoCommands {
  new = 'hexo.new',
  rename = 'hexo.rename',
  newPost = 'hexo.new.post',
  newDraft = 'hexo.new.draft',
  moveToDraft = 'hexo.move.to.draft',
  moveToPost = 'hexo.move.to.post',
  open = 'hexo.open',
  delete = 'hexo.delete',
  refresh = 'hexo.refresh',
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-hexo-utils" is now active!');

  const postProvider = new HexoArticleProvider(ArticleTypes.post);
  const draftProvider = new HexoArticleProvider(ArticleTypes.draft);
  const categoryProvider = new HexoClassifyProvider(ClassifyTypes.category);
  const tagProvider = new HexoClassifyProvider(ClassifyTypes.tag);

  const markdownFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.md');

  const refreshProvider = debounce(() => {
    postProvider.refresh();
    draftProvider.refresh();
    categoryProvider.refresh();
    tagProvider.refresh();
  }, 20);

  markdownFileWatcher.onDidCreate(() => {
    refreshProvider();
  });

  markdownFileWatcher.onDidDelete(() => {
    refreshProvider();
  });

  vscode.window.registerTreeDataProvider('hexo.post', postProvider);
  vscode.window.registerTreeDataProvider('hexo.draft', draftProvider);
  vscode.window.registerTreeDataProvider('hexo.categories', categoryProvider);
  vscode.window.registerTreeDataProvider('hexo.tags', tagProvider);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  interface IBindCommand {
    cmd: string;
    callback: (...arg: any) => any;
  }

  const bindCommand: IBindCommand[] = [
    {
      cmd: HexoCommands.newPost,
      callback: commands.createPost,
    },
    {
      cmd: HexoCommands.newDraft,
      callback: commands.createDraft,
    },
    {
      cmd: HexoCommands.open,
      callback: commands.open,
    },
    {
      cmd: HexoCommands.moveToDraft,
      callback: commands.moveToDraft,
    },
    {
      cmd: HexoCommands.moveToPost,
      callback: commands.moveToPost,
    },
    {
      cmd: HexoCommands.delete,
      callback: commands.deleteFile,
    },
    {
      cmd: HexoCommands.refresh,
      callback: refreshProvider,
    },
    {
      cmd: HexoCommands.new,
      callback: commands.createWithScaffolds,
    },
    {
      cmd: HexoCommands.rename,
      callback: commands.rename,
    },
  ];

  bindCommand.forEach((info) => {
    const disposable = vscode.commands.registerCommand(info.cmd, info.callback);
    context.subscriptions.push(disposable);
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
