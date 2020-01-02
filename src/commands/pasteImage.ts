import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import * as dayjs from 'dayjs';
import { window, TextEditor, ProgressLocation } from 'vscode';
import { warn, error, askForNext } from '../utils';
import { Command, ICommandParsed, command, Commands } from './common';
import { upload } from '../uploader/uploader';
import { getConfig, ConfigProperties } from '../configs';
import * as os from 'os';

@command()
export class PasteImage extends Command {
  constructor() {
    super(Commands.paste);
  }

  getCurrentDocPath(editor: TextEditor) {
    const uri = editor.document.uri;

    if (uri.scheme === 'untitled') {
      return false;
    }

    return uri.fsPath;
  }

  async getImageFilePath(editor: TextEditor) {
    const filePath = this.getCurrentDocPath(editor);
    if (!filePath) {
      return false;
    }

    const uri = path.parse(filePath);
    const imageFolder = path.join(uri.dir, uri.name);

    const selectText = editor.document.getText(editor.selection);

    let name = dayjs().format('YYYY-MM-DDTHHmmss.png');

    if (selectText && !/[\/\\:*?<>|\s]/.test(selectText)) {
      name = selectText + '.png';
    }

    await fs.ensureDir(imageFolder);
    return path.join(imageFolder, name);
  }

  async execute(cmd: ICommandParsed): Promise<any> {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    try {
      const imagePath = await this.saveImage(editor);

      if (imagePath) {
        await this.updateEditor(imagePath, editor);
      }
    } catch (err) {
      error(err);
    }
  }

  async saveImage(editor: TextEditor): Promise<string | false> {
    const uploadEnabled = getConfig<boolean>(ConfigProperties.upload);

    if (uploadEnabled) {
      const tempFilename =
        Math.random()
          .toString()
          .substr(2) + '.jpg';
      const tempPath = path.join(os.tmpdir(), tempFilename);

      const url = await window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation.Notification,
          title: 'Upload image',
        },
        async () => {
          await this.pasteImage(tempPath);
          return await upload(tempPath);
        },
      );

      return url || false;
    } else {
      const imagePath = await this.getImageFilePath(editor);
      if (!imagePath) {
        return false;
      }

      if (
        (await fs.pathExists(imagePath)) &&
        !(await askForNext(`${imagePath} existed, would you want to replace ?`))
      ) {
        return false;
      }

      await this.pasteImage(imagePath);
      return imagePath;
    }
  }

  async updateEditor(imageURI: string, editor: TextEditor) {
    const parsed = path.parse(imageURI);

    editor.edit((edit) => {
      const current = editor.selection;

      try {
      } catch (error) {
        warn('Uploaded failed');
      }

      const insertText = `![${parsed.name}](${
        imageURI.startsWith('http') ? imageURI : parsed.base
      })`;

      if (current.isEmpty) {
        edit.insert(current.start, insertText);
      } else {
        edit.replace(current, insertText);
      }
    });
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
