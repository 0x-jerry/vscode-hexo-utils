import { window } from 'vscode'

const outputChannel = window.createOutputChannel('Hexo Utils')

function info(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  outputChannel.appendLine(`[INFO] ${new Date().toLocaleString()}: ${msg}`)
  return window.showInformationMessage(str, ...items)
}

function warn(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  outputChannel.appendLine(`[WARN] ${new Date().toLocaleString()}: ${msg}`)
  return window.showWarningMessage(str, ...items)
}

function error(msg: string, ...items: string[]) {
  const str = `Hexo: ${msg}`
  outputChannel.appendLine(`[ERROR] ${new Date().toLocaleString()}: ${msg}`)
  outputChannel.show(true)
  return window.showErrorMessage(str, ...items)
}

export { info, warn, error, outputChannel }
