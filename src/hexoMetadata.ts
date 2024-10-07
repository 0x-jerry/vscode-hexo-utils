import { ClassifyTypes } from './treeViews/classifyTreeView/hexoClassifyProvider'
import path from 'node:path'
import { ConfigProperties, getConfig, SortBy } from './configs'
import type { Uri } from 'vscode'

export interface IHexoMetadata {
  tags: string[]
  categories: string[]
  title: string
  date: Date
  filePath: Uri
  /**
   * For cache, latest modification time.
   */
  mtime: number
}

type THexoMeta = IHexoMetadata & { name?: string }

interface IClassify {
  name: string
  files: THexoMeta[]
}

export class HexoMetadataUtils {
  tags: IClassify[] = []
  categories: IClassify[] = []

  constructor(metadatas: THexoMeta[]) {
    for (const metadata of metadatas) {
      metadata.name = path.parse(metadata.filePath.fsPath).name

      if (metadata.tags) {
        for (const t of metadata.tags) {
          this.addClassify(ClassifyTypes.tag, t, metadata)
        }
      }

      if (metadata.categories) {
        for (const t of metadata.categories) {
          this.addClassify(ClassifyTypes.category, t, metadata)
        }
      }
    }

    this.sort()
  }

  private sort() {
    const sortMethod = <SortBy>getConfig(ConfigProperties.sortMethod)

    const key: keyof THexoMeta = sortMethod === SortBy.date ? 'date' : 'name'

    const sortClassify = (category: IClassify) => {
      category.files.sort((a, b) => ((a[key] ?? 0) < (b[key] ?? 0) ? 1 : -1))
    }

    this.tags.sort((a, b) => (a.name < b.name ? 1 : -1))
    this.categories.sort((a, b) => (a.name < b.name ? 1 : -1))

    this.tags.forEach(sortClassify)
    this.categories.forEach(sortClassify)
  }

  private addClassify(type: ClassifyTypes, name: string, metadata: IHexoMetadata) {
    const find = this[type].find((t) => t.name === name)

    if (!find) {
      this[type].push({
        name,
        files: [metadata],
      })
      return
    }

    const exist = find.files.find((f) => f.filePath === metadata.filePath)

    if (!exist) {
      find.files.push(metadata)
    }
  }
}
