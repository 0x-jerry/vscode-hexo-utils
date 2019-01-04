import * as vscode from 'vscode';

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

export { info, warn, error };
