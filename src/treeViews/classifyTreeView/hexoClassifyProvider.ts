import path from 'node:path'
import { isHexoProject, getMDFiles, getMDFileMetadata } from '../../utils'
import { Commands } from '../../commands/common'
import { HexoMetadataUtils, type IHexoMetadata } from '../../hexoMetadata'
import { getConfig, ConfigProperties, configs } from '../../configs'

import {
  type TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  Uri,
  type ProviderResult,
} from 'vscode'
import { BaseDispose } from '../common'

export enum ClassifyTypes {
  category = 'categories',
  tag = 'tags',
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
    if (!isHexoProject()) {
      return []
    }

    const postFolder = configs.paths.post
    const draftFolder = configs.paths.draft

    const include = getConfig<boolean>(ConfigProperties.includeDraft)

    const postsPath = await getMDFiles(postFolder)

    let draftsPath: Uri[] = []

    if (include) {
      draftsPath = await getMDFiles(draftFolder)
    }

    const filesPath = postsPath.concat(include ? draftsPath : [])

    const filesData: IHexoMetadata[] = await Promise.all(
      filesPath.map((filePath) => getMDFileMetadata(filePath)),
    )

    const items: ClassifyItem[] = []
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label)

      if (classify) {
        for (const metadata of classify.files) {
          const isDraft =
            include && draftsPath.findIndex((p) => p.fsPath === metadata.filePath.fsPath) !== -1

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
      this._hexoMetadataUtils = new HexoMetadataUtils(filesData)
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
          dark: path.join(resourcesFolder, 'dark', `icon-${type}.svg`),
          light: path.join(resourcesFolder, 'light', `icon-${type}.svg`),
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
