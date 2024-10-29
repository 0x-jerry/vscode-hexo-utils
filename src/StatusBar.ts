import { type Disposable, StatusBarAlignment, ThemeColor, window, type StatusBarItem } from 'vscode'
import { Commands } from './commands'

export class StatusBar implements Disposable {
  _status: StatusBarItem

  constructor() {
    this._status = window.createStatusBarItem(StatusBarAlignment.Right, 1000)
    this._status.text = '$(server) VitePress'
    this._status.tooltip = 'Click to start'
    this._status.show()
    // this._status.command = Commands.toggle
  }

  started() {
    this._status.text = '$(server) VitePress'
    this._status.tooltip = 'Click to stop'
    this._status.color = new ThemeColor('terminalCommandDecoration.successBackground')
  }

  spinning() {
    this._status.text = '$(sync~spin) VitePress'
    this._status.tooltip = 'Starting the VitePress server'
  }

  stopped() {
    this._status.text = '$(server) VitePress'
    this._status.tooltip = 'Click to start'
    this._status.color = undefined
  }

  dispose() {
    this._status.dispose()
  }
}
