import * as vscode from 'vscode';

enum ConfigProperties {
  pkgManager = 'packageManger',
}

function configs<T>(propName: string, section = 'hexo'): T | undefined {
  const configs = vscode.workspace.getConfiguration(section);
  return configs.get<T>(propName);
}

export { configs, ConfigProperties };
