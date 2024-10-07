// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { type ExtensionContext, languages, window, workspace } from 'vscode'
import { registerCommands } from './commands'
import { HexoCompletionProvider } from './hexoCompletionProvider'
import plugin from './markdownItHexoResource'
import { getConfig, ConfigProperties } from './configs'
import { registerTreeViews } from './treeViews'
import type { MarkdownIt } from './md-it'

export function activate(context: ExtensionContext) {
  // Only activate when open with a workspace folder, close #98.
  if (!workspace.workspaceFolders?.length) {
    return
  }

  const selectors = [
    { language: 'markdown', scheme: 'file' },
    { language: 'markdown', scheme: 'untitled' },
  ]

  const completionItemProvider = languages.registerCompletionItemProvider(
    selectors,
    new HexoCompletionProvider(),
    '(',
  )

  context.subscriptions.push(completionItemProvider)

  try {
    registerTreeViews(context)
    registerCommands(context)
  } catch (err) {
    window.showErrorMessage(String(err))
  }

  return {
    extendMarkdownIt(md: MarkdownIt) {
      const resolve = getConfig<boolean>(ConfigProperties.resolveMarkdownResource)

      if (resolve) {
        return md.use(plugin)
      }

      return md
    },
  }
}

export function deactivate() {}
