import { treeView, ViewTypes } from '../common'
import { HexoTocTreeView } from './hexoTocTreeView'

@treeView()
export class TocTreeView extends HexoTocTreeView {
  constructor() {
    super(ViewTypes.toc)
  }
}
