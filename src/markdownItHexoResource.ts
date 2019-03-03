import Token = require('markdown-it/lib/token');
import StateInline = require('markdown-it/lib/rules_inline/state_inline');
import * as MarkdownIt from 'markdown-it';
import * as path from 'path';
import { window } from 'vscode';
import * as fs from 'fs-extra';
import { configs } from './configs';

class MarkdownHexoPlugin {
  md: MarkdownIt;

  static vsResPrefix = 'vscode-resource:/';

  constructor(md: MarkdownIt) {
    this.md = md;

    // install rules
    this.hexoImageRenderRule();
    this.hexoTagRules();
  }

  hexoTagRules() {
    this.md.inline.ruler.after('text', 'hexo', (status) => {
      const text = status.src.slice(status.pos);

      const hexoTagReg = /^{%(.+)?%}/.exec(text);
      if (!(hexoTagReg && hexoTagReg[1])) {
        return;
      }

      const attrs = hexoTagReg[1].split(/\s+/).filter((s) => !!s);
      if (attrs.length < 2) {
        return;
      }

      const [tag, src, ...alts] = attrs;

      const hexoTags = [
        'img',
        'asset_img',
        'asset_link',
        //   'asset_path'
      ];

      if (!hexoTags.find((t) => t === tag)) {
        return;
      }

      if (tag === 'asset_img') {
        this.hexoImageTagRule(status, src, alts.join(' '));
      }

      if (tag === 'img') {
        const token = status.push('image', 'img', 0);
        this.createHexoImg(token, src, alts.join(' '));
      }

      if (tag === 'asset_link') {
        this.hexoLinkTagRule(status, src, alts.join(' '));
      }

      status.pos += hexoTagReg[0].length;

      return true;
    });
  }

  private hexoLinkTagRule(status: StateInline, href: string, text: string) {
    const token = status.push('link', 'a', 1);

    const info = this.getResInfo(href);
    token.attrs = [['href', info.src], ['alt', text]];
    token.content = `[${text}](${info.src})`;

    const textToken = status.push('text', '', 0);
    textToken.content = text || '';

    status.push('link', 'a', -1);
  }

  private hexoImageTagRule(status: StateInline, src: string, alt: string) {
    const token = status.push('image', 'img', 0);
    const info = this.getResInfo(src);
    this.createHexoImg(token, info.src, alt);
  }

  private hexoImageRenderRule() {
    const defaultRender = this.md.renderer.rules.image;

    this.md.renderer.rules.image = (tokens, idx, opts, env, self) => {
      const token = tokens[idx];

      const prefix = MarkdownHexoPlugin.vsResPrefix;
      const filePath = window.activeTextEditor!.document.uri.fsPath;

      const oldSrc = token.attrGet('src') || '';
      const srcUri = oldSrc.substr(prefix.length);
      // c:/xxx/xx/source/_posts/xxx/xxx.png => xxx/xxx.png
      const srcName = srcUri.substr(path.dirname(filePath).length + 1);

      const resourceDir = this.getResDir(filePath);

      if (!fs.existsSync(srcUri) && fs.existsSync(path.join(resourceDir, srcName))) {
        const alt = token.attrGet('alt') || '';

        return `<img src="${prefix + path.join(resourceDir, srcName)}" alt="${alt}" />`;
      } else {
        // pass token to default renderer.
        return defaultRender(tokens, idx, opts, env, self);
      }
    };
  }

  private createHexoImg(token: Token, src: string, alt: string) {
    token.type = 'image';
    token.tag = 'img';
    token.attrs = [['src', src], ['alt', alt]];
    token.content = `![${alt}](${src})`;

    const textToken = new Token('text', '', 0);
    textToken.content = alt;

    token.children = [textToken];
  }

  private getResInfo(resRelativePath: string) {
    const prefix = MarkdownHexoPlugin.vsResPrefix;
    const filePath = window.activeTextEditor!.document.uri.fsPath;
    const resourceDir = this.getResDir(filePath);

    const localPath = path.join(resourceDir, resRelativePath);
    const vscodeSrc = prefix + localPath;

    return {
      src: vscodeSrc,
      filePath,
    };
  }

  private getResDir(filePath: string) {
    const isDraft = filePath.indexOf('_drafts') !== -1;
    const fileDir = path
      .relative(isDraft ? configs.paths.draft : configs.paths.post, filePath)
      .replace(/\.md$/, '');

    const resourceDir = path.join(configs.paths.post, fileDir);
    return resourceDir;
  }
}

export default (md: MarkdownIt) => new MarkdownHexoPlugin(md);
