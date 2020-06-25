import * as path from 'path';
import { isHexoProject, getMDFiles, getMDFileMetadata } from '../../utils';
import { Commands } from '../../commands/common';
import { HexoMetadataUtils, IHexoMetadata } from '../../hexoMetadata';
import { getConfig, ConfigProperties, configs } from '../../configs';

import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  Uri,
} from 'vscode';

export enum ClassifyTypes {
  category = 'categories',
  tag = 'tags',
}

export class HexoClassifyProvider implements TreeDataProvider<ClassifyItem> {
  private _onDidChangeTreeData = new EventEmitter<ClassifyItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type: ClassifyTypes = ClassifyTypes.category;

  private _hexoMetadataUtils?: HexoMetadataUtils;

  constructor(type: ClassifyTypes) {
    this.type = type;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ClassifyItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: ClassifyItem): Promise<ClassifyItem[]> {
    if (!isHexoProject()) {
      return [];
    }

    const postFolder = configs.paths.post;
    const draftFolder = configs.paths.draft;

    const include = getConfig<boolean>(ConfigProperties.includeDraft);

    const postsPath = (await getMDFiles(postFolder)).map((p) => path.join(postFolder, p));

    let draftsPath: string[] = [];

    if (include) {
      draftsPath = (await getMDFiles(draftFolder)).map((p) => path.join(draftFolder, p));
    }

    const filesPath = postsPath.concat(include ? draftsPath : []);

    const filesData: IHexoMetadata[] = [];

    for (const filePath of filesPath) {
      const metadata = (await getMDFileMetadata(filePath))!;

      filesData.push(metadata);
    }

    const items: ClassifyItem[] = [];
    if (element && this._hexoMetadataUtils) {
      const classify = this._hexoMetadataUtils[this.type].find((t) => t.name === element.label);

      if (classify) {
        classify.files.forEach((metadata) => {
          const isDraft = include && draftsPath.findIndex((p) => p === metadata.filePath) !== -1;

          const name = path.relative(isDraft ? draftFolder : postFolder, metadata.filePath);

          const item = new ClassifyItem(name, this.type, metadata.filePath);
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
          TreeItemCollapsibleState.Collapsed,
        );
        items.push(item);
      });
    }

    return items;
  }
}

export class ClassifyItem extends TreeItem {
  constructor(
    label: string,
    type: ClassifyTypes,
    uri?: string,
    collapsibleState?: TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    const resourcesFolder = configs.project.resource;

    this.iconPath = uri
      ? ThemeIcon.File
      : {
          dark: path.join(resourcesFolder, `icon-${type}.svg`),
          light: path.join(resourcesFolder, `icon-${type}.svg`),
        };

    if (uri) {
      this.resourceUri = Uri.file(uri);

      this.command = {
        title: 'open',
        command: Commands.open,
        arguments: [uri],
      };
    }
  }
}
