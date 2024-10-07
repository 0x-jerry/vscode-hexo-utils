import { Uri, WorkspaceEdit, workspace } from 'vscode'
import { warn } from '../utils'

function toUri(path: string | Uri) {
  if (typeof path === 'string') {
    return Uri.file(path)
  }

  return path
}

export async function rename(oldPath: Uri | string, newPath: Uri | string) {
  const edit = new WorkspaceEdit()

  edit.renameFile(toUri(oldPath), toUri(newPath), {
    overwrite: true,
  })

  const result = await workspace.applyEdit(edit)

  if (!result) {
    warn('Rename failed')
  }

  return result
}
