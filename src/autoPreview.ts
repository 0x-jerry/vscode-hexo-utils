import { commands, type ExtensionContext, type Tab, ViewColumn, window } from 'vscode'
import { ConfigProperties, configs, getConfig } from './configs'

export function registerAutoPreview(context: ExtensionContext) {
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return

      const autoPreview = getConfig(ConfigProperties.autoPreview)
      if (!autoPreview) return

      if (isActiveDiffTab()) {
        const previewTab = getMarkdownPreviewTab()

        if (previewTab) {
          window.tabGroups.close(previewTab)
        }
        return
      }

      const previewTab = getMarkdownPreviewTab()
      if (previewTab) return

      const doc = editor.document
      if (doc.languageId !== 'markdown') return

      const isPost = doc.uri.toString().startsWith(configs.paths.post.toString())
      const isDraft = doc.uri.toString().startsWith(configs.paths.draft.toString())

      if (isPost || isDraft) {
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
  )
}
function isActiveDiffTab() {
  const tabGroups = window.tabGroups
  const activeTab = tabGroups.activeTabGroup.activeTab
  const isDiff =
    activeTab?.input &&
    typeof activeTab.input === 'object' &&
    'original' in activeTab.input &&
    'modified' in activeTab.input

  return isDiff
}

function isMarkdownPreviewTab(tab: Tab) {
  const input = tab.input
  return (
    input &&
    typeof input === 'object' &&
    'viewType' in input &&
    typeof input.viewType === 'string' &&
    input.viewType.includes('markdown.preview')
  )
}

function getMarkdownPreviewTab() {
  for (const group of window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (isMarkdownPreviewTab(tab)) {
        return tab
      }
    }
  }
}
