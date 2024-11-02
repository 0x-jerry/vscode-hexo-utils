import { Uri, workspace } from 'vscode'
import path from 'node:path'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import yaml from 'yamljs'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function readHexoConfig(hexoRoot: Uri) {
  const configFile = Uri.joinPath(hexoRoot, '_config.yml')

  const content = await workspace.fs.readFile(configFile)

  const config = yaml.parse(content.toString())

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return config as Record<string, any>
}

export async function readHexoDb(hexoRoot: Uri) {
  const configFile = Uri.joinPath(hexoRoot, 'db.json')

  const content = await workspace.fs.readFile(configFile)

  const db: HexoDB = JSON.parse(content.toString())

  return db
}

interface HexoDB {
  meta: {
    version: number
  }
  models: {
    Post: HexoPost[]
  }
}

interface HexoPost {
  title: string
  _content: string
  source: string
  raw: string
  slug: string
  published: boolean
  // "date": "2024-10-28T12:11:25.812Z",
  date: string
  // "updated": "2024-10-28T12:11:25.812Z",
  updated: string
  comments: boolean
  layout: string
  photos: string[]
  _id: string
  content: string
  excerpt: string
  more: string
}

export async function resolveHexoUrlPath(fileUri: Uri, hexoRootUri: Uri): Promise<string | false> {
  const config = await readHexoConfig(hexoRootUri)
  const db = await readHexoDb(hexoRootUri)

  const sourceUri = Uri.joinPath(hexoRootUri, 'source')

  const sourcePath = path.relative(sourceUri.fsPath, fileUri.fsPath).replace(/\\/g, '/')

  const item = db.models.Post.find((p) => p.source === sourcePath)

  if (!item) {
    return ''
  }

  const isDraft = !item.published

  if (!config.render_drafts && isDraft) {
    return false
  }

  const createDate = dayjs(new Date(item.date))

  // https://hexo.io/docs/permalinks
  const permalink: string = config.permalink

  // https://github.com/hexojs/hexo/blob/492debff7c3eb697594a516ab36bed96c94a8cc1/lib/plugins/filter/post_permalink.ts#L8
  const permalinkParams = {
    year: createDate.format('YYYY'),
    month: createDate.format('MM'),
    i_month: createDate.format('M'),
    day: createDate.format('DD'),
    i_day: createDate.format('D'),
    hour: createDate.format('HH'),
    minute: createDate.format('mm'),
    second: createDate.format('ss'),

    title: item.slug,
    name: typeof item.slug === 'string' ? path.basename(item.slug) : '',
    post_title: item.title,
    id: item._id,

    // not support
    // category: todo
    // not support
    // hash: todo
  }

  // todo, when edit post, the date will change,
  // then it will cause calculate the wrong permalink
  return renderPermalink(permalink, permalinkParams)
}

function renderPermalink(pattern: string, params: Record<string, string>) {
  return pattern.replace(/:([a-z_]+)/g, (key) => params[key.slice(1)])
}
