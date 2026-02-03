import {
  type CancellationToken,
  type DataTransfer,
  DataTransferItem,
  EventEmitter,
  type ProviderResult,
  ThemeIcon,
  type TreeDataProvider,
  type TreeDragAndDropController,
  TreeItem,
  type TreeItemCollapsibleState,
  type Uri,
} from 'vscode'
import { MoveFile } from '../../commands'
import { Commands } from '../../commands/common'
import { ArticleTypes } from '../../commands/createArticle'
import { configs, getSortMethodFn } from '../../configs'
import { type IFileMetadata, metadataManager } from '../../metadata'
import { getMDFiles } from '../../utils'
import { BaseDispose } from '../common'
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
    _token: CancellationToken,
  ): void {
    dataTransfer.set(this.mimeType, new DataTransferItem(source))
  }

  async handleDrop(
    _target: ArticleItem | undefined,
    dataTransfer: DataTransfer,
    _token: CancellationToken,
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

  getParent(_element: ArticleItem): ProviderResult<ArticleItem> {
    return null
  }

  async getChildren(_element?: ArticleItem): Promise<ArticleItem[]> {
    const items: ArticleItem[] = []

    const articleRootPath =
      this.type === ArticleTypes.draft ? configs.paths.draft : configs.paths.post

    const paths = await getMDFiles(articleRootPath)

    await Promise.all(
      paths.map(async (p) => {
        const metadata = await metadataManager.get(p)

        const name = p.fsPath.slice(articleRootPath.fsPath.length + 1)

        const item = new ArticleItem(name, p, metadata)

        items.push(item)
        this.allItems.set(p.fsPath, item)
      }),
    )

    const sortFn = getSortMethodFn()
    return items.sort((a, b) => sortFn(a.metadata, b.metadata))
  }
}

export class ArticleItem extends TreeItem {
  iconPath = ThemeIcon.File
  metadata: IFileMetadata

  constructor(
    label: string,
    uri: Uri,
    metadata: IFileMetadata,
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
