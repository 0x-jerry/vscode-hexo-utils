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
    info('This project is not a hexo project');
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

function fsRename(p1: fs.PathLike, p2: fs.PathLike): Thenable<NodeJS.ErrnoException> {
  return new Promise((resolve) => {
    fs.rename(p1, p2, (err) => {
      resolve(err);
    });
  });
}

function fsMkdir(path: fs.PathLike): Thenable<NodeJS.ErrnoException> {
  return new Promise((resolve) => {
    fs.mkdir(path, null, (err) => {
      resolve(err);
    });
  });
}

function fsRead(path: fs.PathLike): Thenable<NodeJS.ErrnoException | string> {
  return new Promise((resolve) => {
    fs.readFile(path, { encoding: 'utf-8' }, (err, data) => {
      resolve(err || data);
    });
  });
}

function fsWriteFile(path: fs.PathLike, data: string): Thenable<NodeJS.ErrnoException | string> {
  return new Promise((resolve) => {
    fs.writeFile(path, data, { encoding: 'utf-8' }, (err) => {
      resolve(err);
    });
  });
}

function info(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return vscode.window.showInformationMessage(str, ...items);
}

function warn(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return vscode.window.showWarningMessage(str, ...items);
}

function error(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return vscode.window.showErrorMessage(str, ...items);
}

async function getDirFiles(dir: fs.PathLike): Promise<string[]> {
  const exist = (await fsExist(dir)) && ((await fsStat(dir)) as fs.Stats).isDirectory();

  if (!exist) {
    return [];
  }

  return (await fsReaddir(dir)) as string[];
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

export {
  isHexoProject,
  askForNext,
  exec,
  fsExist,
  fsStat,
  fsReaddir,
  fsUnlink,
  fsRename,
  fsMkdir,
  fsRead,
  fsWriteFile,
  info,
  warn,
  error,
  getDirFiles,
};
