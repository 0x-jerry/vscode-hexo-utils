import path from 'path';
import os from 'os';
import dayjs from 'dayjs';
import { window, type TextEditor, ProgressLocation, workspace, Uri } from 'vscode';
import { warn, error, askForNext, isExist } from '../utils';
import { Command, type ICommandParsed, command, Commands } from './common';
import { upload } from '../uploader/uploader';
import { getConfig, ConfigProperties, configs, AssetFolderType } from '../configs';
import { readImage, readFiles, supported } from '../addon/clipboard';
import { spawn } from 'node:child_process';

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

    return uri;
  }

  async getImageFilePath(editor: TextEditor) {
    const filePath = this.getCurrentDocPath(editor);
    if (!filePath) {
      return false;
    }

    const parsed = path.parse(filePath.fsPath);

    const assetFolderType = getConfig<AssetFolderType>(ConfigProperties.assetFolderType);
    const hexoFolder = configs.hexoRoot!;

    const imageFolder =
      assetFolderType === AssetFolderType.Post
        ? Uri.joinPath(filePath, '..', parsed.name)
        : Uri.joinPath(hexoFolder, 'source/images', parsed.name);

    const selectText = editor.document.getText(editor.selection);

    let name = dayjs().format('YYYY-MM-DDTHHmmss.png');

    if (selectText && !/[\/\\:*?<>|\s]/.test(selectText)) {
      name = selectText + '.png';
    }

    await workspace.fs.createDirectory(imageFolder);
    return Uri.joinPath(imageFolder, name);
  }

  /**
   * @param cmd
   * @returns
   */
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
      error(String(err));
    }
  }

  async saveImage(editor: TextEditor): Promise<string | false> {
    const uploadEnabled = getConfig<boolean>(ConfigProperties.upload);

    const tempFilename = Math.random().toString().slice(2);
    const tempPathWithoutExt = path.join(os.tmpdir(), tempFilename);
    const tempPath = await this.pasteImage(tempPathWithoutExt);

    if (!tempPath) return false;

    if (uploadEnabled) {
      const url = await window.withProgress(
        {
          cancellable: true,
          location: ProgressLocation.Notification,
          title: 'Upload image',
        },
        async () => {
          return await upload(tempPath.fsPath);
        },
      );

      return url || false;
    } else {
      const imagePath = await this.getImageFilePath(editor);
      if (!imagePath) {
        return false;
      }

      if (
        (await isExist(imagePath)) &&
        !(await askForNext(`${imagePath} existed, would you want to replace ?`))
      ) {
        return false;
      }
      const tempUri = tempPath;

      await workspace.fs.copy(tempUri, imagePath);
      return imagePath.fsPath;
    }
  }

  async updateEditor(imageURI: string, editor: TextEditor) {
    const parsed = path.parse(imageURI);

    const assetFolderType = getConfig<AssetFolderType>(ConfigProperties.assetFolderType);
    const hexoSourceFolder = Uri.joinPath(configs.hexoRoot!, 'source').fsPath;

    const image_path =
      assetFolderType === AssetFolderType.Post
        ? parsed.base
        : path.join('/', path.relative(hexoSourceFolder, imageURI));

    editor.edit((edit) => {
      const current = editor.selection;

      try {
      } catch (error) {
        warn('Uploaded failed');
      }

      const insertText = `![${parsed.name}](${
        imageURI.startsWith('http') ? imageURI : image_path
      })`;

      if (current.isEmpty) {
        edit.insert(current.start, insertText);
      } else {
        edit.replace(current, insertText);
      }
    });
  }

  /**
   * @param savedPath should not contain file extension
   */
  async pasteImage(savedPath: string) {
    if (!supported) {
      return this._pasteImageFallback(savedPath);
    }

    // todo, test on different platform
    const buf = readImage();
    if (buf) {
      const destImagePath = Uri.file(savedPath + '.png');
      await workspace.fs.writeFile(destImagePath, Uint8Array.from(buf));

      return destImagePath;
    }

    const files = readFiles();

    const imgRE = /\.(jpg|jpeg|png|avif|webp|gif)/;
    if (files?.length) {
      const image = files.find((file) => imgRE.test(file));

      if (image) {
        const ext = image.split('.').pop();
        const destImagePath = Uri.file(`${savedPath}.${ext}`);
        await workspace.fs.copy(Uri.file(image), destImagePath);

        return destImagePath;
      }
    }

    warn('There is not a image in clipboard.');
    return;
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
   * @param savedPath
   */
  _pasteImageFallback(savedPath: string) {
    return new Promise<Uri>((resolve, reject) => {
      const cmd = this.getCommand(savedPath + '.png');
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
          resolve(Uri.file(resultData));
        }
      });

      program.stdout.on('data', (data: Buffer) => {
        resultData += data.toString();
      });
    });
  }
}
