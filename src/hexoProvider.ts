import * as vscode from 'vscode';
import { isHexoProject } from './utils/utils';
import * as path from 'path';
import { Commands } from './commands/common';
import { getDirFiles } from './utils/fs';
import { ArticleTypes } from './commands/createArticle';

export class HexoArticleProvider implements vscode.TreeDataProvider<ArticleItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ArticleItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  type = ArticleTypes.post;

  constructor(type: ArticleTypes) {
    this.type = type;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ArticleItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: ArticleItem): Promise<ArticleItem[]> {
    const items: ArticleItem[] = [];
    if (!isHexoProject()) {
      return items;
    }

    const postsPath = path.join(vscode.workspace.rootPath as string, 'source', `_${this.type}s`);

    const paths = await getDirFiles(postsPath);

    paths.forEach((p) => {
      if (/\.md$/.test(p)) {
        items.push(new ArticleItem(p, path.join(postsPath, p)));
      }
    });

    return items.sort((a, b) => (a.label! < b.label! ? -1 : 1));
  }
}

export class ArticleItem extends vscode.TreeItem {
  iconPath = vscode.ThemeIcon.File;

  constructor(label: string, uri: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);

    this.resourceUri = vscode.Uri.file(uri);
    this.command = {
      title: 'open',
      command: Commands.open,
      arguments: [uri],
    };
  }
}
