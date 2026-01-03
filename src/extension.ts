// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { type DocumentSelector, type ExtensionContext, languages, window, workspace } from 'vscode'
import { registerAutoPreview } from './autoPreview'
import { registerCommands } from './commands'
import { ConfigProperties, getConfig } from './configs'
import { HexoCodeLensProvider } from './hexoCodeLensProvider'
import { HexoCompletionProvider } from './hexoCompletionProvider'
import plugin from './markdownItHexoResource'
import type { MarkdownIt } from './md-it'
import { registerTreeViews } from './treeViews'

export function activate(context: ExtensionContext) {
  // Only activate when open with a workspace folder, close #98.
  if (!workspace.workspaceFolders?.length) {
    return
  }

  const selectors: DocumentSelector = [{ language: 'markdown' }]

  const completionItemProvider = languages.registerCompletionItemProvider(
    selectors,
    new HexoCompletionProvider(),
    '(',
    ':',
    ' ',
    ',',
    '[',
  )

  const codeLensProvider = languages.registerCodeLensProvider(selectors, new HexoCodeLensProvider())

  context.subscriptions.push(completionItemProvider, codeLensProvider)

  registerAutoPreview(context)

  try {
    registerTreeViews(context)
    registerCommands(context)
  } catch (err) {
    window.showErrorMessage(String(err))
  }

  return {
    extendMarkdownIt(md: MarkdownIt) {
      const resolve = getConfig(ConfigProperties.resolveMarkdownResource)

      if (resolve) {
        return md.use(plugin)
      }

      return md
    },
  }
}

export function deactivate() {}
