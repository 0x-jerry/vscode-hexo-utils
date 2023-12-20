import { Uri, workspace } from 'vscode';
import path from 'path';
import yamljs from 'yamljs';

export enum ConfigProperties {
  SECTION = 'hexo',
  includeDraft = 'includeDraft',
  resolveMarkdownResource = 'markdown.resource',
  hexoRoot = 'hexoProjectRoot',
  sortMethod = 'sortMethod',
  upload = 'upload',
  uploadType = 'uploadType',
  imgChr = 'uploadImgchr',
  tencentOSS = 'uploadTencentOSS',
  generateTimeFormat = 'generateTimeFormat',
  pasteFolderType = 'pasteFolderType',
}

export enum SortBy {
  name = 'name',
  date = 'date',
}

export function getConfig<T>(propName: ConfigProperties, section = 'hexo'): T {
  const configs = workspace.getConfiguration(section);
  return configs.get<T>(propName)!;
}

export const configs = {
  get hexoRoot() {
    const folders = workspace.workspaceFolders;
    if (folders) {
      return Uri.joinPath(folders[0].uri, getConfig<string>(ConfigProperties.hexoRoot)!);
    }

    return undefined;
  },
  paths: {
    get scaffold() {
      return Uri.joinPath(configs.hexoRoot!, 'scaffolds');
    },
    get post() {
      return Uri.joinPath(configs.hexoRoot!, 'source', `_posts`);
    },
    get draft() {
      return Uri.joinPath(configs.hexoRoot!, 'source', `_drafts`);
    },
  },
  async hexoConfig() {
    try {
      const configUri = Uri.joinPath(configs.hexoRoot!, '_config.yml');
      const hexoConf = await workspace.fs.readFile(configUri);
      return yamljs.parse(hexoConf.toString());
    } catch (error) {
      return null;
    }
  },
  project: {
    resource: path.join(__dirname, '..', 'resources'),
  },
};

export const isDev = process.env.NODE_ENV === 'development';
