import * as fs from 'fs';

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

async function getDirFiles(dir: fs.PathLike): Promise<string[]> {
  const exist = (await fsExist(dir)) && ((await fsStat(dir)) as fs.Stats).isDirectory();

  if (!exist) {
    return [];
  }

  return (await fsReaddir(dir)) as string[];
}

export {
  fsExist,
  fsMkdir,
  fsRead,
  fsReaddir,
  fsRename,
  fsStat,
  fsUnlink,
  fsWriteFile,
  getDirFiles,
};
