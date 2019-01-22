import { workspace } from 'vscode';
import * as path from 'path';
import * as yamljs from 'yamljs';
import * as fs from 'fs-extra';

enum ConfigProperties {
  includeDraft = 'includeDraft',
  resolveMarkdownResource = 'markdown.resource',
}

function getConfig<T>(propName: ConfigProperties, section = 'hexo'): T | undefined {
  const configs = workspace.getConfiguration(section);
  return configs.get<T>(propName);
}

const configs = {
  paths: {
    get scaffold() {
      return path.join(workspace.rootPath!, 'scaffolds');
    },
    get post() {
      return path.join(workspace.rootPath!, 'source', `_posts`);
    },
    get draft() {
      return path.join(workspace.rootPath!, 'source', `_drafts`);
    },
  },
  async hexoConfig() {
    try {
      const hexoConf = await fs.readFile(path.join(workspace.rootPath!, '_config.yml'));
      return yamljs.parse(hexoConf.toString());
    } catch (error) {
      return null;
    }
  },
};

export { getConfig, ConfigProperties, configs };
