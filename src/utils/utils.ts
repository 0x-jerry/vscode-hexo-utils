import path from 'node:path'
import yamljs from 'yamljs'
import { type Uri, window, workspace } from 'vscode'
import { type IHexoMetadata, HexoMetadataKeys } from '../hexoMetadata'

/**
 * true if yse
 * @param placeHolder msg
 */
export async function askForNext(placeHolder: string): Promise<boolean> {
  const replace = await window.showQuickPick(['yes', 'no'], {
    placeHolder,
  })

  return replace === 'yes'
}

const metaCache: Record<string, IHexoMetadata> = {}

export async function getMDFileMetadata(uri: Uri): Promise<IHexoMetadata> {
  const stat = await workspace.fs.stat(uri)

  const cacheId = uri.toString()
  const hit = metaCache[cacheId]

  if (hit && stat.mtime === hit.mtime) {
    return hit
  }

  try {
    const content = await workspace.fs.readFile(uri)
    // /---(data)---/ => $1 === data
    const yamlReg = /^---((.|\n|\r)+?)---$/m

    const yamlData = yamlReg.exec(content.toString()) || []

    const data = yamljs.parse(yamlData[1]) || {}

    const categories: (string | string[])[] = Array.isArray(data[HexoMetadataKeys.categories])
      ? data[HexoMetadataKeys.categories]
      : typeof data[HexoMetadataKeys.categories] === 'string'
        ? [data[HexoMetadataKeys.categories]]
        : []

    const hasSubCategory = categories.find((n) => Array.isArray(n))

    const normalizedCategories = hasSubCategory
      ? categories.map((c) => (Array.isArray(c) ? c.join(' / ') : c))
      : categories.length
        ? [categories.join(' / ')]
        : []

    const metadata = {
      tags: Array.isArray(data[HexoMetadataKeys.tags]) ? data[HexoMetadataKeys.tags] : [],
      filePath: uri,
      // →  · /
      categories: normalizedCategories,
      title: data[HexoMetadataKeys.title] || '',
      date: data[HexoMetadataKeys.date] || '',
      mtime: stat.mtime,
    }

    metaCache[cacheId] = metadata

    return metadata
  } catch (error) {
    const metadata = {
      tags: [],
      categories: [],
      filePath: uri,
      title: path.parse(uri.fsPath).name,
      date: new Date(stat.ctime),
      mtime: 0,
    }

    metaCache[cacheId] = metadata

    return metadata
  }
}

export function sleep(ts = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ts))
}

export function isVirtualWorkspace() {
  const isVirtualWorkspace = workspace.workspaceFolders?.every((f) => f.uri.scheme !== 'file')

  return isVirtualWorkspace
}
