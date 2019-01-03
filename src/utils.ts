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
  const isHexo = !!(pkg && pkg.dependencies && pkg.dependencies.hexo);

  if (!isHexo) {
    vscode.window.showInformationMessage('This project is not a hexo project');
  }

  return isHexo;
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

function fsExist(path: fs.PathLike): Thenable<boolean> {
  return new Promise((resolve) => {
    fs.exists(path, (exist) => {
      return resolve(exist);
    });
  });
}

function fsStat(path: fs.PathLike): Thenable<fs.Stats | NodeJS.ErrnoException> {
  return new Promise((resolve) => {
    fs.stat(path, (err, info) => {
      return resolve(err || info);
    });
  });
}

function fsReaddir(path: fs.PathLike): Thenable<string[] | NodeJS.ErrnoException> {
  return new Promise((resolve) => {
    fs.readdir(path, (err, files) => {
      return resolve(err || files);
    });
  });
}

function fsUnlink(path: fs.PathLike): Thenable<NodeJS.ErrnoException> {
  return new Promise((resolve) => {
    fs.unlink(path, (err) => resolve(err));
  });
}

export { isHexoProject, exec, fsExist, fsStat, fsReaddir, fsUnlink };
