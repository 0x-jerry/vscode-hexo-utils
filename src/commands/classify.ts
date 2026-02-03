import { remove } from '@0x-jerry/utils'
import { isEqual, uniq, uniqWith } from 'lodash-es'
import { window, workspace } from 'vscode'
import {
  HexoMetadataKeys,
  metadataManager,
  toCategoryLabel,
  updateDocumentFrontmatter,
} from '../metadata'
import { ClassifyItem } from '../treeViews/classifyTreeView/hexoClassifyProvider'
import { Command, Commands, command, type ICommandParsed } from './common'

abstract class ClassifyCommand extends Command {
  protected getType(cmd: ICommandParsed, item?: ClassifyItem): HexoMetadataKeys {
    if (cmd.args[0] === 'tags') {
      return HexoMetadataKeys.tags
    }
    if (cmd.args[0] === 'categories') {
      return HexoMetadataKeys.categories
    }
    return (item?.type as unknown as HexoMetadataKeys) || HexoMetadataKeys.tags
  }
}

@command()
export class SelectTags extends ClassifyCommand {
  constructor() {
    super(Commands.selectTags)
  }

  async execute(): Promise<void> {
    const editor = window.activeTextEditor
    const metadataKey = HexoMetadataKeys.tags

    if (!editor) {
      return
    }

    const metadata = await metadataManager.get(editor.document.uri)

    const currentTags = metadata.data.tags || []

    const allTags = await metadataManager.getAvailableValuesByKey<string[]>(metadataKey)

    const items = uniq(allTags.flat())
      .map((tag) => ({
        label: tag,
        picked: currentTags.includes(tag),
      }))
      .sort((a, b) => Number(b.picked) - Number(a.picked))

    const selected = await window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select tags',
    })

    const newSelectedTags = selected?.map((item) => item.label)

    if (!newSelectedTags) {
      return
    }

    await updateDocumentFrontmatter(editor.document, metadataKey, newSelectedTags)
  }
}

@command()
export class SelectCategories extends ClassifyCommand {
  constructor() {
    super(Commands.selectCategories)
  }

  async execute(): Promise<void> {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    const metadataKey = HexoMetadataKeys.categories

    const metadata = await metadataManager.get(editor.document.uri)

    const currentCategories = metadata.data.categories || []

    const allCategories = (
      await metadataManager.getAvailableValuesByKey<string[][]>(metadataKey)
    ).flat()

    const items = uniqWith(allCategories, isEqual)
      .map((category) => ({
        label: toCategoryLabel(category),
        value: category,
        picked: currentCategories.some((c) => isEqual(c, category)),
      }))
      .sort((a, b) => Number(b.picked) - Number(a.picked))

    const selected = await window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select categories',
    })

    const newSelectedCategories = selected?.map((item) => item.value)

    if (!newSelectedCategories) {
      return
    }

    await updateDocumentFrontmatter(editor.document, metadataKey, newSelectedCategories)
  }
}

@command()
export class AddTagOrCategory extends ClassifyCommand {
  constructor() {
    super(Commands.classifyAddTag, Commands.classifyAddCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = cmd.args[0]

    const currentClassifiedName = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'tag' : 'category'

    const newName = await window.showInputBox({
      prompt: `Please input new ${typeLabel} to articles under "${currentClassifiedName}" ${typeLabel}`,
    })

    if (!newName) {
      return
    }

    if (type === HexoMetadataKeys.tags) {
      await this.applyByTag(newName, currentClassifiedName)
    } else {
      await this.applyByCategory(newName, currentClassifiedName)
    }
  }

  async applyByTag(newTag: string, currentGroupedName: string) {
    const grouped = await metadataManager.getGroupedMetadataByTags()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group) {
      return
    }

    let updatedCount = 0

    for (const metadata of group.items) {
      if (metadata.data.tags?.includes(newTag)) {
        continue
      }

      updatedCount++

      const newTags = uniq([...(metadata.data.tags || []), newTag])

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.tags, newTags)
    }

    if (updatedCount > 0) {
      window.showInformationMessage(`Added new tag "${newTag}" to ${updatedCount} files`)
    } else {
      window.showInformationMessage(`All files already have tag "${newTag}"`)
    }
  }

  /**
   *
   * @param newCategory example.: `c1` or `c1 / c2`
   */
  async applyByCategory(newCategory: string, currentGroupedName: string) {
    const newNormalizedCategory = newCategory
      .split('/')
      .map((c) => c.trim())
      .filter(Boolean)

    const grouped = await metadataManager.getGroupedMetadataByCategories()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group) {
      return
    }

    let updatedCount = 0

    for (const metadata of group.items) {
      if (metadata.data.categories?.some((c) => isEqual(c, newNormalizedCategory))) {
        continue
      }

      updatedCount++

      const newCategories = uniq([...(metadata.data.categories || []), newNormalizedCategory])

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.categories, newCategories)
    }

    const categoryLabel = toCategoryLabel(newNormalizedCategory)

    if (updatedCount > 0) {
      window.showInformationMessage(
        `Added new category "${categoryLabel}" to ${updatedCount} files`,
      )
    } else {
      window.showInformationMessage(`All files already have tag "${categoryLabel}"`)
    }
  }
}

