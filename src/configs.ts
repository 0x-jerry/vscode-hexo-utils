import { Uri, workspace } from 'vscode'
import path from 'node:path'
import yamljs from 'yamljs'

export const ConfigSection = 'hexo'

export enum ConfigProperties {
  includeDraft = 'includeDraft',
  // resolveMarkdownResource = 'markdown.resource',
  hexoRoot = 'hexoProjectRoot',
  sortMethod = 'sortMethod',
  upload = 'upload',
  uploadType = 'uploadType',
  imgChr = 'uploadImgchr',
  tencentOSS = 'uploadTencentOSS',
  generateTimeFormat = 'generateTimeFormat',
  assetFolderType = 'assetFolderType',
  preview = 'preview',
}

export interface ImgChrOption {
  username: string
  password: string
}

export enum SortBy {
  name = 'name',
  date = 'date',
}

export enum AssetFolderType {
  Post = 'post',
  Global = 'global',
}

export enum UploadType {
  imgchr = 'imgchr',
  tencentoss = 'tencentoss',
}

export interface TencentOSSOption {
  SecretId: string
  SecretKey: string
  Region: string
  Bucket: string
}

export interface PreviewConfig {
  autoStart: boolean
  port: number
}

type ConfigTypeMap = {
  [ConfigProperties.assetFolderType]: AssetFolderType
  [ConfigProperties.generateTimeFormat]: string
  [ConfigProperties.hexoRoot]: string
  [ConfigProperties.imgChr]: ImgChrOption
  [ConfigProperties.includeDraft]: boolean
  // [ConfigProperties.resolveMarkdownResource]: boolean
  [ConfigProperties.sortMethod]: SortBy
  [ConfigProperties.tencentOSS]: TencentOSSOption
  [ConfigProperties.upload]: boolean
  [ConfigProperties.uploadType]: UploadType
  [ConfigProperties.preview]: PreviewConfig
}

export function getConfig<T extends ConfigProperties>(propName: T, section = ConfigSection) {
  const configs = workspace.getConfiguration(section)
  type Type = ConfigTypeMap[T]
  return configs.get(propName) as Type
}

export const configs = {
  get hexoRoot() {
    const folders = workspace.workspaceFolders || []

    return Uri.joinPath(folders[0].uri, getConfig(ConfigProperties.hexoRoot))
  },
  paths: {
    get scaffold() {
      return Uri.joinPath(configs.hexoRoot, 'scaffolds')
    },
    get post() {
      return Uri.joinPath(configs.hexoRoot, 'source', '_posts')
    },
    get draft() {
      return Uri.joinPath(configs.hexoRoot, 'source', '_drafts')
    },
  },
  async hexoConfig() {
    try {
      const configUri = Uri.joinPath(configs.hexoRoot, '_config.yml')
      const hexoConf = await workspace.fs.readFile(configUri)
      return yamljs.parse(hexoConf.toString())
    } catch (error) {
      return null
    }
  },
  project: {
    resource: path.join(__dirname, '..', 'resources'),
  },
}

export const isDev = process.env.NODE_ENV === 'development'
