import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  ProviderResult,
} from 'vscode';
import path from 'path';
import { Commands } from '../../commands/common';
import { ArticleTypes } from '../../commands/createArticle';
import { isHexoProject, getMDFiles, getMDFileMetadata } from '../../utils';
import { configs, getConfig, ConfigProperties, SortBy } from '../../configs';
import { IHexoMetadata } from '../../hexoMetadata';
import { BaseDispose } from '../common';

export class HexoArticleProvider extends BaseDispose implements TreeDataProvider<ArticleItem> {
  private _onDidChangeTreeData = new EventEmitter<ArticleItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type = ArticleTypes.post;

  private allItems: Map<string, ArticleItem> = new Map();

  constructor(type: ArticleTypes) {
    super();
    this.type = type;
    this.subscribe(this._onDidChangeTreeData);

    this.recalculateItems();
  }

  private recalculateItems() {
    const _dispose = this.onDidChangeTreeData(() => {
      this.allItems = new Map();
    });

    this.subscribe(_dispose);
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ArticleItem): TreeItem {
    return element;
  }

  getItem(file: string) {
    return this.allItems.get(file);
  }

  getParent(element: ArticleItem): ProviderResult<ArticleItem> {
    return null;
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
      const metadata = (await getMDFileMetadata(filePath))!;
      const item = new ArticleItem(p, path.join(articleRootPath, p), metadata);

      items.push(item);
      this.allItems.set(Uri.parse(filePath).toString(), item);
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

  dispose() {
    // this.
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
      arguments: [this.resourceUri],
    };
  }
}
