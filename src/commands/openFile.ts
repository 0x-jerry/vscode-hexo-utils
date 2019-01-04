import { window, workspace, Uri } from 'vscode';
import { Command, ICommandParsed, command, Commands } from './common';

@command()
export class OpenFile extends Command {
  constructor() {
    super(Commands.open);
  }

  async execute(cmd: ICommandParsed, uri: Uri): Promise<any> {
    const doc = await workspace.openTextDocument(uri);
    await window.showTextDocument(doc);
  }
}
