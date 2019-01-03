import * as vscode from 'vscode';
import * as path from 'path';
import { isHexoProject, getDirFiles, fsRead } from './utils';
import { HexoCommands } from './extension';
import { HexoMetadataUtils, IHexoMetadata } from './hexoMetadata';
import { getConfig, ConfigProperties } from './configs';
import * as yarmljs from 'yamljs';

export enum ClassifyTypes {
  category = 'categories',
  tag = 'tags',
}

export class HexoClassifyProvider implements vscode.TreeDataProvider<ClassifyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ClassifyItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type: ClassifyTypes = ClassifyTypes.category;

  private _hexoMetadataUtils?: HexoMetadataUtils;

  constructor(type: ClassifyTypes) {
    this.type = type;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ClassifyItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: ClassifyItem): Promise<ClassifyItem[]> {
    if (!isHexoProject()) {
      return [];
    }

    const postFolder = path.join(vscode.workspace.rootPath as string, 'source', `_posts`);
    const draftFolder = path.join(vscode.workspace.rootPath as string, 'source', `_drafts`);

    const include = getConfig<boolean>(ConfigProperties.includeDraft);

    const postsPath = (await getDirFiles(postFolder)).map((p) => path.join(postFolder, p));
    let draftsPath: string[] = [];

    if (include) {
      draftsPath = (await getDirFiles(draftFolder)).map((p) => path.join(draftFolder, p));
    }

    const filesPath = postsPath.concat(include ? draftsPath : []);

    const filesData: IHexoMetadata[] = [];

    for (let i = 0; i < filesPath.length; i++) {
      const filePath = filesPath[i];
      const content = (await fsRead(filePath)) as string;
      // /---(data)---/ => $1 === data
      const yamlReg = /^---((.|\r\n|\r|\n)+)---$/m;

      const yamlData = yamlReg.exec(content);

      if (yamlData && yamlData[1]) {
        const metadata = yarmljs.parse(yamlData[1]) as IHexoMetadata;
        filesData.push({
          ...metadata,
          filePath,
        });
      }
    }

    const items: ClassifyItem[] = [];
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label);

      if (classify) {
        classify.files.forEach((f) => {
          const item = new ClassifyItem(path.basename(f), f);
          items.push(item);
        });
      }
    } else {
      this._hexoMetadataUtils = new HexoMetadataUtils(filesData);
      this._hexoMetadataUtils[this.type].forEach((t) => {
        const item = new ClassifyItem(t.name, undefined, vscode.TreeItemCollapsibleState.Collapsed);
        items.push(item);
      });
    }

    return items;
  }
}

export class ClassifyItem extends vscode.TreeItem {
  constructor(label: string, uri?: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);

    this.iconPath = uri ? vscode.ThemeIcon.File : vscode.ThemeIcon.Folder;

    if (uri) {
      this.resourceUri = vscode.Uri.file(uri);

      this.command = {
        title: 'open',
        command: HexoCommands.open,
        arguments: [uri],
      };
    }
  }
}
