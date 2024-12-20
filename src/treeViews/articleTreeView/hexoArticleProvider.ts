import {
  type TreeDataProvider,
  EventEmitter,
  TreeItem,
  ThemeIcon,
  type TreeItemCollapsibleState,
  type Uri,
  type ProviderResult,
  type TreeDragAndDropController,
  type CancellationToken,
  type DataTransfer,
  DataTransferItem,
} from 'vscode'
import { Commands } from '../../commands/common'
import { ArticleTypes } from '../../commands/createArticle'
import { getMDFiles, getMDFileMetadata } from '../../utils'
import { configs, getConfig, ConfigProperties, SortBy } from '../../configs'
import type { IHexoMetadata } from '../../hexoMetadata'
import { BaseDispose } from '../common'
import { MoveFile } from '../../commands'
import { mineTypePrefix } from './const'

export interface HexoArticleOption {
  acceptDropMimeType: string
}

export class HexoArticleProvider
  extends BaseDispose
  implements TreeDataProvider<ArticleItem>, TreeDragAndDropController<ArticleItem>
{
  dropMimeTypes: string[] = []
  dragMimeTypes: string[] = []

  private _onDidChangeTreeData = new EventEmitter<ArticleItem | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  type = ArticleTypes.post

  private allItems: Map<string, ArticleItem> = new Map()

  constructor(type: ArticleTypes, option: HexoArticleOption) {
    super()
    this.type = type
    this.subscribe(this._onDidChangeTreeData)

    this.dragMimeTypes.push(this.mimeType)
    this.dropMimeTypes.push(option.acceptDropMimeType)

    this.recalculateItems()
  }

  private get mimeType() {
    return mineTypePrefix + this.type
  }

  private recalculateItems() {
    const _dispose = this.onDidChangeTreeData(() => {
      this.allItems = new Map()
    })

    this.subscribe(_dispose)
  }

  handleDrag(
    source: readonly ArticleItem[],
    dataTransfer: DataTransfer,
    token: CancellationToken,
  ): void {
    dataTransfer.set(this.mimeType, new DataTransferItem(source))
  }

  async handleDrop(
    target: ArticleItem | undefined,
    dataTransfer: DataTransfer,
    token: CancellationToken,
  ) {
    const transferItem = dataTransfer.get(this.dropMimeTypes[0])

    if (!transferItem) {
      return
    }

    try {
      const treeItems: ArticleItem[] = JSON.parse(await transferItem.asString())
      await MoveFile.move(this.type, treeItems)
    } catch (error) {
      console.warn(error)
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire(null)
  }

  getTreeItem(element: ArticleItem): TreeItem {
    return element
  }

  getItem(file: string) {
    return this.allItems.get(file)
  }

  getParent(element: ArticleItem): ProviderResult<ArticleItem> {
    return null
  }

  async getChildren(element?: ArticleItem): Promise<ArticleItem[]> {
    const items: ArticleItem[] = []

    const articleRootPath =
      this.type === ArticleTypes.draft ? configs.paths.draft : configs.paths.post

    const paths = await getMDFiles(articleRootPath)

    await Promise.all(
      paths.map(async (p) => {
        const metadata = await getMDFileMetadata(p)

        const name = p.fsPath.slice(articleRootPath.fsPath.length + 1)

        const item = new ArticleItem(name, p, metadata)

        items.push(item)
        this.allItems.set(p.fsPath, item)
      }),
    )

    return items.sort((a, b) => {
      const sortMethod = getConfig(ConfigProperties.sortMethod)

      switch (sortMethod) {
        case SortBy.name:
          return String(a.label) < String(b.label) ? -1 : 1
        case SortBy.date:
          return a.metadata.date < b.metadata.date ? 1 : -1

        default:
          return String(a.label) < String(b.label) ? -1 : 1
      }
    })
  }
}

export class ArticleItem extends TreeItem {
  iconPath = ThemeIcon.File
  metadata: IHexoMetadata

  constructor(
    label: string,
    uri: Uri,
    metadata: IHexoMetadata,
    collapsibleState?: TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState)
    this.metadata = metadata

    this.resourceUri = uri
    this.command = {
      title: 'open',
      command: Commands.open,
      arguments: [this.resourceUri],
    }
  }
}
