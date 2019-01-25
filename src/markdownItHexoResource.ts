import Token = require('markdown-it/lib/token');
import * as MarkdownIt from 'markdown-it';
import * as path from 'path';
import { window, workspace } from 'vscode';
import * as fs from 'fs-extra';

class MarkdownHexoPlugin {
  md: MarkdownIt;

  static vsResPrefix = 'vscode-resource:/';

  constructor(md: MarkdownIt) {
    this.md = md;
    this.install();
  }

  private getResDir(filePath: string) {
    const resourceDir = path.join(
      workspace.rootPath!,
      'source',
      '_posts',
      path.parse(filePath).name,
    );
    return resourceDir;
  }

  install() {
    this.md.core.ruler.after('inline', 'hexo-resource', (status) => {
      status.tokens.forEach((token) => {
        if (!token.children) {
          return;
        }

        token.children.forEach((child) => {
          // ![img](img.png)
          if (child.type === 'image') {
            this.hexoImage(child);
          }
          // {% assert_img img.png alt title %}
          if (child.type === 'text') {
            this.hexoTag(child);
          }
        });
      });
    });
  }

  hexoImage(token: Token) {
    // vscode-resource:/c:xx/xx/xx.png
    const oldSrc = token.attrGet('src');

    if (window.activeTextEditor && workspace.rootPath && oldSrc) {
      const prefix = MarkdownHexoPlugin.vsResPrefix;
      const filePath = window.activeTextEditor.document.uri.fsPath;

      const srcUri = oldSrc.substr(prefix.length);
      // c:/xxx/xx/source/_posts/xxx/xxx.png => xxx/xxx.png
      const srcName = srcUri.substr(path.dirname(filePath).length + 1);

      const resourceDir = this.getResDir(filePath);

      if (!fs.existsSync(srcUri) && fs.existsSync(path.join(resourceDir, srcName))) {
        token.attrSet('src', prefix + path.join(resourceDir, srcName));
      }
    }
  }

  hexoTag(token: Token) {
    const imgReg = /{%(.+)?%}/.exec(token.content);
    if (!(imgReg && imgReg[1])) {
      return;
    }

    //[asset_img, img.png, this, is, a, img]
    const attrs = imgReg[1].split(/\s+/).filter((s) => !!s);
    if (attrs.length < 2) {
      return;
    }

    const [tag, src, ...alt] = attrs;

    if (tag === 'asset_img') {
      this.createHexoImgTag(token, src, alt.join(' '));
    }
  }

  createHexoImgTag(token: Token, src: string, alt: string) {
    const prefix = MarkdownHexoPlugin.vsResPrefix;
    const filePath = window.activeTextEditor!.document.uri.fsPath;
    const resourceDir = this.getResDir(filePath);

    const localPath = path.join(resourceDir, src);
    const vscodeSrc = fs.existsSync(localPath) ? prefix + localPath : src;

    token.type = 'image';
    token.tag = 'img';
    token.attrs = [['src', vscodeSrc], ['alt', alt]];
    token.content = `![${alt}](${vscodeSrc})`;
    token.children = this.md.parseInline(alt, null);
  }
}

export default (md: MarkdownIt) => new MarkdownHexoPlugin(md);
