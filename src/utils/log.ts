import { window } from 'vscode';

function info(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return window.showInformationMessage(str, ...items);
}

function warn(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return window.showWarningMessage(str, ...items);
}

function error(str: string, ...items: string[]) {
  str = 'Hexo: ' + str;
  return window.showErrorMessage(str, ...items);
}

export { info, warn, error };
