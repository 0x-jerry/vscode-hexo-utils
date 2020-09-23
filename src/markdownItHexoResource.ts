import Token from 'markdown-it/lib/token';
import StateInline from 'markdown-it/lib/rules_inline/state_inline';
import MarkdownIt from 'markdown-it';
import path from 'path';
import { window } from 'vscode';
import fs from 'fs-extra';
import { configs } from './configs';

class MarkdownHexoPlugin {
  md: MarkdownIt;

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
        return false;
      }

      const attrs = hexoTagReg[1].split(/\s+/).filter((s) => !!s);
      if (attrs.length < 2) {
        return false;
      }

      const [tag, src, ...alts] = attrs;

      const hexoTags = [
        'img',
        'asset_img',
        'asset_link',
        //   'asset_path'
      ];

      if (!hexoTags.find((t) => t === tag)) {
        return false;
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

    const src = this.getImgCorrectPath(href);
    token.attrs = [
      ['href', src],
      ['alt', text],
    ];

    token.content = `[${text}](${src})`;

    const textToken = status.push('text', '', 0);
    textToken.content = text || '';

    status.push('link', 'a', -1);
  }

  private hexoImageTagRule(status: StateInline, src: string, alt: string) {
    const token = status.push('image', 'img', 0);
    this.createHexoImg(token, this.getImgCorrectPath(src), alt);
  }

  private hexoImageRenderRule() {
    const defaultRender = this.md.renderer.rules.image!;

    this.md.renderer.rules.image = (tokens, idx, opts, env, self) => {
      const token = tokens[idx];

      // relative path
      const src = this.getImgCorrectPath(token.attrGet('src') || '');

      token.attrSet('src', src);

      return defaultRender(tokens, idx, opts, env, self);
    };
  }

  private createHexoImg(token: Token, src: string, alt: string) {
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

  private getImgCorrectPath(imgNameWidthExt: string): string {
    let resultPath = imgNameWidthExt;

    if (window.activeTextEditor) {
      const filePath = window.activeTextEditor.document.uri.fsPath;
      const resourceDir = this.getResDir(filePath);

      const imgPath = path.join(resourceDir, imgNameWidthExt);
      const relativePath = path.relative(path.parse(filePath).dir, imgPath);

      resultPath = fs.pathExistsSync(imgPath) ? relativePath : imgNameWidthExt;
    }

    return resultPath;
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
