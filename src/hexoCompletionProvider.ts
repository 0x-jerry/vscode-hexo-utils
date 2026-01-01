import path from 'node:path'
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
import { configs } from './configs'
import { MetadataManager } from './metadataManager'

export class HexoCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext,
  ): Promise<CompletionItem[] | CompletionList> {
    // Filter md file
    if (!document.uri.fsPath.endsWith('.md')) {
      return []
    }

    const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character)

    // Check if in Front Matter
    const isFrontMatter = this.isInFrontMatter(document, position)
    if (isFrontMatter) {
      let key: string | undefined

      // tags: xxx, yyy
      const tagMatch = lineTextBefore.match(/^tags:\s*(.*)$/)
      if (tagMatch) {
        key = 'tags'
      }

      // categories: xxx
      const categoryMatch = lineTextBefore.match(/^categories:\s*(.*)$/)
      if (categoryMatch) {
        key = 'categories'
      }

      // - xxx (list format)
      const listMatch = lineTextBefore.match(/^\s*-\s*(.*)$/)
      if (listMatch) {
        key = this.getParentKey(document, position.line)
      }

      if (key === 'tags') {
        const tags = await MetadataManager.getInstance().getTags()
        return tags.map((tag) => {
          return new CompletionItem(tag, CompletionItemKind.Keyword)
        })
      }

      if (key === 'categories') {
        const categories = await MetadataManager.getInstance().getCategories()
        return categories.map((cat) => {
          const item = new CompletionItem(cat, CompletionItemKind.Keyword)
          const parts = cat.split(' / ')
          if (parts.length > 1) {
            item.insertText = `[${parts.join(', ')}]`
          }
          return item
        })
      }
    }

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

  private isInFrontMatter(document: TextDocument, position: Position): boolean {
    const text = document.getText()
    const lines = text.split(/\r?\n/)
    let dashCount = 0
    for (let i = 0; i <= position.line; i++) {
      if (lines[i].trim() === '---') {
        dashCount++
      }
    }
    // If we are between the first and second '---', we are in Front Matter
    // But if the current line is the second '---', we might still be considered "in" it depending on logic.
    // Usually, Front Matter starts at line 0 with '---'.
    return dashCount === 1 && lines[position.line].trim() !== '---'
  }

  private getParentKey(document: TextDocument, line: number): string | undefined {
    const currentLineText = document.lineAt(line).text
    const match = currentLineText.match(/^(\s*)-/)
    if (!match) return undefined

    const currentIndentation = match[1].length

    for (let i = line - 1; i >= 0; i--) {
      const l = document.lineAt(i)
      const text = l.text
      if (text.trim() === '---') break

      const m = text.match(/^(\s*)(\w+):/)
      if (m) {
        const indentation = m[1].length
        if (indentation <= currentIndentation) {
          return m[2]
        }
      }
    }
    return undefined
  }
}
