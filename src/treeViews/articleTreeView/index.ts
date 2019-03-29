import { ArticleTreeView } from './hexoArticleTreeView';
import { ArticleTypes, Commands } from '../../commands';
import { treeView, ViewTypes } from '../common';

@treeView()
export class PostArticleTreeView extends ArticleTreeView {
  constructor() {
    super(ViewTypes.post, ArticleTypes.post);
    this.registerRefreshCmd(Commands.refreshPost);
  }
}

@treeView()
export class DraftArticleTreeView extends ArticleTreeView {
  constructor() {
    super(ViewTypes.draft, ArticleTypes.draft);
    this.registerRefreshCmd(Commands.refreshDraft);
  }
}
