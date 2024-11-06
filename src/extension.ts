// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  type DocumentSelector,
  type ExtensionContext,
  languages,
  ThemeColor,
  Uri,
  window,
  workspace,
} from 'vscode'
import { Commands, registerCommands } from './commands'
import { HexoCompletionProvider } from './hexoCompletionProvider'
import { registerTreeViews } from './treeViews'
import { SimpleServer } from '@0x-jerry/vscode-simple-server'
import { ConfigProperties, getConfig } from './configs'
import { resolveHexoUrlPath } from './hexo'

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
  )

  context.subscriptions.push(completionItemProvider)

  try {
    registerTreeViews(context)
    registerCommands(context)
  } catch (err) {
    window.showErrorMessage(String(err))
  }

  // -----------
  const fileChangedTimeMap = new Map<string, number>()

  const simple = new SimpleServer({
    autoStart: getConfig(ConfigProperties.preview).autoStart,
    env: context,
    async getStartServerCommand() {
      const port = getConfig(ConfigProperties.preview).port
      const relativeRoot = getConfig(ConfigProperties.hexoRoot)

      fileChangedTimeMap.clear()

      return {
        commandLine: `npx hexo server -p ${port}`,
        cwd: relativeRoot,
      }
    },
    async resolveUrl(uri) {
      const port = getConfig(ConfigProperties.preview).port
      const url = new URL(`http://localhost:${port}`)

      if (!uri) {
        // No need to resolve url
        return
      }

      if (!uri.fsPath.endsWith('.md')) {
        return
      }

      const workspaceFolder = workspace.getWorkspaceFolder(uri)

      if (!workspaceFolder) {
        return
      }

      const relativeRootPath = getConfig(ConfigProperties.hexoRoot)
      const hexoRootUri = Uri.joinPath(workspaceFolder.uri, relativeRootPath)

      const hexoUrlPath = await resolveHexoUrlPath(uri, hexoRootUri, {
        fileChangedTimeMap,
      })

      if (!hexoUrlPath) {
        return
      }

      url.pathname = hexoUrlPath

      return url.toString()
    },
    taskName: 'HEXO_PREVIEW',
    statusBar: {
      priority: 1000,
      started: {
        text: '$(server) Hexo',
        tooltip: 'Click to stop',
        command: Commands.stopPreview,
        color: new ThemeColor('terminalCommandDecoration.successBackground'),
      },
      stopped: {
        text: '$(server) Hexo',
        tooltip: 'Click to start',
        command: Commands.startPreview,
      },
      spinning: {
        text: '$(sync~spin) Hexo',
        tooltip: 'Starting the Hexo server',
        command: Commands.stopPreview,
      },
    },
  })

  context.subscriptions.push(commands.registerCommand(Commands.stopPreview, () => simple.stop()))
  context.subscriptions.push(commands.registerCommand(Commands.startPreview, () => simple.start()))

  context.subscriptions.push(simple)
}

export function deactivate() {}
