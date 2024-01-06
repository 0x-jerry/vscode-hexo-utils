import { command, Command, type ICommandParsed, Commands } from './common';
import { commands, workspace } from 'vscode';
import debounce from 'debounce';
import { ConfigProperties } from '../configs';

@command()
export class RefreshSidebar extends Command {
  constructor() {
    super(Commands.refresh);

    this.refreshAll = debounce(this.refreshAll, 20);

    this.watchFiles();
    this.configChanged();
  }

  async execute(cmd: ICommandParsed, ...arg: any[]): Promise<any> {
    this.refreshAll();
  }

  refreshAll() {
    commands.executeCommand(Commands.refreshPost);
    commands.executeCommand(Commands.refreshDraft);
    commands.executeCommand(Commands.refreshCategories);
    commands.executeCommand(Commands.refreshTags);
  }

  configChanged() {
    // Auto refresh when config changed
    workspace.onDidChangeConfiguration((e) => {
      const hexoProjectConfig = ConfigProperties.SECTION + '.' + ConfigProperties.hexoRoot;
      const sortMethodConfig = ConfigProperties.SECTION + '.' + ConfigProperties.sortMethod;

      const hexoRootChanged = e.affectsConfiguration(hexoProjectConfig);
      const sortMethod = e.affectsConfiguration(sortMethodConfig);

      if (hexoRootChanged || sortMethod) {
        this.refreshAll();
      }
    });
  }

  watchFiles() {
    const watcher = workspace.createFileSystemWatcher('**/*.md');

    watcher.onDidCreate(() => {
      this.refreshAll();
    });

    watcher.onDidDelete(() => {
      this.refreshAll();
    });

    watcher.onDidChange(() => {
      this.refreshAll();
    });

    this.subscribe(watcher);
  }
}
