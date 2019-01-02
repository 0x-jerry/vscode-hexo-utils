import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function getPkg() {
  const rootPath = vscode.workspace.rootPath;
  if (!rootPath) {
    return null;
  }

  const pkgPath = path.join(rootPath, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  const pkg = fs.readFileSync(pkgPath, { encoding: 'utf-8' });

  return JSON.parse(pkg);
}

function isHexoProject(): boolean {
  const pkg = getPkg();

  return !!(pkg && pkg.dependencies && pkg.dependencies.hexo);
}

export { isHexoProject };
