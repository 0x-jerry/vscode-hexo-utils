import path from 'node:path'
import { ensureArray } from '@0x-jerry/utils'
import { RelativePattern, type Uri, workspace } from 'vscode'
import yaml from 'yaml'
import { ConfigProperties, configs, getConfig, SortBy } from './configs'
import { HexoMetadataKeys } from './hexoMetadata'

export interface IFrontmatterData {
  [key: string]: unknown

  tags: string[]
  categories: string[]
  title: string
  date?: Date
}

/**
 * Front Matter range, line start to line end
 */
interface IFrontmatterRange {
  start: number
  end: number
}

export interface IFileMetadata {
  uri: string
  name: string
  range?: IFrontmatterRange
  data: IFrontmatterData
}

interface IGrouped<T> {
  name: string
  items: T[]
}

class MetadataManager {
  _caches = new Map<string, Promise<IFileMetadata>>()

  allAvailableKeys = new Set<string>()

  get(uri: Uri) {
    const key = uri.toString()
    let p = this._caches.get(key)

    if (!p) {
      p = parseFileMetadata(uri)

      p.then((metadata) => {
        this._postProcessAfterLoadMetadata(metadata)
      })

      this._caches.set(key, p)
    }

    return p
  }

  getAll() {
    return Promise.all(this._caches.values())
  }

  update(uri: Uri) {
    this._caches.delete(uri.toString())

    return this.get(uri)
  }

  async getGroupedMetadataByTags() {
    const allData = await this.getAll()

    const grouped: IGrouped<IFileMetadata>[] = []

    for (const data of allData) {
      for (const tag of data.data.tags) {
        const group = grouped.find((group) => group.name === tag)

        if (group) {
          group.items.push(data)
        } else {
          grouped.push({
            name: tag,
            items: [data],
          })
        }
      }
    }

    const sortFn = getSortFn()

    grouped.forEach(sortFn)
    grouped.sort((a, b) => (a.name < b.name ? -1 : 1))

    return grouped
  }

  async getGroupedMetadataByCategories() {
    const allData = await this.getAll()

    const grouped: IGrouped<IFileMetadata>[] = []

    for (const data of allData) {
      for (const category of data.data.categories) {
        const group = grouped.find((group) => group.name === category)

        if (group) {
          group.items.push(data)
        } else {
          grouped.push({
            name: category,
            items: [data],
          })
        }
      }
    }

    const sortFn = getSortFn()

    grouped.forEach(sortFn)
    grouped.sort((a, b) => (a.name < b.name ? -1 : 1))

    return grouped
  }

  async getAllCategories() {
    const categories = new Set<string>()

    for (const metadata of await this.getAll()) {
      for (const category of metadata.data.categories) {
        categories.add(category)
      }
    }

    return [...categories]
  }

  async buildCache() {
    const files = await workspace.findFiles(
      new RelativePattern(configs.hexoRoot, '**/*.md'),
      'node_modules',
    )

    for (const file of files) {
      await this.get(file)
    }
  }

  async updateFrontmatter(uri: Uri, frontmatter: IFrontmatterData) {
    const p = await this.get(uri)
    p.data = frontmatter

    this._postProcessAfterLoadMetadata(p)
  }

  _postProcessAfterLoadMetadata(metadata: IFileMetadata) {
    this._updateAvailableKeys(metadata)
  }

  _updateAvailableKeys(data: IFileMetadata) {
    for (const key in data.data) {
      this.allAvailableKeys.add(key)
    }
  }
}

function getSortFn() {
  const sortMethod = getConfig(ConfigProperties.sortMethod)

  const key = sortMethod === SortBy.date ? 'date' : 'name'

  const sortFn = (grouped: IGrouped<IFileMetadata>) => {
    grouped.items.sort((a, b) => ((a.data[key] ?? 0) < (b.data[key] ?? 0) ? 1 : -1))
  }

  return sortFn
}

async function parseFileMetadata(uri: Uri) {
  const content = (await workspace.fs.readFile(uri)).toString()

  const metadata: IFileMetadata = {
    uri: uri.toString(),
    name: path.parse(uri.fsPath).name,
    data: {
      categories: [],
      tags: [],
      title: '',
      date: new Date(),
    },
  }

  const frontmatterContent = extractFrontmatterContent(content)

  if (!frontmatterContent) {
    return metadata
  }
  metadata.range = frontmatterContent.range

  try {
    const frontmatter = yaml.parse(frontmatterContent.content)

    metadata.data = {
      ...frontmatter,
      categories: ensureArray(frontmatter[HexoMetadataKeys.categories]),
      tags: ensureArray(frontmatter[HexoMetadataKeys.tags]),
      title: frontmatter[HexoMetadataKeys.title] || '',
      date: frontmatter[HexoMetadataKeys.date],
    }
  } catch (_error) {
    // ignore error
  }

  return metadata
}

function extractFrontmatterContent(content: string) {
  const lines = content.split(/\r?\n/gm)

  let start = -1
  let end = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) {
        start = i
      } else {
        end = i
        break
      }
    }
  }

  if (start !== -1 && end !== -1) {
    return {
      content: lines.slice(start + 1, end).join('\n'),
      range: { start, end },
    }
  }

  return null
}

export const metadataManager = new MetadataManager()
