import path from 'node:path'
import { type Uri, window, workspace } from 'vscode'
import { HexoMetadataKeys, type IHexoMetadata } from '../hexoMetadata'
import { parseFrontMatter } from './frontMatter'

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

export function parseMetadata(text: string, uri: Uri, mtime: number): IHexoMetadata {
  const data = parseFrontMatter(text) || {}

  const rawCategories = data[HexoMetadataKeys.categories] || []
  const categories: (string | string[])[] = Array.isArray(rawCategories)
    ? rawCategories
    : typeof rawCategories === 'string'
      ? [rawCategories]
      : []

  const normalizedCategories = categories
    .filter((c) => !!c)
    .map((c) => (Array.isArray(c) ? c.join(' / ') : String(c)))

  const rawTags = data[HexoMetadataKeys.tags] || []
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === 'string'
      ? [rawTags]
      : []

  return {
    tags,
    filePath: uri,
    categories: normalizedCategories,
    title: data[HexoMetadataKeys.title] || '',
    date: data[HexoMetadataKeys.date] || '',
    mtime,
    keys: Object.keys(data),
  }
}

export async function getMDFileMetadata(uri: Uri): Promise<IHexoMetadata> {
  const cacheId = uri.toString()
  const doc = workspace.textDocuments.find((d) => d.uri.toString() === cacheId)
  const mtime = doc?.isDirty ? Date.now() : (await workspace.fs.stat(uri)).mtime

  try {
    const hit = metaCache[cacheId]
    if (hit && mtime === hit.mtime) {
      return hit
    }

    const content = doc?.getText() || (await workspace.fs.readFile(uri)).toString()
    const metadata = parseMetadata(content, uri, mtime)
    metaCache[cacheId] = metadata
    return metadata
  } catch (error) {
    const metadata = {
      tags: [],
      categories: [],
      filePath: uri,
      title: path.parse(uri.fsPath).name,
      date: new Date(mtime),
      mtime,
      keys: [],
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
