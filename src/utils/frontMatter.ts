import yaml from 'yaml'
import { type Position, type TextDocument } from 'vscode'
import { HexoMetadataKeys } from '../hexoMetadata'


export const frontMatterKeys = [
  'layout',
  'title',
  'date',
  'updated',
  'comments',
  'tags',
  'categories',
  'permalink',
  'excerpt',
  'disableNunjucks',
  'lang',
  'published',
]

/**
 * Update a specific key in the front matter using 'yaml' library to preserve comments and formatting.
 */
const rangeCache: Record<string, { version: number; range: { start: number; end: number } | undefined }> =
  {}

export function getFrontMatterLinesRange(lines: string[]): { start: number; end: number } | undefined {
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

  return start !== -1 && end !== -1 ? { start, end } : undefined
}

export function getFrontMatterRange(
  document: TextDocument,
): { start: number; end: number } | undefined {
  const cacheKey = document.uri.toString()
  const cached = rangeCache[cacheKey]

  if (cached && cached.version === document.version) {
    return cached.range
  }

  const text = document.getText()
  const lines = text.split(/\r?\n/)
  const range = getFrontMatterLinesRange(lines)

  rangeCache[cacheKey] = {
    version: document.version,
    range,
  }

  return range
}

export function isInFrontMatter(document: TextDocument, position: Position): boolean {
  const range = getFrontMatterRange(document)
  if (!range) {
    return false
  }
  return position.line > range.start && position.line < range.end
}

export function parseFrontMatter<T = any>(text: string): T | undefined {
  try {
    // /---(data)---/ => $1 === data
    const yamlReg = /^---((.|\n|\r)+?)---$/m
    const yamlData = yamlReg.exec(text) || []
    return yaml.parse(yamlData[1]) as T
  } catch (error) {
    return undefined
  }
}

/**
 * Update a specific key in the front matter using 'yaml' library to preserve comments and formatting.
 */
export function updateFrontMatter(
  text: string,
  key: string,
  value: any,
): string {
  const lines = text.split(/\r?\n/)

  const range = getFrontMatterLinesRange(lines)
  const doc = range
    ? yaml.parseDocument(lines.slice(range.start + 1, range.end).join('\n'))
    : new yaml.Document()

  // Create node and apply custom styles
  const node = doc.createNode(value)
  if (key === HexoMetadataKeys.categories) {
    applyCategoriesStyle(node)
  } else if (key === HexoMetadataKeys.tags) {
    applyTagsStyle(node)
  }

  doc.set(key, node)

  const newFrontMatter = doc.toString()

  if (!range) {
    // No front matter exists, create one
    // doc.toString() usually ends with a newline, so we trim it for consistent wrapping
    return `---\n${newFrontMatter.trim()}\n---\n${text}`
  }

  const beforeFM = lines.slice(0, range.start + 1).join('\n')
  const afterFM = lines.slice(range.end).join('\n')

  return `${beforeFM}\n${newFrontMatter}${afterFM}`
}

/**
 * Apply custom formatting to categories node
 */
function applyCategoriesStyle(node: any) {
  if (yaml.isSeq(node)) {
    node.flow = false
    for (const item of node.items) {
      if (yaml.isSeq(item)) {
        item.flow = true
      }
    }
  }
}

/**
 * Apply custom formatting to tags node
 */
function applyTagsStyle(node: any) {
  if (yaml.isSeq(node)) {
    node.flow = true
  }
}

/**
 * Prepare value for categories based on string[] input
 * Converts ["Frontend / React", "Backend"] to [["Frontend", "React"], "Backend"]
 */
export function prepareCategoriesValue(values: string[]): any {
  if (values.length === 0) return []

  const result = values.map((val) => {
    if (val.includes(' / ')) {
      return val.split(' / ').map((s) => s.trim())
    }
    return val
  })

  // If it's just one simple category, return as string
  if (result.length === 1 && !Array.isArray(result[0])) {
    return result[0]
  }

  return result
}

/**
 * Prepare value for tags based on string[] input
 */
export function prepareTagsValue(values: string[]): any {
  if (values.length === 0) return []
  if (values.length === 1) return values[0]
  return values
}
