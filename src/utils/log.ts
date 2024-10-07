import { window } from 'vscode'

function info(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  return window.showInformationMessage(str, ...items)
}

function warn(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  return window.showWarningMessage(str, ...items)
}

function error(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  return window.showErrorMessage(str, ...items)
}

export { info, warn, error }
