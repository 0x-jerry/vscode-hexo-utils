import path from 'path';
import { Uri, window } from 'vscode';
import { ConfigProperties, AssetFolderType, configs, getConfig } from './configs';
import { isVirtualWorkspace } from './utils';
import { Token, type MarkdownIt, type StateInline } from './md-it';

interface ResolveHexoTag {
  (status: StateInline, ...attrs: string[]): any;
}

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
  const [href, title] = attrs;
  const token = status.push('link', 'a', 1);

  const src = getCorrectImagePath(href);
  token.attrs = [
    ['href', src],
    ['alt', title],
  ];

  token.content = `[${title}](${src})`;

  const textToken = status.push('text', '', 0);
  textToken.content = title || '';

  status.push('link', 'a', -1);
};

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
  const isImageReg = /\.(jpg|png|jpeg|webp|av)$/;

  const src = isImageReg.test(attrs[0]) ? attrs[0] : attrs[1];

  const token = status.push('image', 'img', 0);
  createHexoImgToken(token, getCorrectImagePath(src), '');
};

function hexoTagRules(md: MarkdownIt) {
  const supportedTagMap: Record<string, ResolveHexoTag> = {
    img: hexoAssetImgTag,
    asset_img: hexoAssetImgTag,
    asset_link: hexoAssetLinkTag,
  };

  md.inline.ruler.after('text', 'hexo', (status) => {
    const text = status.src.slice(status.pos);

    const hexoTagReg = /^{%(.+)?%}/;
    const hexoTagMatches = hexoTagReg.exec(text);

    if (!hexoTagMatches?.[1]) {
      return false;
    }

    const matchStringReg = /(['"])(\\\1|.)*?\1|[^\s]+/g;

    let [tag, ...attrs] = hexoTagMatches[1].trim().match(matchStringReg) || [];

    // remove quote
    attrs = attrs.map((attr) => {
      try {
        return JSON.parse(attr);
      } catch (error) {
        return attr;
      }
    });

    const supportedHexoTags = Object.keys(supportedTagMap);

    if (!supportedHexoTags.includes(tag!)) {
      return false;
    }

    supportedTagMap[tag!](status, ...attrs);

    status.pos += hexoTagMatches[0].length;

    return true;
  });
}

function createHexoImgToken(token: Token, src: string, alt: string) {
  token.type = 'image';
  token.tag = 'img';
  token.attrs = [
    ['src', src],
    ['alt', alt],
  ];

  token.content = `![${alt}](${src})`;

  const textToken = new Token('text', '', 0);
  textToken.content = alt;

  token.children = [textToken];
}

function getResDir(fileUri: Uri) {
  const isDraft = fileUri.fsPath.indexOf('_drafts') !== -1;

  const assetFolderType = getConfig<AssetFolderType>(ConfigProperties.assetFolderType);

  const fileDir = path
    .relative(isDraft ? configs.paths.draft.fsPath : configs.paths.post.fsPath, fileUri.fsPath)
    .replace(/\.md$/, '');

  const resourceDir =
    assetFolderType === AssetFolderType.Post
      ? Uri.joinPath(configs.paths.post, fileDir)
      : Uri.joinPath(configs.hexoRoot!, 'source');

  return resourceDir;
}

function getCorrectImagePath(imgNameWithExt: string): string {
  let resultPath = imgNameWithExt;

  if (!window.activeTextEditor || isVirtualWorkspace()) {
    return resultPath;
  }

  const activeUri = window.activeTextEditor.document.uri;
  const resourceDir = getResDir(activeUri);

  const imgUri = Uri.joinPath(resourceDir, imgNameWithExt);
  const relativePath = path.relative(path.parse(activeUri.fsPath).dir, imgUri.fsPath);

  try {
    // drawback: not support virtual workspace.
    const fs = require('fs') as typeof import('fs');

    const imagePath = fs.existsSync(imgUri.fsPath) ? relativePath : imgNameWithExt;

    return imagePath;
  } catch (error) {
    console.log('get img failed', imgNameWithExt, error);
    return imgNameWithExt;
  }
}

function rewriteMarkdownItRenderRule(md: MarkdownIt) {
  const defaultImageRender = md.renderer.rules.image!;

  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];

    // relative path
    const src = getCorrectImagePath(token.attrGet('src') || '');

    token.attrSet('src', src);

    return defaultImageRender(tokens, idx, opts, env, self);
  };

  const defaultCodeInlineRender = md.renderer.rules.html_block!;

  md.renderer.rules.html_block = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];

    const hexoTagReg = /{%(.+)?%}/gm;

    /**
     * support asset_path tag
     *
     * {% asset_path filename %}
     */
    token.content = token.content.replace(hexoTagReg, (value) => {
      const [tag, imgPath] = value.slice(2, -2).trim().split(/\s+/);

      if (tag !== 'asset_path') return value;

      return getCorrectImagePath(imgPath);
    });

    return defaultCodeInlineRender(tokens, idx, opts, env, self);
  };
}

export default (md: MarkdownIt) => {
  rewriteMarkdownItRenderRule(md);
  hexoTagRules(md);

  return md;
};
