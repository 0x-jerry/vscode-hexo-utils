import {
  type Disposable,
  ShellExecution,
  Task,
  TaskRevealKind,
  TaskScope,
  ViewColumn,
  commands,
  tasks,
  window,
  workspace,
  type ExtensionContext,
  type TaskExecution,
} from 'vscode'
import { Commands } from './commands'
import { sleep } from '@0x-jerry/utils'
import path from 'node:path'
import { URL } from 'node:url'
import { ConfigProperties, getConfig } from './configs'
import { StatusBar } from './StatusBar'

const TASK_NAME = 'HEXO_PREVIEW'

const TASK_TYPE = 'Hexo'

export class PreviewPanel implements Disposable {
  _disposables: Disposable[] = []

  editorChangeListener?: Disposable

  taskExecution?: TaskExecution

  currentUrl?: string

  vpServerStarted?: boolean

  statusBar = new StatusBar()

  get isStarted() {
    return !!this.editorChangeListener
  }

  get previewConfig() {
    return getConfig(ConfigProperties.preview)
  }

  constructor(readonly env: ExtensionContext) {
    this._addDisposable(
      tasks.onDidEndTask((e) => {
        if (e.execution.task.name === TASK_NAME) {
          this.stop()
        }
      }),
    )

    if (this.previewConfig.autoStart) {
      this.start()
    }
  }

  _addDisposable(t: Disposable) {
    this._disposables.push(t)
  }

  async _openUrl(url: string) {
    const hasSimpleBrowserOpened = !!window.tabGroups.all.find((group) => {
      return group.tabs.find((t) => t.label === 'Simple Browser')
    })

    if (this.currentUrl === url && hasSimpleBrowserOpened) return

    if (this.vpServerStarted) {
      this.currentUrl = url
    }

    // https://github.com/microsoft/vscode/blob/403294d92b4fbcdad61bb74635a8e5e145151aaa/extensions/simple-browser/src/extension.ts#L58
    await commands.executeCommand('simpleBrowser.api.open', url, {
      viewColumn: ViewColumn.Beside,
      preserveFocus: true,
    })
  }

  async _startVPTask() {
    // stop all previews tasks
    // biome-ignore lint/complexity/noForEach: <explanation>
    tasks.taskExecutions
      .filter((n) => n.task.definition.type === TASK_TYPE)
      .forEach((t) => {
        t.terminate()
      })

    const hexoRoot = getConfig(ConfigProperties.hexoRoot)

    const task = new Task(
      { type: TASK_TYPE },
      TaskScope.Workspace,
      TASK_NAME,
      'vscode extension',
      new ShellExecution(`npx hexo server -p ${this.previewConfig.port}`, {
        // todo, check cwd
        cwd: hexoRoot,
      }),
    )

    task.isBackground = true
    task.presentationOptions.reveal = TaskRevealKind.Silent

    const execution = await tasks.executeTask(task)
    this.taskExecution = execution

    return execution
  }

  toggle() {
    if (this.isStarted) {
      this.stop()
    } else {
      this.start()
    }
  }

  async _navigateCurrentPage() {
    if (!window.activeTextEditor) return

    const uri = window.activeTextEditor.document.uri
    const workspaceFolder = workspace.getWorkspaceFolder(uri)

    if (!uri.fsPath.endsWith('.md')) {
      return
    }

    if (!workspaceFolder) return

    const relativeFilePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath)

    const previewConfig = getConfig(ConfigProperties.preview)

    const CONFIG = {
      host: `http://localhost:${previewConfig.port}`,
      ...previewConfig,
    }

    // todo,
    await this._openUrl(relativeFilePath)
  }

  async _detectVPServer() {
    const previewConfig = getConfig(ConfigProperties.preview)
    const url = `http://localhost:${previewConfig.port}`

    let now = Date.now()

    const maxTime = now + 15 * 1000
    while (now < maxTime) {
      try {
        await fetch(url)

        // VitePress start success
        return true
      } catch (error) {
        // failed
        // ignore
      }

      await sleep(500)
      now = Date.now()
    }

    return false
  }

  async start() {
    if (this.isStarted) return

    this.vpServerStarted = false
    this.statusBar.spinning()

    this.editorChangeListener = window.onDidChangeActiveTextEditor((e) => {
      this._navigateCurrentPage()
    })

    this.taskExecution = await this._startVPTask()

    this.vpServerStarted = await this._detectVPServer()

    this._navigateCurrentPage()
    this.statusBar.started()
  }

  stop() {
    this.editorChangeListener?.dispose()
    this.editorChangeListener = undefined

    this.taskExecution?.terminate()
    this.taskExecution = undefined

    this.currentUrl = undefined
    this.vpServerStarted = undefined
    this.statusBar.stopped()
  }

  dispose() {
    this.stop()

    this.statusBar.dispose()

    // biome-ignore lint/complexity/noForEach: <explanation>
    this._disposables.forEach((i) => i.dispose())
  }
}
