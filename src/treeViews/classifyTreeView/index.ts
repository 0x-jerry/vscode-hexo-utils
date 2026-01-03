import { Commands } from '../../commands'
import { treeView, ViewTypes } from '../common'
import { ClassifyTypes } from './hexoClassifyProvider'
import { ClassifyTreeView } from './hexoClassifyTreeView'

@treeView()
export class TagsClassifyTreeView extends ClassifyTreeView {
  constructor() {
    super(ViewTypes.tags, ClassifyTypes.tag, {
      showCollapseAll: true,
    })
    this.registerRefreshCmd(Commands.refreshTags)
  }
}

@treeView()
export class CategoriesClassifyTreeView extends ClassifyTreeView {
  constructor() {
    super(ViewTypes.categories, ClassifyTypes.category, {
      showCollapseAll: true,
    })
    this.registerRefreshCmd(Commands.refreshCategories)
  }
}
