import { FileType, RelativePattern, type Uri, workspace } from 'vscode'

export async function getDirFiles(dir: Uri) {
  const exist = (await isExist(dir))?.type === FileType.Directory

  if (!exist) {
    return []
  }

  return workspace.fs.readDirectory(dir)
}

export async function getMDFiles(dir: Uri) {
  const mds = await workspace.findFiles(new RelativePattern(dir, '**/*.md'), 'node_modules')

  return mds
}

export async function isExist(uri: Uri) {
  try {
    const stat = await workspace.fs.stat(uri)
    return stat
  } catch {
    return null
  }
}
