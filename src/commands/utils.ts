import { Uri, WorkspaceEdit, workspace } from 'vscode';

function toUri(path: string | Uri) {
  if (typeof path === 'string') {
    return Uri.parse(path);
  }

  return path;
}

export async function rename(oldPath: Uri | string, newPath: Uri | string) {
  const edit = new WorkspaceEdit();

  edit.renameFile(toUri(oldPath), toUri(newPath), {
    ignoreIfExists: true,
    overwrite: true,
  });

  return workspace.applyEdit(edit);
}
