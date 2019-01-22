import * as path from 'path';
import * as mustache from 'mustache';
import { getDirFiles, askForNext, error } from '../utils';
import { window } from 'vscode';
import { Command, Commands, command, ICommandParsed } from './common';
import { configs } from '../configs';
import * as fs from 'fs-extra';

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
      await this.createResourceDir(title);
      await this.createTplFile(title, type, template);
    } catch (err) {
      error(`Create failed on [${template}], ${err}`);
    }
  }

  private async createTplFile(filename: string, type: ArticleTypes, template: string) {
    const typeFolder = configs.paths[type];

    await fs.ensureDir(typeFolder);

    const createFilePath = path.join(typeFolder, filename + '.md');

    if (
      (await fs.pathExists(createFilePath)) &&
      !(await askForNext('Whether replace exist file?'))
    ) {
      return null;
    }

    const tplPath = path.join(configs.paths.scaffold, template + '.md');
    const tpl = await fs.readFile(tplPath, { encoding: 'utf-8' });

    const result = mustache.render(tpl, {
      title: filename,
      date: new Date().toISOString(),
    });

    await fs.writeFile(createFilePath, result, { encoding: 'utf-8' });
  }

  private async createResourceDir(filename: string) {
    const hexoConf = await configs.hexoConfig();
    const fileAssetPath = path.join(configs.paths.post, filename);
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
