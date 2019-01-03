import * as vscode from 'vscode';

enum ConfigProperties {
  pkgManager = 'packageManager',
  includeDraft = 'includeDraft',
}

function getConfig<T>(propName: ConfigProperties, section = 'hexo'): T | undefined {
  const configs = vscode.workspace.getConfiguration(section);
  return configs.get<T>(propName);
}

export { getConfig, ConfigProperties };
