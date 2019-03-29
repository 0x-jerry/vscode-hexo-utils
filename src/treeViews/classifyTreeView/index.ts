import { Commands } from '../../commands';
import { treeView } from '../common';
import { ExtensionContext } from 'vscode';
import { ClassifyTreeView } from './hexoClassifyTreeView';
import { ClassifyTypes } from './hexoClassifyProvider';

@treeView()
export class TagsClassifyTreeView extends ClassifyTreeView {
  constructor(context: ExtensionContext) {
    super(context, 'hexo.tags', ClassifyTypes.tag);
    this.registerRefreshCmd(Commands.refreshTags);
  }
}

@treeView()
export class CategoriesClassifyTreeView extends ClassifyTreeView {
  constructor(context: ExtensionContext) {
    super(context, 'hexo.categories', ClassifyTypes.category);
    this.ctx = context;
    this.registerRefreshCmd(Commands.refreshCategories);
  }
}
