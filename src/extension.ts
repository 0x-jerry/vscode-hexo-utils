// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, languages, workspace, window, commands } from 'vscode';
import { registerCommands, Commands } from './commands';
import { HexoCompletionProvider } from './hexoCompletionProvider';
import * as debounce from 'debounce';
import * as MarkdownIt from 'markdown-it';
import plugin from './markdownItHexoResource';
import { getConfig, ConfigProperties } from './configs';
import { registerTreeViews } from './treeViews';

export function activate(context: ExtensionContext) {
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

  // todo register multi refresh command
  const refreshProvider = debounce(() => {
    commands.executeCommand(Commands.refreshPost);
    commands.executeCommand(Commands.refreshDraft);
    commands.executeCommand(Commands.refreshTags);
    commands.executeCommand(Commands.refreshCategories);
  }, 20);

  const markdownFileWatcher = workspace.createFileSystemWatcher('**/*.md');
  context.subscriptions.push(markdownFileWatcher);

  // Auto refresh when hexo root changed
  workspace.onDidChangeConfiguration((e) => {
    const hexoProjectConfig = ConfigProperties.SECTION + '.' + ConfigProperties.hexoRoot;

    const hexoRootChanged = e.affectsConfiguration(hexoProjectConfig);

    if (hexoRootChanged) {
      refreshProvider();
    }
  });

  markdownFileWatcher.onDidCreate(() => {
    refreshProvider();
  });

  markdownFileWatcher.onDidDelete(() => {
    refreshProvider();
  });

  markdownFileWatcher.onDidChange(() => {
    refreshProvider();
  });

  try {
    const refreshCommand = commands.registerCommand(Commands.refresh, refreshProvider);
    context.subscriptions.push(refreshCommand);

    registerTreeViews(context);
    registerCommands(context);
  } catch (err) {
    window.showErrorMessage(err);
  }

  return {
    extendMarkdownIt(md: MarkdownIt) {
      const resolve = getConfig<boolean>(ConfigProperties.resolveMarkdownResource);

      if (resolve) {
        return md.use(plugin);
      } else {
        return md;
      }
    },
  };
}

export function deactivate() {}
