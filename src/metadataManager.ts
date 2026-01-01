import { workspace, Uri } from 'vscode'
import { getMDFiles, getMDFileMetadata } from './utils'
import { HexoMetadataUtils, type IHexoMetadata } from './hexoMetadata'
import { getConfig, ConfigProperties, configs } from './configs'

export class MetadataManager {
  private static instance: MetadataManager
  private _metadataUtils?: HexoMetadataUtils

  private constructor() {}

  static getInstance() {
    if (!MetadataManager.instance) {
      MetadataManager.instance = new MetadataManager()
    }
    return MetadataManager.instance
  }

  async getMetadataUtils(forceRefresh = false): Promise<HexoMetadataUtils> {
    if (this._metadataUtils && !forceRefresh) {
      return this._metadataUtils
    }

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

    this._metadataUtils = new HexoMetadataUtils(filesData)
    return this._metadataUtils
  }

  async getTags(): Promise<string[]> {
    const utils = await this.getMetadataUtils()
    return utils.tags.map((t) => t.name)
  }

  async getCategories(): Promise<string[]> {
    const utils = await this.getMetadataUtils()
    return utils.categories.map((c) => c.name)
  }
}
