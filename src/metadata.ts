import path from 'node:path'
import { ensureArray } from '@0x-jerry/utils'
import { isEqual, uniqWith } from 'lodash-es'
import {
  type Disposable,
  Range,
  RelativePattern,
  type TextDocument,
  type Uri,
  WorkspaceEdit,
  workspace,
} from 'vscode'
import yaml from 'yaml'
import { configs, getSortMethodFn } from './configs'
import { findMarkdownFiles } from './utils'

export enum HexoMetadataKeys {
  tags = 'tags',
  categories = 'categories',
  title = 'title',
  date = 'date',
  updated = 'updated',
}

export interface IFrontmatterData {
  [key: string]: unknown

  tags?: string[]
  categories?: string[][]
  title?: string
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
  uri: Uri
  name: string
  range?: IFrontmatterRange
  data: IFrontmatterData
}

interface IGrouped<T> {
  name: string
  items: T[]
}

class MetadataManager implements Disposable {
  _caches = new Map<string, Promise<IFileMetadata>>()

  _allAvailableKeys = new Set<string>()

  get allFrontmatterKeys() {
    return [...this._allAvailableKeys]
  }

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
      for (const tag of data.data.tags || []) {
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

    const sortFn = getSortMethodFn()

    grouped.forEach((g) => {
      g.items.sort(sortFn)
    })
    grouped.sort((a, b) => (a.name < b.name ? -1 : 1))

    return grouped
  }

  async getGroupedMetadataByCategories() {
    const allData = await this.getAll()

    const grouped: IGrouped<IFileMetadata>[] = []

    for (const data of allData) {
      for (const category of data.data.categories || []) {
        const name = toCategoryLabel(category)

        const group = grouped.find((group) => group.name === name)

        if (group) {
          group.items.push(data)
        } else {
          grouped.push({
            name: name,
            items: [data],
          })
        }
      }
    }

    const sortFn = getSortMethodFn()

    grouped.forEach((g) => {
      g.items.sort(sortFn)
    })

    grouped.sort((a, b) => (a.name < b.name ? -1 : 1))

    return grouped
  }

  /**
   * Get all available frontmatter values by key
   *
   * @param key
   */
  async getAvailableValuesByKey<T>(key: string, exclude?: Uri[]) {
    const items = await this.getAll()

    const values: unknown[] = []

    for (const data of items) {
      if (exclude?.some((uri) => uri.toString() === data.uri.toString())) {
        continue
      }

      const value = data.data[key]

      if (value != null) {
        values.push(value)
      }
    }

    return uniqWith(values, isEqual) as T[]
  }

  async buildCache() {
    const draftFiles = await findMarkdownFiles(configs.paths.draft)
    const postFiles = await findMarkdownFiles(configs.paths.post)

    const files = [...draftFiles, ...postFiles]

    for (const file of files) {
      await this.get(file)
    }
  }

  _postProcessAfterLoadMetadata(metadata: IFileMetadata) {
    this._updateAvailableKeys(metadata)
  }

  _updateAvailableKeys(data: IFileMetadata) {
    for (const key in data.data) {
      this._allAvailableKeys.add(key)
    }
  }

  dispose() {
    this._caches.clear()
    this._allAvailableKeys.clear()
  }
}

async function parseFileMetadata(uri: Uri) {
  const content =
    workspace.textDocuments.find((t) => t.uri.toString() === uri.toString())?.getText() ??
    (await workspace.fs.readFile(uri)).toString()

  const metadata: IFileMetadata = {
    uri: uri,
    name: path.parse(uri.fsPath).name,
    data: {},
  }

  const frontmatterContent = extractFrontmatterContent(content)

  if (!frontmatterContent) {
    return metadata
  }
  metadata.range = frontmatterContent.range

  try {
    const frontmatter = yaml.parse(frontmatterContent.content)

    metadata.data = frontmatter

    if (frontmatter[HexoMetadataKeys.categories]) {
      metadata.data.categories = ensureArray(frontmatter[HexoMetadataKeys.categories]).map((c) =>
        ensureArray(c),
      )
    }

    if (frontmatter[HexoMetadataKeys.tags]) {
      metadata.data.tags = ensureArray(frontmatter[HexoMetadataKeys.tags])
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

export function isInFrontmatterRange(range: IFrontmatterRange, line: number) {
  return line > range.start && line < range.end
}

export function toCategoryLabel(category: string[]) {
  return category.join(' / ')
}

export async function updateDocumentFrontmatter(doc: TextDocument, key: string, value: unknown) {
  const metadata = await metadataManager.get(doc.uri)
  const frontmatter = structuredClone(metadata.data)

  if (isEqual(frontmatter[key], value)) {
    return
  }

  frontmatter[key] = value

  const yamlDoc = new yaml.Document(frontmatter)

  {
    const key = HexoMetadataKeys.tags
    const node = yamlDoc.get(key)

    if (yaml.isSeq(node)) {
      node.items.forEach((item) => {
        if (yaml.isSeq(item)) {
          item.flow = true
        }
      })
    }
  }

  {
    const key = HexoMetadataKeys.categories
    const node = yamlDoc.get(key)

    if (yaml.isSeq(node)) {
      node.items.forEach((item) => {
        if (yaml.isCollection(item)) {
          item.flow = true
        }
      })
    }
  }

  const newFrontmatterText = yamlDoc.toString()

  const applyRange = metadata.range
    ? new Range(metadata.range.start + 1, 0, metadata.range.end, 0)
    : new Range(0, 0, 0, 0)

  const edit = new WorkspaceEdit()
  edit.replace(doc.uri, applyRange, newFrontmatterText)

  await workspace.applyEdit(edit)
  await doc.save()
}

export const metadataManager = new MetadataManager()
