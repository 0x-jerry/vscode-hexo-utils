import path from 'node:path'
import {
  EventEmitter,
  type ProviderResult,
  ThemeIcon,
  type TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode'
import { Commands } from '../../commands/common'
import { configs } from '../../configs'
import { HexoMetadataKeys, metadataManager } from '../../metadata'
import { BaseDispose } from '../common'

export enum ClassifyTypes {
  category = HexoMetadataKeys.categories,
  tag = HexoMetadataKeys.tags,
}

export class HexoClassifyProvider extends BaseDispose implements TreeDataProvider<ClassifyItem> {
  private _onDidChangeTreeData = new EventEmitter<ClassifyItem | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  type: ClassifyTypes = ClassifyTypes.category

  private _allItems: Map<string, ClassifyItem> = new Map()

  constructor(type: ClassifyTypes) {
    super()
    this.type = type

    this.subscribe(this._onDidChangeTreeData)
  }

  refresh() {
    this._allItems = new Map()
    this._onDidChangeTreeData.fire(null)
  }

  getTreeItem(element: ClassifyItem): TreeItem | Thenable<TreeItem> {
    return element
  }

  getItem(file: string) {
    const name = Uri.parse(file).toString()
    return this._allItems.get(name)
  }

  getParent(element: ClassifyItem): ProviderResult<ClassifyItem> {
    return element.parent
  }

  async getChildren(element?: ClassifyItem): Promise<ClassifyItem[]> {
    const postFolder = configs.paths.post
    const draftFolder = configs.paths.draft

    const items: ClassifyItem[] = []
    const grouped = await metadataManager.getGroupedMetadataByTags()

    if (element) {
      const classify = grouped.find((n) => n.name === element.label)

      for (const metadata of classify?.items || []) {
        const isDraft = metadata.uri.fsPath.startsWith(draftFolder.fsPath)

        const name = path.relative(
          isDraft ? draftFolder.fsPath : postFolder.fsPath,
          metadata.uri.fsPath,
        )

        const item = new ClassifyItem(name, this.type, metadata.uri, undefined, isDraft)
        item.parent = element

        this._allItems.set(metadata.uri.fsPath, item)
        items.push(item)
      }
    } else {
      const classifies = grouped

      for (const t of classifies) {
        const item = new ClassifyItem(
          t.name,
          this.type,
          undefined,
          TreeItemCollapsibleState.Collapsed,
        )

        this._allItems.set(t.name, item)
        items.push(item)
      }
    }

    return items
  }
}

export class ClassifyItem extends TreeItem {
  parent?: ClassifyItem

  constructor(
    label: string,
    readonly type: ClassifyTypes,
    uri?: Uri,
    collapsibleState?: TreeItemCollapsibleState,
    isDraft?: boolean,
  ) {
    super(label, collapsibleState)
    const resourcesFolder = configs.project.resource

    this.contextValue = uri ? 'hexoArticleItem' : 'hexoClassifyItem'

    this.iconPath = uri
      ? ThemeIcon.File
      : {
          dark: Uri.file(path.join(resourcesFolder, 'dark', `icon-${type}.svg`)),
          light: Uri.file(path.join(resourcesFolder, 'light', `icon-${type}.svg`)),
        }

    if (isDraft) {
      this.description = 'Draft'
    }

    if (uri) {
      this.resourceUri = uri

      this.command = {
        title: 'open',
        command: Commands.open,
        arguments: [this.resourceUri],
      }
    }
  }
}
