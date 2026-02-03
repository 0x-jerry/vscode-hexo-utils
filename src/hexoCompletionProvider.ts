import path from 'node:path'
import { isEqual, uniq, uniqWith } from 'lodash-es'
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
import { HexoMetadataKeys, isInFrontmatterRange, metadataManager } from './metadata'

const builtinFrontmatterKeys = [
  'layout',
  'title',
  'date',
  'updated',
  'comments',
  'tags',
  'categories',
  'permalink',
  'excerpt',
  'disableNunjucks',
  'lang',
  'published',
]

const YAML_KEY_RE = /^(\s*)([\w-]+)\s*:/
const YAML_LIST_ITEM_RE = /^(\s*)-/

export class HexoFrontMatterCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position,
    _token: CancellationToken,
    _context: CompletionContext,
  ): Promise<CompletionItem[] | CompletionList> {
    const data = await metadataManager.get(document.uri)
    const range = data.range

    if (!range) {
      return []
    }

    // Check if in Front Matter
    if (!isInFrontmatterRange(range, position.line)) {
      return []
    }

    const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character)

    let key: undefined | string

    // - xxx (list format)
    const isListItem = lineTextBefore.match(YAML_LIST_ITEM_RE)

    if (isListItem) {
      key = this._getParentKey(document, position.line)
    } else {
      key = lineTextBefore.match(YAML_KEY_RE)?.at(2)
    }

    if (!key) {
      // Key completion
      const keyMatch = lineTextBefore.match(/^(\s*)([\w-]*)$/)
      if (keyMatch) {
        const allKeys = metadataManager.allFrontmatterKeys
        const documentKeys = Object.keys((await metadataManager.get(document.uri)).data)

        const candidates = Array.from(new Set([...builtinFrontmatterKeys, ...allKeys])).filter(
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

    const values = await metadataManager.getAvailableValuesByKey(key, [document.uri])

    return this._buildCompletionItems(key, values)
  }

  _buildCompletionItems(key: string, values: unknown[]): CompletionItem[] {
    if (key === HexoMetadataKeys.tags) {
      return uniq(values.flat()).map(
        (tag) => new CompletionItem(String(tag), CompletionItemKind.Keyword),
      )
    }

    if (key === HexoMetadataKeys.categories) {
      const _value = values as string[][][]

      return uniqWith(_value.flat(), isEqual).map((category) => {
        const name = category.length === 1 ? category[0] : buildArrayValue(category)

        return new CompletionItem(String(name), CompletionItemKind.Keyword)
      })
    }

    const normalizedValue = values.map((val) =>
      Array.isArray(val) ? buildArrayValue(val) : String(val),
    )

    return uniq(normalizedValue).map(
      (label) => new CompletionItem(label, CompletionItemKind.Keyword),
    )

    function buildArrayValue(value: unknown[]) {
      return `[${value.join(', ')}]`
    }
  }

  _getParentKey(document: TextDocument, line: number): string | undefined {
    const currentLineText = document.lineAt(line).text
    const match = currentLineText.match(YAML_LIST_ITEM_RE)
    if (!match) return undefined

    const currentIndentation = match[1].length

    for (let i = line - 1; i >= 0; i--) {
      const l = document.lineAt(i)
      const text = l.text
      if (text.trim() === '---') break

      const m = text.match(YAML_KEY_RE)
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
    _token: CancellationToken,
    _context: CompletionContext,
  ): Promise<CompletionItem[] | CompletionList> {
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

    const resourceFilePattern = `source/_posts/${fileDir}/**/*.{png,jpg,jpeg,svg,gif}`

    const uris = await workspace.findFiles(resourceFilePattern, '**/node_modules/**')

    return uris.map((imgUri) => {
      const relPath = path.relative(document.uri.fsPath, imgUri.fsPath)

      const resourceDir = path.join(configs.paths.post.fsPath, fileDir)

      const itemLabel = imgUri.fsPath.slice(resourceDir.length + 1).replace('\\', '/')

      const item = new CompletionItem(itemLabel, CompletionItemKind.File)

      item.documentation = new MarkdownString(`![${relPath}](${imgUri.fsPath.replace(/\\/g, '/')})`)
      return item
    })
  }
}
