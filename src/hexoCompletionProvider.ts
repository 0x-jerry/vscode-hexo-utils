import path from 'node:path'
import {
  type CancellationToken,
  type CompletionContext,
  CompletionItem,
  CompletionItemKind,
  type CompletionItemProvider,
  type CompletionList,
  MarkdownString,
  type Position,
  type TextDocument,
  workspace,
} from 'vscode'
import { configs } from './configs'
import { HexoMetadataKeys, HexoMetadataUtils } from './hexoMetadata'
import { isInFrontMatter, frontMatterKeys, getMDFileMetadata } from './utils'


export class HexoFrontMatterCompletionProvider implements CompletionItemProvider {
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
    const isFrontMatter = isInFrontMatter(document, position)
    if (!isFrontMatter) {
      return []
    }

    let key: string | undefined

    // tags: xxx, yyy
    const tagMatch = lineTextBefore.match(new RegExp(`^\\s*${HexoMetadataKeys.tags}:\\s*(.*)$`))
    if (tagMatch) {
      key = HexoMetadataKeys.tags
    }

    // categories: xxx
    const categoryMatch = lineTextBefore.match(
      new RegExp(`^\\s*${HexoMetadataKeys.categories}:\\s*(.*)$`),
    )
    if (categoryMatch) {
      key = HexoMetadataKeys.categories
    }

    // - xxx (list format)
    const listMatch = lineTextBefore.match(/^\s*-\s*(.*)$/)
    if (listMatch) {
      key = this.getParentKey(document, position.line)
    }

    if (key === HexoMetadataKeys.tags) {
      return this.completeByMetaKey(HexoMetadataKeys.tags, await HexoMetadataUtils.getTags())
    }

    if (key === HexoMetadataKeys.categories) {
      return this.completeByMetaKey(
        HexoMetadataKeys.categories,
        await HexoMetadataUtils.getCategories(),
      )
    }

    // Key completion
    const keyMatch = lineTextBefore.match(/^(\s*)([\w-]*)$/)
    if (keyMatch) {
      const allKeys = await HexoMetadataUtils.getAllKeys()
      const documentKeys = (await getMDFileMetadata(document.uri)).keys

      const candidates = Array.from(new Set([...frontMatterKeys, ...allKeys])).filter(
        (k) => !documentKeys.includes(k),
      )

      return candidates.map((k) => {
        const item = new CompletionItem(k, CompletionItemKind.Property)
        item.insertText = `${k}: `
        return item
      })
    }

    return []
  }

  private completeByMetaKey(key: string, values: string[]): CompletionItem[] {
    return values.map((val) => {
      const item = new CompletionItem(val, CompletionItemKind.Keyword)
      if (val && key === HexoMetadataKeys.categories) {
        const parts = val.split(' / ')
        if (parts.length > 1) {
          item.insertText = `[${parts.join(', ')}]`
        }
      }
      return item
    })
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

      const m = text.match(/^(\s*)([\w-]+)\s*:/)
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

export class HexoImageCompletionProvider implements CompletionItemProvider {
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

    // ![xxx]()
    const matches = lineTextBefore.match(/!\[[^\]]*?\]\(([^)]*?)[\\/]?[^\\/)]*$/)

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
