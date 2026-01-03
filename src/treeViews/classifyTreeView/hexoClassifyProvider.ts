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
import { ConfigProperties, configs, getConfig } from '../../configs'
import { HexoMetadataKeys, HexoMetadataUtils } from '../../hexoMetadata'
import { BaseDispose } from '../common'

export enum ClassifyTypes {
  category = HexoMetadataKeys.categories,
  tag = HexoMetadataKeys.tags,
}

export class HexoClassifyProvider extends BaseDispose implements TreeDataProvider<ClassifyItem> {
  private _onDidChangeTreeData = new EventEmitter<ClassifyItem | null>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  type: ClassifyTypes = ClassifyTypes.category

  private _hexoMetadataUtils?: HexoMetadataUtils
  private _allItems: Map<string, ClassifyItem> = new Map()

  constructor(type: ClassifyTypes) {
    super()
    this.type = type

    this.subscribe(this._onDidChangeTreeData)
  }

  refresh() {
    this._allItems = new Map()
    HexoMetadataUtils.get(true).then(() => {
      this._onDidChangeTreeData.fire(null)
    })
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

    const include = getConfig(ConfigProperties.includeDraft)

    this._hexoMetadataUtils = await HexoMetadataUtils.get()

    const items: ClassifyItem[] = []
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label)

      if (classify) {
        for (const metadata of classify.files) {
          const isDraft = include && metadata.filePath.fsPath.startsWith(draftFolder.fsPath)

          const name = path.relative(
            isDraft ? draftFolder.fsPath : postFolder.fsPath,
            metadata.filePath.fsPath,
          )

          const item = new ClassifyItem(name, this.type, metadata.filePath)
          item.parent = element

          this._allItems.set(metadata.filePath.fsPath, item)
          items.push(item)
        }
      }
    } else {
      const classifies = this._hexoMetadataUtils[this.type]

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
    type: ClassifyTypes,
    uri?: Uri,
    collapsibleState?: TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState)
    const resourcesFolder = configs.project.resource

    this.iconPath = uri
      ? ThemeIcon.File
      : {
          dark: Uri.file(path.join(resourcesFolder, 'dark', `icon-${type}.svg`)),
          light: Uri.file(path.join(resourcesFolder, 'light', `icon-${type}.svg`)),
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
