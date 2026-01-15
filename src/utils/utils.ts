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

  const rawCategories = data[HexoMetadataKeys.categories] || data.category || []
  const categories: (string | string[])[] = Array.isArray(rawCategories)
    ? rawCategories
    : typeof rawCategories === 'string'
      ? [rawCategories]
      : []

  const normalizedCategories = categories
    .filter((c) => !!c)
    .map((c) => (Array.isArray(c) ? c.join(' / ') : String(c)))

  const rawTags = data[HexoMetadataKeys.tags] || data.tag || []
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

  if (doc) {
    const text = doc.getText()
    const mtime = doc.isDirty ? Date.now() : (await workspace.fs.stat(uri)).mtime

    const hit = metaCache[cacheId]
    if (hit && mtime === hit.mtime) {
      return hit
    }

    const metadata = parseMetadata(text, uri, mtime)
    metaCache[cacheId] = metadata
    return metadata
  }

  const stat = await workspace.fs.stat(uri)
  const hit = metaCache[cacheId]

  if (hit && stat.mtime === hit.mtime) {
    return hit
  }

  try {
    const content = await workspace.fs.readFile(uri)
    const text = content.toString()
    const metadata = parseMetadata(text, uri, stat.mtime)

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
