import { ArticleTreeView } from './hexoArticleTreeView';
import { ArticleTypes, Commands } from '../../commands';
import { treeView } from '../common';
import { ExtensionContext } from 'vscode';

@treeView()
export class PostArticleTreeView extends ArticleTreeView {
  constructor(context: ExtensionContext) {
    super(context, 'hexo.post', ArticleTypes.post);
    this.registerRefreshCmd(Commands.refreshPost);
  }
}

@treeView()
export class DraftArticleTreeView extends ArticleTreeView {
  constructor(context: ExtensionContext) {
    super(context, 'hexo.draft', ArticleTypes.draft);
    this.ctx = context;
    this.registerRefreshCmd(Commands.refreshDraft);
  }
}
