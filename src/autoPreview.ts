import { commands, type ExtensionContext, ViewColumn, window, workspace } from 'vscode'
import { ConfigProperties, configs, getConfig } from './configs'

export function registerAutoPreview(context: ExtensionContext) {
  let lastActiveFile: string | undefined

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return

      const autoPreview = getConfig(ConfigProperties.autoPreview)
      if (!autoPreview) return

      const tabGroups = window.tabGroups
      const activeTab = tabGroups?.activeTabGroup?.activeTab
      const isDiff =
        activeTab?.input && 'original' in (activeTab.input as any) && 'modified' in (activeTab.input as any)

      if (isDiff) {
        if (tabGroups) {
          for (const group of tabGroups.all) {
            for (const tab of group.tabs) {
              const input = tab.input as any
              if (
                input &&
                typeof input.viewType === 'string' &&
                input.viewType.includes('markdown.preview')
              ) {
                await tabGroups.close(tab)
                lastActiveFile = undefined
              }
            }
          }
        }
        return
      }

      const doc = editor.document
      if (doc.languageId !== 'markdown') return

      const filePath = doc.uri.fsPath
      if (lastActiveFile === filePath) return

      const isPost = doc.uri.toString().startsWith(configs.paths.post.toString())
      const isDraft = doc.uri.toString().startsWith(configs.paths.draft.toString())

      if (isPost || isDraft) {
        lastActiveFile = filePath

        const tabGroups = window.tabGroups
        let isPreviewOpen = false

        if (tabGroups) {
          for (const group of tabGroups.all) {
            for (const tab of group.tabs) {
              const input = tab.input as any
              if (input && typeof input.viewType === 'string' && input.viewType.includes('markdown.preview')) {
                isPreviewOpen = true
                break
              }
            }
          }
        }

        if (isPreviewOpen) return

        // 2. Ensure the article is in the first column
        if (editor.viewColumn !== ViewColumn.One) {
          await window.showTextDocument(doc, { viewColumn: ViewColumn.One, preview: false })
        }

        // 3. Open preview to the side (this will go to Column 2)
        await commands.executeCommand('markdown.showPreviewToSide')

        // 4. Move focus back to the article in Column 1
        await window.showTextDocument(doc, { viewColumn: ViewColumn.One, preserveFocus: false })
      }
    }),
    workspace.onDidCloseTextDocument((doc) => {
      if (lastActiveFile === doc.uri.fsPath) {
        lastActiveFile = undefined
      }
    }),
  )
}
