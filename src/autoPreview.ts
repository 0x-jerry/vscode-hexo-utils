import {
  window,
  workspace,
  commands,
  ViewColumn,
  type ExtensionContext,
} from 'vscode'
import { getConfig, ConfigProperties, configs } from './configs'

export function registerAutoPreview(context: ExtensionContext) {
  let lastActiveFile: string | undefined

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return

      const doc = editor.document
      if (doc.languageId !== 'markdown') return

      const autoPreview = getConfig(ConfigProperties.autoPreview)
      if (!autoPreview) return

      const filePath = doc.uri.fsPath
      if (lastActiveFile === filePath) return

      const isPost = doc.uri.toString().startsWith(configs.paths.post.toString())
      const isDraft = doc.uri.toString().startsWith(configs.paths.draft.toString())

      if (isPost || isDraft) {
        lastActiveFile = filePath

        // 1. Close all existing markdown previews to keep only one preview column
        const tabGroups = window.tabGroups
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
              }
            }
          }
        }

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

      const autoPreview = getConfig(ConfigProperties.autoPreview)
      if (!autoPreview) return

      const isPost = doc.uri.toString().startsWith(configs.paths.post.toString())
      const isDraft = doc.uri.toString().startsWith(configs.paths.draft.toString())

      if (isPost || isDraft) {
        const tabGroups = window.tabGroups
        if (tabGroups) {
          for (const group of tabGroups.all) {
            for (const tab of group.tabs) {
              const input = tab.input as any
              if (input && typeof input.viewType === 'string' && input.viewType.includes('markdown.preview')) {
                // Try to match URI in any property of the input object
                const isMatch = Object.values(input).some(
                  (val: any) =>
                    val?.toString?.() === doc.uri.toString() ||
                    (val?.fsPath && val.fsPath === doc.uri.fsPath),
                )

                if (isMatch) {
                  tabGroups.close(tab)
                }
              }
            }
          }
        }
      }
    }),
  )
}
