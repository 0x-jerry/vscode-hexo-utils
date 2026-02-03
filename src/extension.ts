// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import debounce from 'lodash-es/debounce'
import { type DocumentSelector, type ExtensionContext, languages, window, workspace } from 'vscode'
import { registerAutoPreview } from './autoPreview'
import { registerCommands } from './commands'
import { ConfigProperties, getConfig } from './configs'
import { HexoCodeLensProvider } from './hexoCodeLensProvider'
import {
  HexoFrontMatterCompletionProvider,
  HexoImageCompletionProvider,
} from './hexoCompletionProvider'
import type { MarkdownIt } from './md-it'
import plugin from './md-it/markdownItHexoResource'
import { metadataManager } from './metadata'
import { registerTreeViews } from './treeViews'

export async function activate(context: ExtensionContext) {
  // Only activate when open with a workspace folder, close #98.
  if (!workspace.workspaceFolders?.length) {
    return
  }

  context.subscriptions.push(metadataManager)

  await metadataManager.buildCache()

  context.subscriptions.push(
    workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'markdown') {
        metadataManager.update(e.document.uri)
      }
    }),
  )

  const selectors: DocumentSelector = [{ language: 'markdown' }]

  const frontMatterCompletionProvider = languages.registerCompletionItemProvider(
    selectors,
    new HexoFrontMatterCompletionProvider(),
    ':',
    ' ',
    ',',
    '[',
    '\n',
  )

  const imageCompletionProvider = languages.registerCompletionItemProvider(
    selectors,
    new HexoImageCompletionProvider(),
    '(',
  )

  const codeLensProvider = languages.registerCodeLensProvider(selectors, new HexoCodeLensProvider())

  context.subscriptions.push(
    frontMatterCompletionProvider,
    imageCompletionProvider,
    codeLensProvider,
  )

  try {
    registerTreeViews(context)
    registerAutoPreview(context)
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
