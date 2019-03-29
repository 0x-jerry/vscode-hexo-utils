// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, languages, window } from 'vscode';
import { registerCommands } from './commands';
import { HexoCompletionProvider } from './hexoCompletionProvider';
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

  try {
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
