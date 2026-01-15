import debounce from 'debounce'
import { commands, workspace } from 'vscode'
import { ConfigProperties, ConfigSection } from '../configs'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class RefreshSidebar extends Command {
  constructor() {
    super(Commands.refresh)

    this.refreshAll = debounce(this.refreshAll, 500)

    this.watchFiles()
    this.watchTextDocuments()
    this.configChanged()
  }

  async execute(cmd: ICommandParsed, ...arg: unknown[]): Promise<void> {
    this.refreshAll()
  }

  refreshAll() {
    commands.executeCommand(Commands.refreshPost)
    commands.executeCommand(Commands.refreshDraft)
    commands.executeCommand(Commands.refreshCategories)
    commands.executeCommand(Commands.refreshTags)
  }

  watchTextDocuments() {
    const listener = workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'markdown') {
        this.refreshAll()
      }
    })
    this.subscribe(listener)
  }

  configChanged() {
    // Auto refresh when config changed
    workspace.onDidChangeConfiguration((e) => {
      const hexoProjectConfig = `${ConfigSection}.${ConfigProperties.hexoRoot}`
      const sortMethodConfig = `${ConfigSection}.${ConfigProperties.sortMethod}`

      const hexoRootChanged = e.affectsConfiguration(hexoProjectConfig)
      const sortMethod = e.affectsConfiguration(sortMethodConfig)

      if (hexoRootChanged || sortMethod) {
        this.refreshAll()
      }
    })
  }

  watchFiles() {
    const watcher = workspace.createFileSystemWatcher('**/*.md')

    watcher.onDidCreate(() => {
      this.refreshAll()
    })

    watcher.onDidDelete(() => {
      this.refreshAll()
    })

    watcher.onDidChange(() => {
      this.refreshAll()
    })

    this.subscribe(watcher)
  }
}
