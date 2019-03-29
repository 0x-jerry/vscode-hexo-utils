import { workspace } from 'vscode';
import * as path from 'path';
import * as yamljs from 'yamljs';
import * as fs from 'fs-extra';

enum ConfigProperties {
  SECTION = 'hexo',
  includeDraft = 'includeDraft',
  resolveMarkdownResource = 'markdown.resource',
  hexoRoot = 'hexoProjectRoot',
}

function getConfig<T>(propName: ConfigProperties, section = 'hexo'): T | undefined {
  const configs = workspace.getConfiguration(section);
  return configs.get<T>(propName);
}

const configs = {
  get hexoRoot() {
    const folders = workspace.workspaceFolders;
    if (folders) {
      return path.join(folders[0].uri.fsPath, getConfig<string>(ConfigProperties.hexoRoot)!);
    }

    return undefined;
  },
  paths: {
    get scaffold() {
      return path.join(configs.hexoRoot!, 'scaffolds');
    },
    get post() {
      return path.join(configs.hexoRoot!, 'source', `_posts`);
    },
    get draft() {
      return path.join(configs.hexoRoot!, 'source', `_drafts`);
    },
  },
  async hexoConfig() {
    try {
      const hexoConf = await fs.readFile(path.join(configs.hexoRoot!, '_config.yml'));
      return yamljs.parse(hexoConf.toString());
    } catch (error) {
      return null;
    }
  },
  project: {
    resource: path.join(__dirname, '..', 'resources'),
  },
};

export { getConfig, ConfigProperties, configs };
