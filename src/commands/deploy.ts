import { spawn } from 'node:child_process'
import { window, workspace } from 'vscode'
import { ConfigProperties, configs, getConfig } from '../configs'
import { outputChannel } from '../utils/log'
import { Command, Commands, command, type ICommandParsed } from './common'

@command()
export class Deploy extends Command {
  constructor() {
    super(Commands.deploy)
  }

  async execute(_cmd: ICommandParsed): Promise<void> {
    const dirtyFiles = workspace.textDocuments.filter((doc) => doc.isDirty)

    if (dirtyFiles.length > 0) {
      const save = 'Save and Deploy'
      const ignore = 'Ignore and Deploy'
      const cancel = 'Cancel'
      const res = await window.showWarningMessage(
        `There are ${dirtyFiles.length} unsaved files. Do you want to save them before deploying?`,
        save,
        ignore,
        cancel,
      )

      if (res === save) {
        await workspace.saveAll()
      } else if (res === ignore) {
        // continue
      } else {
        return
      }
    }

    const hexoRoot = configs.hexoRoot.fsPath
    const deployCommand = getConfig(ConfigProperties.deployCommand) || 'npx hexo deploy'

    outputChannel.appendLine(`[INFO] ${new Date().toLocaleString()}: Starting deploy...`)
    outputChannel.appendLine(`[INFO] Working directory: ${hexoRoot}`)
    outputChannel.appendLine(`[INFO] Command: ${deployCommand}`)

    window.showInformationMessage('Hexo: Deploying...')

    try {
      await this.runCommand(deployCommand, hexoRoot)
      window.showInformationMessage('Hexo: Deploy completed successfully!')
      outputChannel.appendLine(
        `[INFO] ${new Date().toLocaleString()}: Deploy completed successfully!`,
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      window.showErrorMessage(`Hexo: Deploy failed - ${errorMessage}`)
      outputChannel.appendLine(
        `[ERROR] ${new Date().toLocaleString()}: Deploy failed - ${errorMessage}`,
      )
    }
  }

  private runCommand(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const hexoRoot = configs.hexoRoot.fsPath

      // Parse the command to handle arguments correctly
      const args = command.split(/\s+/)
      const cmd = args.shift() || ''

      const child = spawn(cmd, args, {
        cwd,
        shell: true,
        env: {
          ...process.env,
          HEXO_ROOT: hexoRoot,
        },
      })

      child.stdout?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString())
      })

      child.stderr?.on('data', (data: Buffer) => {
        outputChannel.append(data.toString())
      })

      child.on('error', (error) => {
        outputChannel.append(`[ERROR] ${new Date().toLocaleString()}: ${error.message}`)
        reject(error)
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command exited with code ${code}`))
        }
      })
    })
  }
}
