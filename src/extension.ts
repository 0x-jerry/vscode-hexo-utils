// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  type DocumentSelector,
  type ExtensionContext,
  languages,
  ThemeColor,
  window,
  workspace,
} from 'vscode'
import { Commands, registerCommands } from './commands'
import { HexoCompletionProvider } from './hexoCompletionProvider'
import { registerTreeViews } from './treeViews'
import { SimpleServer } from '@0x-jerry/vscode-simple-server'
import { ConfigProperties, getConfig } from './configs'

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

  const simple = new SimpleServer({
    autoStart: getConfig(ConfigProperties.preview).autoStart,
    env: context,
    async getStartServerCommand() {
      const port = getConfig(ConfigProperties.preview).port
      const relativeRoot = getConfig(ConfigProperties.hexoRoot)

      return {
        commandLine: `npx hexo server -p ${port}`,
        cwd: relativeRoot,
      }
    },
    async resolveUrl(uri) {
      const port = getConfig(ConfigProperties.preview).port
      const url = new URL(`http://localhost:${port}`)

      if (!uri) {
        return url.toString()
      }

      if (!uri.fsPath.endsWith('.md')) {
        return
      }

      const workspaceFolder = workspace.getWorkspaceFolder(uri)

      if (!workspaceFolder) {
        return
      }

      // todo, resolve url
      // const relativeFilePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath)
      // url.pathname = pathname + (pathname === CONFIG.base ? '/' : '')

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
