import Token = require('markdown-it/lib/token');
import * as MarkdownIt from 'markdown-it';
import * as path from 'path';
import { window, workspace } from 'vscode';
import * as fs from 'fs';

export default function plugin(md: MarkdownIt) {
  md.core.ruler.after('inline', 'hexo-resource', (status) => {
    status.tokens.forEach((token) => {
      if (!token.children) {
        return;
      }

      token.children.forEach((child) => {
        if (child.type === 'image') {
          hexoImage(child);
        }
        if (child.type === 'text') {
          hexoTag(child, md);
        }
      });
    });
  });
}

function hexoImage(token: Token) {
  // vscode-resource:/c:xx/xx/xx.png
  const oldSrc = token.attrGet('src');

  if (window.activeTextEditor && workspace.rootPath && oldSrc) {
    const prefix = 'vscode-resource:/';
    const filePath = window.activeTextEditor.document.uri.fsPath;

    const srcUri = oldSrc.substr(prefix.length);
    // c:/xxx/xx/source/_posts/xxx/xxx.png => xxx/xxx.png
    const srcName = srcUri.substr(path.dirname(filePath).length + 1);

    const resourceDir = path.join(
      workspace.rootPath,
      'source',
      '_posts',
      path.parse(filePath).name,
    );

    if (!fs.existsSync(srcUri) && fs.existsSync(path.join(resourceDir, srcName))) {
      token.attrSet('src', prefix + path.join(resourceDir, srcName));
    }
  }
}

// {% assert_img img.png%}
function hexoTag(token: Token, md: MarkdownIt) {
  const imgReg = /{%\s+([\w\d]+)\s+([\w\d\.]+)\s+%}/.exec(token.content);

  if (imgReg && imgReg.length >= 3) {
    const [, alt, src] = imgReg;

    const prefix = 'vscode-resource:/';
    if (window.activeTextEditor && workspace.rootPath) {
      const filePath = window.activeTextEditor.document.uri.fsPath;
      const resourceDir = path.join(
        workspace.rootPath,
        'source',
        '_posts',
        path.parse(filePath).name,
      );

      const vscodeSrc = prefix + path.join(resourceDir, src);

      token.type = 'image';
      token.tag = 'img';
      token.attrs = [['src', vscodeSrc], ['alt', alt]];
      token.content = `![${alt}](${src})`;
      token.children = md.parseInline(alt, null);
    }
  }
}
