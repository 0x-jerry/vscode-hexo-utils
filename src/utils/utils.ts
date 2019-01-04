import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

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

function exec(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: vscode.workspace.rootPath,
      shell: true,
    });

    proc.on('exit', () => {
      resolve();
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * true if yse
 * @param placeHolder msg
 */
async function askForNext(placeHolder: string): Promise<boolean> {
  const replace = await vscode.window.showQuickPick(['yes', 'no'], {
    placeHolder,
  });

  return replace === 'yes';
}

export { isHexoProject, askForNext, exec };