@command()
export class RenameTagOrCategory extends ClassifyCommand {
  constructor() {
    super(Commands.classifyRenameTag, Commands.classifyRenameCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = cmd.args[0]

    const currentClassifiedName = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'tag' : 'category'

    const newName = await window.showInputBox({
      value: currentClassifiedName,
      prompt: `Please input new ${typeLabel}`,
    })

    if (!newName || newName === currentClassifiedName) {
      return
    }

    if (type === HexoMetadataKeys.tags) {
      await this.applyByTag(newName, currentClassifiedName)
    } else {
      await this.applyByCategory(newName, currentClassifiedName)
    }

    return
  }

  async applyByTag(newTag: string, currentGroupedName: string) {
    const grouped = await metadataManager.getGroupedMetadataByTags()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group?.items.length) {
      return
    }

    for (const metadata of group.items) {
      const newTags = [...(metadata.data.tags || []), newTag]
      remove(newTags, currentGroupedName)

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.tags, newTags)
    }

    const msg = `Renamed ${currentGroupedName} to ${newTag} in ${group.items.length} files`
    window.showInformationMessage(msg)
  }

  /**
   *
   * @param newCategory example.: `c1` or `c1 / c2`
   */
  async applyByCategory(newCategory: string, currentGroupedName: string) {
    const newNormalizedCategory = newCategory
      .split('/')
      .map((c) => c.trim())
      .filter(Boolean)

    const grouped = await metadataManager.getGroupedMetadataByCategories()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group?.items.length) {
      return
    }

    const currentNormalizedCategory = currentGroupedName
      .split('/')
      .map((n) => n.trim())
      .filter(Boolean)

    for (const metadata of group.items) {
      const newCategories = [...(metadata.data.categories || []), newNormalizedCategory]
      remove(newCategories, (c) => isEqual(c, currentNormalizedCategory))

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.categories, newCategories)
    }

    const msg = `Renamed ${currentGroupedName} to ${toCategoryLabel(newNormalizedCategory)} in ${group.items.length} files`
    window.showInformationMessage(msg)
  }
}

@command()
export class RemoveTagOrCategory extends ClassifyCommand {
  constructor() {
    super(Commands.classifyDeleteTag, Commands.classifyDeleteCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = cmd.args[0]

    const currentClassifiedName = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'tag' : 'category'

    const confirm = await window.showWarningMessage(
      `Are you sure you want to delete ${typeLabel} "${currentClassifiedName}" from all files?`,
      { modal: true },
      'Delete',
    )

    if (confirm !== 'Delete') {
      return
    }

    if (type === HexoMetadataKeys.tags) {
      await this.applyByTag(currentClassifiedName)
    } else {
      await this.applyByCategory(currentClassifiedName)
    }

    return
  }

  async applyByTag(currentGroupedName: string) {
    const grouped = await metadataManager.getGroupedMetadataByTags()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group?.items.length) {
      return
    }

    for (const metadata of group.items) {
      const newTags = [...(metadata.data.tags || [])]
      remove(newTags, currentGroupedName)

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.tags, newTags)
    }

    const msg = `Deleted tag ${currentGroupedName} from ${group.items.length} files`
    window.showInformationMessage(msg)
  }

  /**
   *
   * @param newCategory example.: `c1` or `c1 / c2`
   */
  async applyByCategory(currentGroupedName: string) {
    const grouped = await metadataManager.getGroupedMetadataByCategories()

    const group = grouped.find((g) => g.name === currentGroupedName)

    if (!group?.items.length) {
      return
    }

    const currentNormalizedCategory = currentGroupedName
      .split('/')
      .map((n) => n.trim())
      .filter(Boolean)

    for (const metadata of group.items) {
      const newCategories = [...(metadata.data.categories || [])]
      remove(newCategories, (c) => isEqual(c, currentNormalizedCategory))

      const doc = await workspace.openTextDocument(metadata.uri)
      await updateDocumentFrontmatter(doc, HexoMetadataKeys.categories, newCategories)
    }

    const msg = `Deleted category ${currentGroupedName} from ${group.items.length} files`
    window.showInformationMessage(msg)
  }
}
