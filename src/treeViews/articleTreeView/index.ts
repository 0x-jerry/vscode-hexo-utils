import { ArticleTreeView } from './hexoArticleTreeView';
import { ArticleTypes, Commands } from '../../commands';
import { treeView, ViewTypes } from '../common';
import { mineTypePrefix } from './const';

@treeView()
export class PostArticleTreeView extends ArticleTreeView {
  constructor() {
    super(ViewTypes.post, ArticleTypes.post, {
      dropMimeType: mineTypePrefix + ArticleTypes.draft,
    });
    this.registerRefreshCmd(Commands.refreshPost);
  }
}

@treeView()
export class DraftArticleTreeView extends ArticleTreeView {
  constructor() {
    super(ViewTypes.draft, ArticleTypes.draft, {
      dropMimeType: mineTypePrefix + ArticleTypes.post,
    });
    this.registerRefreshCmd(Commands.refreshDraft);
  }
}
