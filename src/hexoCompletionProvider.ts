import path from 'path'
import {
  type CompletionItemProvider,
  type TextDocument,
  type CancellationToken,
  type Position,
  type CompletionContext,
  CompletionItem,
  type CompletionList,
  MarkdownString,
  workspace,
  CompletionItemKind,
} from 'vscode'
import { isHexoProject } from './utils'
import { configs } from './configs'

export class HexoCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext,
  ): Promise<CompletionItem[] | CompletionList> {
    // Filter md file
    if (!document.uri.fsPath.endsWith('.md') || !(await isHexoProject())) {
      return []
    }

    const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character)

    // ![xxx]()
    const matches = lineTextBefore.match(/!\[[^\]]*?\]\(([^\)]*?)[\\\/]?[^\\\/\)]*$/)

    if (!(matches && matches[1] !== undefined)) {
      return []
    }

    const filePath = document.uri.fsPath
    const isDraft = filePath.includes('_drafts')
    const fileDir = path
      .relative(isDraft ? configs.paths.draft.fsPath : configs.paths.post.fsPath, filePath)
      .replace(/\.md$/, '')

    const resFolder = `source/_posts/${fileDir}/**/*.{png,jpg,jpeg,svg,gif}`

    return workspace.findFiles(resFolder, '**/node_modules/**').then((uris) => {
      return uris.map((imgUri) => {
        const relPath = path.relative(document.uri.fsPath, imgUri.fsPath)

        const resourceDir = path.join(configs.paths.post.fsPath, fileDir)

        const itemLabel = imgUri.fsPath.substr(resourceDir.length + 1).replace('\\', '/')

        const item = new CompletionItem(itemLabel, CompletionItemKind.File)

        item.documentation = new MarkdownString(
          `![${relPath}](${imgUri.fsPath.replace(/\\/g, '/')})`,
        )
        return item
      })
    })
  }
}
