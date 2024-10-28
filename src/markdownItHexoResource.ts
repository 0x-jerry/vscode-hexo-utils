import path from 'node:path'
import { Uri, window } from 'vscode'
import { ConfigProperties, AssetFolderType, configs, getConfig } from './configs'
import { isVirtualWorkspace } from './utils'
import { Token, type MarkdownIt, type StateInline } from './md-it'

type ResolveHexoTag = (status: StateInline, ...attrs: string[]) => unknown

/**
 *
 * ref: https://hexo.io/docs/tag-plugins#Include-Assets
 *
 * {% asset_link filename [title] [escape] %}
 *
 * @param status
 * @param attrs
 */
const hexoAssetLinkTag: ResolveHexoTag = (status, ...attrs) => {
  const [href, title] = attrs
  const token = status.push('link', 'a', 1)

  token.attrs = [
    ['href', href],
    ['alt', title],
  ]

  token.content = `[${title}](${href})`

  const textToken = status.push('text', '', 0)
  textToken.content = title || ''

  status.push('link', 'a', -1)
}

/**
 *
 * ref: https://hexo.io/docs/tag-plugins#Image
 *
 * {% img [class names] /path/to/image [width] [height] '"title text" "alt text"' %}
 *
 * ref: https://hexo.io/docs/tag-plugins#Include-Assets
 *
 * {% asset_img [class names] slug [width] [height] [title text [alt text]] %}
 *
 * @param status
 * @param attrs
 */
const hexoAssetImgTag: ResolveHexoTag = (status, ...attrs) => {
  const isImageReg = /\.(jpg|png|jpeg|webp|av)$/

  const src = isImageReg.test(attrs[0]) ? attrs[0] : attrs[1]

  const token = status.push('image', 'img', 0)
  createHexoImgToken(token, src, '')
}

function hexoTagRules(md: MarkdownIt) {
  const supportedTagMap: Record<string, ResolveHexoTag> = {
    img: hexoAssetImgTag,
    asset_img: hexoAssetImgTag,
    asset_link: hexoAssetLinkTag,
  }

  md.inline.ruler.after('text', 'hexo', (status) => {
    const text = status.src.slice(status.pos)

    const hexoTagReg = /^{%(.+)?%}/
    const hexoTagMatches = hexoTagReg.exec(text)

    if (!hexoTagMatches?.[1]) {
      return false
    }

    const matchStringReg = /(['"])(\\\1|.)*?\1|[^\s]+/g

    let [tag, ...attrs] = hexoTagMatches[1].trim().match(matchStringReg) || []

    // remove quote
    attrs = attrs.map((attr) => {
      try {
        return JSON.parse(attr)
      } catch (error) {
        return attr
      }
    })

    const supportedHexoTags = Object.keys(supportedTagMap)

    if (!tag || !supportedHexoTags.includes(tag)) {
      return false
    }

    supportedTagMap[tag](status, ...attrs)

    status.pos += hexoTagMatches[0].length

    return true
  })
}

function createHexoImgToken(token: Token, src: string, alt: string) {
  token.type = 'image'
  token.tag = 'img'
  token.attrs = [
    ['src', src],
    ['alt', alt],
  ]

  token.content = `![${alt}](${src})`

  const textToken = new Token('text', '', 0)
  textToken.content = alt

  token.children = [textToken]
}

function getResDir(fileUri: Uri) {
  const assetFolderType = getConfig<AssetFolderType>(ConfigProperties.assetFolderType)

  if (assetFolderType === AssetFolderType.Global) {
    const resourceDir = Uri.joinPath(configs.hexoRoot, 'source')

    return resourceDir
  }

  const isDraft = fileUri.fsPath.indexOf('_drafts') !== -1

  const articaleFolder = isDraft ? configs.paths.draft : configs.paths.post

  const fileDir = path.relative(articaleFolder.fsPath, fileUri.fsPath).replace(/\.md$/, '')

  const resourceDir = Uri.joinPath(articaleFolder, fileDir)

  return resourceDir
}

function getCorrectImagePath(imgNameWithExt: string): string {
  const resultPath = imgNameWithExt

  if (!window.activeTextEditor || isVirtualWorkspace()) {
    return resultPath
  }

  const activeUri = window.activeTextEditor.document.uri
  const resourceDir = getResDir(activeUri)

  const imgUri = Uri.joinPath(resourceDir, imgNameWithExt)
  const relativePath = path.relative(path.parse(activeUri.fsPath).dir, imgUri.fsPath)

  return relativePath
}

function rewriteMarkdownItRenderRule(md: MarkdownIt) {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const defaultImageRender = md.renderer.rules.image!

  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]

    // relative path
    const src = getCorrectImagePath(token.attrGet('src') || '')

    token.attrSet('src', src)

    return defaultImageRender(tokens, idx, opts, env, self)
  }

  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const defaultCodeInlineRender = md.renderer.rules.html_block!

  md.renderer.rules.html_block = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]

    const hexoTagReg = /{%(.+)?%}/gm

    /**
     * support asset_path tag
     *
     * {% asset_path filename %}
     */
    token.content = token.content.replace(hexoTagReg, (value) => {
      const [tag, imgPath] = value.slice(2, -2).trim().split(/\s+/)

      if (tag !== 'asset_path') return value

      return getCorrectImagePath(imgPath)
    })

    return defaultCodeInlineRender(tokens, idx, opts, env, self)
  }
}

export default (md: MarkdownIt) => {
  hexoTagRules(md)
  rewriteMarkdownItRenderRule(md)

  return md
}
