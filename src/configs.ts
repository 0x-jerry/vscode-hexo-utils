import { workspace } from 'vscode';
import * as path from 'path';

enum ConfigProperties {
  includeDraft = 'includeDraft',
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
};

export { getConfig, ConfigProperties, configs };
