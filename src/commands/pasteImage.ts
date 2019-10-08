import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import * as dayjs from 'dayjs';
import { window } from 'vscode';
import { warn, error, askForNext } from '../utils';
import { Command, ICommandParsed, command, Commands } from './common';

@command()
export class PasteImage extends Command {
  constructor() {
    super(Commands.paste);
  }

  getCurrentDocPath() {
    const editor = window.activeTextEditor;
    if (!editor) {
      return false;
    }
    const uri = editor.document.uri;

    if (uri.scheme === 'untitled') {
      return false;
    }

    return uri.fsPath;
  }

  async execute(cmd: ICommandParsed): Promise<any> {
    try {
      const filePath = this.getCurrentDocPath();
      if (!filePath) {
        return;
      }

      const uri = path.parse(filePath);
      const imageFolder = path.join(uri.dir, uri.name);
      await fs.ensureDir(imageFolder);

      const name = dayjs().format('YYYY-MM-DD HHmmss.png');

      const imagePath = path.join(imageFolder, name);

      if (await fs.pathExists(imagePath)) {
        try {
          await askForNext(`${imagePath} existed, would you want to replace ?`);
        } catch (error) {
          return;
        }
      }

      await this.pasteImage(imagePath);
    } catch (err) {
      error(err);
    }
  }

  getCommand(destPath: string) {
    const platform = process.platform;

    if (platform === 'win32') {
      return {
        cmd: 'powershell',
        params: [
          '-noprofile',
          '-noninteractive',
          '-nologo',
          '-sta',
          '-executionpolicy',
          'unrestricted',
          '-windowstyle',
          'hidden',
          '-file',
          path.join(__dirname, '..', 'scripts', 'pc.ps1'),
          destPath,
        ],
      };
    } else if (platform === 'darwin') {
      return {
        cmd: 'osascript',
        params: [path.join(__dirname, '..', 'scripts', 'mac.applescript'), destPath],
      };
    } else {
      return {
        cmd: 'sh',
        params: [path.join(__dirname, '..', 'scripts', 'linux.sh'), destPath],
      };
    }
  }

  /**
   * !Linux need xclip command
   * @param imageDestPath
   */
  pasteImage(imageDestPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd = this.getCommand(imageDestPath);
      const program = spawn(cmd.cmd, cmd.params);
      let resultData = '';

      program.on('error', (e) => {
        warn(e.message);
        reject();
      });

      program.on('exit', (code, signal) => {
        resultData = resultData.trim();
        if (resultData === 'no xclip') {
          warn('Need xclip command.');
          reject();
        } else if (resultData === 'no image') {
          warn('There is not a image in clipboard.');
        } else {
          resolve(resultData);
        }
      });

      program.stdout.on('data', (data: Buffer) => {
        resultData += data.toString();
      });
    });
  }
}
