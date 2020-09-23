import path from 'path';
import mustache from 'mustache';
import { getDirFiles, askForNext, error } from '../utils';
import { window } from 'vscode';
import { Command, Commands, command, ICommandParsed } from './common';
import { configs, getConfig, ConfigProperties } from '../configs';
import fs from 'fs-extra';
import dayjs from 'dayjs';

export enum ArticleTypes {
  post = 'post',
  draft = 'draft',
}

@command()
export class CreateArticle extends Command {
  constructor() {
    super(Commands.new, Commands.newDraft, Commands.newPost);
  }

  private async createFileWithTemplate(type: ArticleTypes, template?: string) {
    template = template || type;

    const name = await window.showInputBox({
      value: 'new article',
      prompt: 'Please input new article name',
    });

    const title = (name || '').trim();
    if (!title) {
      return null;
    }

    try {
      const filePath = title.split('.').pop()!;
      await this.createTplFile(filePath, type, template);
    } catch (err) {
      error(`Create failed on [${template}], ${err}`);
    }
  }

  private async createTplFile(filePath: string, type: ArticleTypes, template: string) {
    const filePathInfo = path.parse(filePath + '.md');

    const typeFolder = configs.paths[type];

    await fs.ensureDir(typeFolder);

    const createFilePath = path.join(typeFolder, filePathInfo.dir, filePathInfo.base);

    if (
      (await fs.pathExists(createFilePath)) &&
      !(await askForNext('Whether replace exist file?'))
    ) {
      return null;
    }

    const tplPath = path.join(configs.paths.scaffold, template + '.md');
    const tpl = await fs.readFile(tplPath, { encoding: 'utf-8' });

    const result = mustache.render(tpl, {
      title: filePathInfo.name,
      date: dayjs().format(getConfig(ConfigProperties.generateTimeFormat)),
    });

    // ensure file dir
    await fs.ensureDir(path.join(typeFolder, filePathInfo.dir));

    await fs.writeFile(createFilePath, result, { encoding: 'utf-8' });

    await this.createResourceDir(path.join(typeFolder, filePathInfo.dir, filePathInfo.name));
  }

  private async createResourceDir(fileAssetPath: string) {
    const hexoConf = await configs.hexoConfig();
    if (hexoConf && hexoConf.post_asset_folder && !(await fs.pathExists(fileAssetPath))) {
      await fs.mkdir(fileAssetPath);
    }
  }

  async execute(cmd: ICommandParsed) {
    // command from commandPalette
    if (!cmd.args[0]) {
      const items = await getDirFiles(configs.paths.scaffold);

      const file = await window.showQuickPick(items.map((i) => i.substr(0, i.length - 3)));

      if (file) {
        const isDraft = file === 'draft';

        await this.createFileWithTemplate(isDraft ? ArticleTypes.draft : ArticleTypes.post, file);
      }
    } else {
      await this.createFileWithTemplate(cmd.args[0] as ArticleTypes);
    }
  }
}
