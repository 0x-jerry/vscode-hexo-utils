import { Uri, commands, window, workspace } from 'vscode';
import { Command, ICommandParsed, command, Commands } from './common';

@command()
export class OpenFile extends Command {
  lastClickTime: number = 0;
  lastSelectPath: string = '';

  constructor() {
    super(Commands.open);
  }

  async execute(cmd: ICommandParsed, uri: Uri): Promise<any> {
    if (this.checkDoubleClick(uri)) {
      const doc = await workspace.openTextDocument(uri);
      await window.showTextDocument(doc, {
        preserveFocus: true,
        preview: false,
      });
    } else {
      await commands.executeCommand('vscode.open', uri);
    }
  }

  checkDoubleClick(uri: Uri) {
    const now = new Date().getTime();
    const currentPath = uri.toString();
    const gap = 500;

    const isDbClick = now - this.lastClickTime <= gap;
    const isTheSameFile = currentPath === this.lastSelectPath;

    this.lastSelectPath = currentPath
    this.lastClickTime = now;

    return isDbClick && isTheSameFile;
  }
}
