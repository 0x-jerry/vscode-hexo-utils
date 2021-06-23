import { FileType, Uri, workspace } from 'vscode';

export async function getDirFiles(dir: Uri) {
  const exist = (await isExist(dir))?.type === FileType.Directory;

  if (!exist) {
    return [];
  }

  return workspace.fs.readDirectory(dir)
}

export async function getMDFiles(dir: Uri) {

  const glob = Uri.joinPath(dir, '/**/*.md').fsPath

  // todo
  const mds = await workspace.findFiles(glob)

  // const prefix = dir.fsPath

  // return mds.map(u => u.fsPath.slice(prefix.length))
  return mds
}


export async function isExist(uri: Uri) {
  try {
    return workspace.fs.stat(uri)
  } catch {
    return null
  }
}
