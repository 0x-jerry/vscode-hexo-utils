import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';
import * as path from 'path';
import { Commands } from '../../commands/common';
import { ArticleTypes } from '../../commands/createArticle';
import { isHexoProject, getMDFiles, getMDFileMetadata } from '../../utils';
import { configs, getConfig, ConfigProperties, SortBy } from '../../configs';
import { IHexoMetadata } from '../../hexoMetadata';

export class HexoArticleProvider implements TreeDataProvider<ArticleItem> {
  private _onDidChangeTreeData = new EventEmitter<ArticleItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type = ArticleTypes.post;

  constructor(type: ArticleTypes) {
    this.type = type;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ArticleItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: ArticleItem): Promise<ArticleItem[]> {
    const items: ArticleItem[] = [];
    if (!isHexoProject()) {
      return items;
    }

    const articleRootPath =
      this.type === ArticleTypes.draft ? configs.paths.draft : configs.paths.post;

    const paths = await getMDFiles(articleRootPath);

    for (const p of paths) {
      const filePath = path.join(articleRootPath, p);
      const metadata = await getMDFileMetadata(filePath);
      items.push(new ArticleItem(p, path.join(articleRootPath, p), metadata));
    }

    return items.sort((a, b) => {
      const sortMethod = <SortBy>getConfig(ConfigProperties.sortMethod);
      switch (sortMethod) {
        case SortBy.name:
          return a.label! < b.label! ? -1 : 1;
        case SortBy.date:
          return a.metadata.date! < b.metadata.date! ? 1 : -1;

        default:
          return a.label! < b.label! ? -1 : 1;
      }
    });
  }
}

export class ArticleItem extends TreeItem {
  iconPath = ThemeIcon.File;
  metadata: IHexoMetadata;

  constructor(
    label: string,
    uri: string,
    metadata: IHexoMetadata,
    collapsibleState?: TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.metadata = metadata;

    this.resourceUri = Uri.file(uri);
    this.command = {
      title: 'open',
      command: Commands.open,
      arguments: [uri],
    };
  }
}
