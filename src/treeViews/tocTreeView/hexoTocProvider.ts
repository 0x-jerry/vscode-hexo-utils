import {
  type CancellationToken,
  type DataTransfer,
  DataTransferItem,
  EventEmitter,
  type ProviderResult,
  type TreeDataProvider,
  type TreeDragAndDropController,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace,
  Range,
  Position,
  commands,
  type DocumentSymbol,
  type TextDocument,
  EndOfLine,
} from 'vscode'
import debounce from 'debounce'
import { BaseDispose } from '../common'
import { ConfigProperties, getConfig } from '../../configs'

export class TocItem extends TreeItem {
  public readonly parent?: TocItem

  constructor(
    public readonly rawLabel: string,
    public readonly displayLabel: string, // includes numbering if enabled
    public readonly level: number,
    public readonly lineStart: number, // 0-indexed
    public lineEnd: number,             // 0-indexed (inclusive)
    public readonly children: TocItem[] = [],
    parent?: TocItem,
  ) {
    super(
      displayLabel,
      TreeItemCollapsibleState.Collapsed, // Will be updated after children are populated
    )
    this.contextValue = 'tocItem'
    this.command = {
      command: 'hexo.toc.reveal',
      title: 'Reveal',
      arguments: [{ lineStart: this.lineStart }],
    }
    this.parent = parent
    // Use defineProperty to make parent non-enumerable to avoid circular structure error during JSON.stringify
    Object.defineProperty(this, 'parent', {
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
}

export class HexoTocProvider
  extends BaseDispose
  implements TreeDataProvider<TocItem>, TreeDragAndDropController<TocItem>
{
  private _onDidChangeTreeData = new EventEmitter<TocItem | undefined | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private toc: TocItem[] = []

  private debouncedRefresh = debounce(() => this.refresh(), 300)

  constructor() {
    super()
    this.subscribe(
      window.onDidChangeActiveTextEditor(() => this.refresh()),
      workspace.onDidChangeTextDocument((e) => {
        if (e.document === window.activeTextEditor?.document) {
          this.debouncedRefresh()
        }
      }),
      workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('hexo.toc.enableNumbering')) {
          this.refresh()
        }
      })
    )
    this.refresh()
  }

  async refresh() {
    await this.parseToc()
    this._onDidChangeTreeData.fire(undefined)
  }

  private async parseToc() {
    const editor = window.activeTextEditor
    if (!editor || editor.document.languageId !== 'markdown') {
      this.toc = []
      return
    }

    const symbols = await commands.executeCommand<DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      editor.document.uri,
    )

    if (!symbols) {
      this.toc = []
      return
    }

    const enableNumbering = getConfig(ConfigProperties.enableTocNumbering)

    const convert = (symbol: DocumentSymbol, index: number, parentIndices: number[], parent?: TocItem): TocItem => {
      const currentIndices = [...parentIndices, index + 1]
      // Remove all leading # and the following space
      const rawTitle = symbol.name.replace(/^#+\s*/, '').trim()
      let displayTitle = rawTitle

      if (enableNumbering) {
        const numbering = currentIndices.join('.')
        const suffix = currentIndices.length === 1 ? '.' : ''
        displayTitle = `${numbering}${suffix} ${rawTitle}`
      }

      const item = new TocItem(
        rawTitle,
        displayTitle,
        parentIndices.length + 1, // level
        symbol.selectionRange.start.line,
        symbol.range.end.line,
        [],
        parent
      )

      if (symbol.children && symbol.children.length > 0) {
        // Filter children to only sub-headings if possible, but for Markdown it's usually just headings.
        // We look for symbols that occupy some space and are likely headings.
        const childHeadings = symbol.children.filter((s) => s.name.trim().length > 0)
        item.children.push(
          ...childHeadings.map((child, idx) => convert(child, idx, currentIndices, item))
        )
      }

      // NOTE: wait Extension API to expose 'hideTwistiesOfChildlessElements' option
      // indent may be different for childless elements
      item.collapsibleState = item.children.length > 0
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None

      return item
    }

    // Filter top-level symbols. For Markdown, they should be headings.
    const rootHeadings = symbols.filter((s) => s.name.trim().length > 0)
    this.toc = rootHeadings.map((symbol, idx) => convert(symbol, idx, []))
  }

  getTreeItem(element: TocItem): TreeItem {
    return element
  }

  getChildren(element?: TocItem): ProviderResult<TocItem[]> {
    return element ? element.children : this.toc
  }

  getParent(element: TocItem): ProviderResult<TocItem> {
    return element.parent
  }

  // Drag and Drop implementation
  dropMimeTypes = ['application/vnd.code.tree.hexotoc']
  dragMimeTypes = ['application/vnd.code.tree.hexotoc']

  handleDrag(source: TocItem[], dataTransfer: DataTransfer, _token: CancellationToken): void {
    dataTransfer.set('application/vnd.code.tree.hexotoc', new DataTransferItem(source))
  }

  async handleDrop(target: TocItem | undefined, dataTransfer: DataTransfer, _token: CancellationToken) {
    const transferItem = dataTransfer.get('application/vnd.code.tree.hexotoc')
    if (!transferItem) return

    const sources: TocItem[] = transferItem.value
    if (!sources || sources.length === 0) return

    const editor = window.activeTextEditor
    if (!editor) return

    const source = sources[0]
    if (source === target) return
    if (target && this.isDescendant(source, target)) return

    const document = editor.document

    // Calculate level delta
    // By using target.level instead of target.level + 1, we make the source a sibling
    // of the target, which effectively allows "dropping between" items.
    const targetLevel = target ? target.level : 1
    const levelDelta = targetLevel - source.level

    let adjustedText = this.adjustHeadingLevels(source, document, levelDelta)
    await editor.edit((editBuilder) => {
      // 1. Delete source (including trailing newline if possible)
      const deleteRange = new Range(source.lineStart, 0, source.lineEnd + 1, 0)
      editBuilder.delete(deleteRange)

      // 2. Insert at target
      // Add trailing newline if necessary
      const eol = (document.eol === EndOfLine.LF) ? '\n' : '\r\n'
      if (!adjustedText.endsWith(eol)) {
        adjustedText += eol
      }
      const pos = target ? new Position(target.lineEnd + 1, 0) : new Position(document.lineCount, 0)
      const lastLineText = document.getText(document.lineAt(pos.line-1).rangeIncludingLineBreak)
      if (!lastLineText.endsWith(eol)) {
        adjustedText = eol + adjustedText
      }
      editBuilder.insert(pos, adjustedText)
    })
  }

  private adjustHeadingLevels(source: TocItem, document: TextDocument, levelDelta: number): string {
    const headingLines = new Set<number>()
    const collectLines = (item: TocItem) => {
      headingLines.add(item.lineStart)
      item.children.forEach(collectLines)
    }
    collectLines(source)

    let result = ''
    for (let i = source.lineStart; i <= source.lineEnd; i++) {
      const line = document.lineAt(i)
      let text = document.getText(line.rangeIncludingLineBreak);

      if (headingLines.has(i)) {
        text = text.replace(/^(#+)/, (match: string) => {
          let newLevel = match.length + levelDelta
          newLevel = Math.max(1, Math.min(6, newLevel))
          return '#'.repeat(newLevel)
        })
      }

      result += text
    }
    return result
  }

  private isDescendant(parent: TocItem, child: TocItem): boolean {
    let curr: TocItem | undefined = child.parent
    while (curr) {
      if (curr === parent) return true
      curr = curr.parent
    }
    return false
  }
}
