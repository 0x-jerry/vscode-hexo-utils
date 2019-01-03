// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import commands, { ArticleTypes } from './commands';
import { HexoArticleProvider } from './hexoProvider';

export enum HexoCommands {
  newPost = 'hexo.new.post',
  newDraft = 'hexo.new.draft',
  remove = 'hexo.remove',
  open = 'hexo.open',
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-hexo-utils" is now active!');

  const postProvider = new HexoArticleProvider();
  const draftProvider = new HexoArticleProvider(ArticleTypes.draft);

  vscode.window.registerTreeDataProvider('hexo.post', postProvider);
  vscode.window.registerTreeDataProvider('hexo.draft', draftProvider);

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
      callback: async () => {
        await commands.createPost();
        postProvider.refresh();
      },
    },
    {
      cmd: HexoCommands.newDraft,
      callback: async () => {
        await commands.createDraft();
        draftProvider.refresh();
      },
    },
    {
      cmd: HexoCommands.open,
      callback: commands.open,
    },
  ];

  bindCommand.forEach((info) => {
    const disposable = vscode.commands.registerCommand(info.cmd, info.callback);
    context.subscriptions.push(disposable);
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
