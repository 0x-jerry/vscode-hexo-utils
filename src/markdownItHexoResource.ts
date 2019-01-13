import * as MarkdownIt from 'markdown-it';
import * as path from 'path';
import { window, workspace } from 'vscode';
import * as fs from 'fs';

// ! Fix can't find global Token define
interface Token {
  // constructor(type: string, tag: string, nesting: number);
  attrGet: (name: string) => string | null;
  attrIndex: (name: string) => number;
  attrJoin: (name: string, value: string) => void;
  attrPush: (attrData: string[]) => void;
  attrSet: (name: string, value: string) => void;
  attrs: string[][];
  block: boolean;
  children: Token[];
  content: string;
  hidden: boolean;
  info: string;
  level: number;
  map: number[];
  markup: string;
  meta: any;
  nesting: number;
  tag: string;
  type: string;
}

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
    const [_, alt, src] = imgReg;

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
