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

const MIME_TYPE = 'application/vnd.code.tree.hexotoc'

export class TocItem extends TreeItem {
  constructor(
    public readonly displayLabel: string, // includes numbering if enabled
    public readonly symbol: DocumentSymbol,
    public readonly level: number,
    public readonly children: TocItem[] = [],
  ) {
    super(
      displayLabel,
      TreeItemCollapsibleState.Collapsed, // Will be updated after children are populated
    )
    this.command = {
      command: 'hexo.toc.reveal',
      title: 'Reveal',
      arguments: [this.symbol.selectionRange],
    }
  }

  static from(
    symbol: DocumentSymbol,
    index: number,
    parentIndices: number[],
    enableNumbering: boolean,
  ): TocItem {
    const currentIndices = [...parentIndices, index + 1]
    const rawTitle = symbol.name.replace(/^#+\s*/, '').trim()
    let displayTitle = rawTitle

    if (enableNumbering) {
      const numbering = currentIndices.join('.')
      const suffix = currentIndices.length === 1 ? '.' : ''
      displayTitle = `${numbering}${suffix} ${rawTitle}`
    }

    const item = new TocItem(displayTitle, symbol, parentIndices.length + 1)

    if (symbol.children && symbol.children.length > 0) {
      const childHeadings = symbol.children.filter((s) => s.name.trim().length > 0)
      item.children.push(
        ...childHeadings.map((child, idx) => TocItem.from(child, idx, currentIndices, enableNumbering)),
      )
    }

    item.collapsibleState =
      item.children.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None

    return item
  }

  get lineStart() {
    return this.symbol.selectionRange.start.line
  }

  get lineEnd() {
    return this.symbol.range.end.line
  }

  get rawLabel() {
    return this.symbol.name.replace(/^#+\s*/, '').trim()
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

    // Filter top-level symbols. For Markdown, they should be headings.
    const rootHeadings = symbols.filter((s) => s.name.trim().length > 0)
    this.toc = rootHeadings.map((symbol, idx) => TocItem.from(symbol, idx, [], enableNumbering))
  }

  getTreeItem(element: TocItem): TreeItem {
    return element
  }

  getChildren(element?: TocItem): ProviderResult<TocItem[]> {
    return element?.children ?? this.toc
  }


  // Drag and Drop implementation
  dropMimeTypes = [MIME_TYPE]
  dragMimeTypes = [MIME_TYPE]

  handleDrag(source: TocItem[], dataTransfer: DataTransfer, _token: CancellationToken): void {
    dataTransfer.set(MIME_TYPE, new DataTransferItem(source))
  }

  async handleDrop(target: TocItem | undefined, dataTransfer: DataTransfer, _token: CancellationToken) {
    const transferItem = dataTransfer.get(MIME_TYPE)
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
    return parent.symbol.range.contains(child.symbol.range)
  }
}
