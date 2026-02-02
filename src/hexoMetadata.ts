import path from 'node:path'
import type { Uri } from 'vscode'
import { ConfigProperties, configs, getConfig, SortBy } from './configs'
import { ClassifyTypes } from './treeViews/classifyTreeView/hexoClassifyProvider'
import { getMDFileMetadata, getMDFiles } from './utils'

export enum HexoMetadataKeys {
  tags = 'tags',
  categories = 'categories',
  title = 'title',
  date = 'date',
  updated = 'updated',
}

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
  /**
   * All keys in Front Matter
   */
  keys: string[]
}

type THexoMeta = IHexoMetadata & { name?: string }

interface IClassify {
  name: string
  files: THexoMeta[]
}

export class HexoMetadataUtils {
  private static _instance?: HexoMetadataUtils
  static clear() {
    HexoMetadataUtils._instance = undefined
  }

  tags: IClassify[] = []
  categories: IClassify[] = []
  allKeys: string[] = []
  private _metadataMap: Map<string, THexoMeta> = new Map()

  constructor(metadatas: THexoMeta[]) {
    for (const metadata of metadatas) {
      this._metadataMap.set(metadata.filePath.toString(), metadata)
    }

    this.rebuildClassifies()
  }

  private rebuildClassifies() {
    this.tags = []
    this.categories = []
    const keysSet = new Set<string>()

    for (const metadata of this._metadataMap.values()) {
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

      if (metadata.keys) {
        for (const key of metadata.keys) {
          keysSet.add(key)
        }
      }
    }

    this.allKeys = Array.from(keysSet)
    this.sort()
  }

  static async update(uri: Uri) {
    if (!HexoMetadataUtils._instance) {
      await HexoMetadataUtils.get()
      return
    }

    const metadata = await getMDFileMetadata(uri)
    HexoMetadataUtils._instance._metadataMap.set(uri.toString(), metadata)
    HexoMetadataUtils._instance.rebuildClassifies()
  }

  private static _getPromise?: Promise<HexoMetadataUtils>

  static async get(forceRefresh = false): Promise<HexoMetadataUtils> {
    if (forceRefresh) {
      HexoMetadataUtils.clear()
    }

    if (HexoMetadataUtils._instance) {
      return HexoMetadataUtils._instance
    }

    if (HexoMetadataUtils._getPromise) {
      return HexoMetadataUtils._getPromise
    }

    HexoMetadataUtils._getPromise = (async () => {
      try {
        const postFolder = configs.paths.post
        const draftFolder = configs.paths.draft
        const includeDraft = getConfig(ConfigProperties.includeDraft)

        const postsPath = await getMDFiles(postFolder)
        let draftsPath: Uri[] = []
        if (includeDraft) {
          draftsPath = await getMDFiles(draftFolder)
        }

        const filesPath = postsPath.concat(draftsPath)
        const filesData: IHexoMetadata[] = await Promise.all(
          filesPath.map((filePath) => getMDFileMetadata(filePath)),
        )

        HexoMetadataUtils._instance = new HexoMetadataUtils(filesData)
        return HexoMetadataUtils._instance
      } finally {
        HexoMetadataUtils._getPromise = undefined
      }
    })()

    return HexoMetadataUtils._getPromise
  }

  static async getTags(): Promise<string[]> {
    const utils = await HexoMetadataUtils.get()
    return utils.tags.map((t) => t.name)
  }

  static async getCategories(): Promise<string[]> {
    const utils = await HexoMetadataUtils.get()
    return utils.categories.map((c) => c.name)
  }

  static async getAllKeys(): Promise<string[]> {
    const utils = await HexoMetadataUtils.get()
    return utils.allKeys
  }

  getMetadataByUri(uri: Uri): THexoMeta | undefined {
    return this._metadataMap.get(uri.toString())
  }

  private sort() {
    const sortMethod = getConfig(ConfigProperties.sortMethod)

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
    const hexoMeta = metadata as THexoMeta
    if (!hexoMeta.name) {
      hexoMeta.name = path.parse(hexoMeta.filePath.fsPath).name
    }

    this._metadataMap.set(hexoMeta.filePath.toString(), hexoMeta)

    const find = this[type].find((t) => t.name === name)

    if (!find) {
      this[type].push({
        name,
        files: [hexoMeta],
      })
      return
    }

    const exist = find.files.find((f) => f.filePath === hexoMeta.filePath)

    if (!exist) {
      find.files.push(hexoMeta)
    }
  }
}
