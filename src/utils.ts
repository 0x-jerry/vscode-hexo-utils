import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

async function getPkg() {
  const rootPath = vscode.workspace.rootPath;
  if (!rootPath) return null;

  const pkgPath = path.join(rootPath, 'package.json');

  if (!fs.existsSync(pkgPath)) return null;

  const pkg = await import(pkgPath);

  return pkg;
}

async function isHexoProject(): Promise<boolean> {
  const pkg = await getPkg();

  return pkg;
}

export { isHexoProject };
