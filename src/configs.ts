import * as vscode from 'vscode';

enum ConfigProperties {
  pkgManager = 'packageManager',
}

function configs<T>(propName: ConfigProperties, section = 'hexo'): T | undefined {
  console.log(`hexo: get config: ${section}.${propName}`);
  const configs = vscode.workspace.getConfiguration(section);
  return configs.get<T>(propName);
}

export { configs, ConfigProperties };
