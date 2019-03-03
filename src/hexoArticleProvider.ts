import {
  TreeDataProvider,
  EventEmitter,
  TreeItem,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
} from 'vscode';
import * as path from 'path';
import { Commands } from './commands/common';
import { ArticleTypes } from './commands/createArticle';
import { isHexoProject, getMDFiles } from './utils';
import { configs } from './configs';

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

    paths.forEach((p) => {
      items.push(new ArticleItem(p, path.join(articleRootPath, p)));
    });

    return items.sort((a, b) => (a.label! < b.label! ? -1 : 1));
  }
}

export class ArticleItem extends TreeItem {
  iconPath = ThemeIcon.File;

  constructor(label: string, uri: string, collapsibleState?: TreeItemCollapsibleState) {
    super(label, collapsibleState);

    this.resourceUri = Uri.file(uri);
    this.command = {
      title: 'open',
      command: Commands.open,
      arguments: [uri],
    };
  }
}
