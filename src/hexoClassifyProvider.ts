import * as vscode from 'vscode';
import * as path from 'path';
import { getDirFiles, isHexoProject, warn } from './utils';
import { Commands } from './commands/common';
import { HexoMetadataUtils, IHexoMetadata } from './hexoMetadata';
import { getConfig, ConfigProperties } from './configs';
import * as yarmljs from 'yamljs';
import * as fs from 'fs-extra';

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

    const postsPath = (await getDirFiles(postFolder))
      .filter((p) => p.endsWith('.md'))
      .map((p) => path.join(postFolder, p));

    let draftsPath: string[] = [];

    if (include) {
      draftsPath = (await getDirFiles(draftFolder)).map((p) => path.join(draftFolder, p));
    }

    const filesPath = postsPath.concat(include ? draftsPath : []);

    const filesData: IHexoMetadata[] = [];

    for (let i = 0; i < filesPath.length; i++) {
      const filePath = filesPath[i];
      const content = await fs.readFile(filePath, { encoding: 'utf-8' });
      // /---(data)---/ => $1 === data
      const yamlReg = /^---((.|\n|\r)+)---$/m;

      const yamlData = yamlReg.exec(content);

      if (yamlData && yamlData[1]) {
        try {
          const metadata = yarmljs.parse(yamlData[1]) as IHexoMetadata;
          filesData.push({
            ...metadata,
            filePath,
          });
        } catch (err) {
          warn(`Parse [ ${filePath} ] metadata error: ${err}`);
        }
      }
    }

    const items: ClassifyItem[] = [];
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label);

      if (classify) {
        classify.files.forEach((f) => {
          // Avoid duplicate classify files
          if (items.find((i) => i.resourceUri!.fsPath === f)) {
            return;
          }

          const item = new ClassifyItem(path.basename(f), this.type, f);
          items.push(item);
        });
      }
    } else {
      this._hexoMetadataUtils = new HexoMetadataUtils(filesData);
      this._hexoMetadataUtils[this.type].forEach((t) => {
        const item = new ClassifyItem(
          t.name,
          this.type,
          undefined,
          vscode.TreeItemCollapsibleState.Collapsed,
        );
        items.push(item);
      });
    }

    return items.sort((a, b) => (a.label! < b.label! ? -1 : 1));
  }
}

export class ClassifyItem extends vscode.TreeItem {
  constructor(
    label: string,
    type: ClassifyTypes,
    uri?: string,
    collapsibleState?: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    const resourcesFolder = path.join(__dirname, '..', 'resources');

    this.iconPath = uri
      ? vscode.ThemeIcon.File
      : {
          dark: path.join(resourcesFolder, `icon-${type}.svg`),
          light: path.join(resourcesFolder, `icon-${type}.svg`),
        };

    if (uri) {
      this.resourceUri = vscode.Uri.file(uri);

      this.command = {
        title: 'open',
        command: Commands.open,
        arguments: [uri],
      };
    }
  }
}
