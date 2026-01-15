import { Range, type TextEditor, window, workspace, Uri, commands, WorkspaceEdit } from 'vscode'
import { HexoMetadataKeys, HexoMetadataUtils } from '../hexoMetadata'
import { Command, Commands, command, type ICommandParsed } from './common'
import { ClassifyItem } from '../treeViews/classifyTreeView/hexoClassifyProvider'
import {
  updateFrontMatter,
  prepareCategoriesValue,
  prepareTagsValue,
  parseFrontMatter
} from '../utils'

export abstract class ClassifyCommand extends Command {
  protected getType(cmd: ICommandParsed, item?: ClassifyItem): HexoMetadataKeys {
    if (cmd.args[0] === 'tags') {
      return HexoMetadataKeys.tags
    }
    if (cmd.args[0] === 'categories') {
      return HexoMetadataKeys.categories
    }
    return (item?.type as unknown as HexoMetadataKeys) || HexoMetadataKeys.tags
  }

  protected getCurrentValues(editor: TextEditor, key: string): string[] {
    const text = editor.document.getText()
    const data = parseFrontMatter(text) || {}

    const rawVal =
      data[key] ||
      (key === HexoMetadataKeys.categories
        ? data.category
        : key === HexoMetadataKeys.tags
          ? data.tag
          : undefined)

    if (!rawVal) return []

    if (Array.isArray(rawVal)) {
      if (key === HexoMetadataKeys.categories) {
        return rawVal.map((v) => (Array.isArray(v) ? v.join(' / ') : String(v)))
      }
      return rawVal.map((v) => String(v))
    }

    if (typeof rawVal === 'string') {
      return [rawVal]
    }

    return []
  }

  protected async updateFile(uri: Uri, key: string, values: string[]) {
    const document = await workspace.openTextDocument(uri)
    const text = document.getText()

    const preparedValue =
        key === HexoMetadataKeys.categories
            ? prepareCategoriesValue(values)
            : prepareTagsValue(values)

    const newText = updateFrontMatter(text, key, preparedValue)

    if (newText !== text) {
      const edit = new WorkspaceEdit()
      edit.replace(
        uri,
        new Range(0, 0, document.lineCount, document.lineAt(document.lineCount - 1).range.end.character),
        newText,
      )
      await workspace.applyEdit(edit)
      await document.save()
    }
  }

  protected async updateEditor(editor: TextEditor, key: string, values: string[]) {
    // 复用 updateFile 的逻辑
    await this.updateFile(editor.document.uri, key, values)
  }

  protected normalizeCategory(val: string): string {
    let parts: string[] = []
    const trimmedVal = val.trim()
    if (trimmedVal.startsWith('[') && trimmedVal.endsWith(']')) {
      const content = trimmedVal.slice(1, -1)
      parts = content.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
    } else {
      parts = val.split('/').map((s) => s.trim())
    }
    return parts.filter(Boolean).join(' / ')
  }
}

@command()
export class SelectTags extends ClassifyCommand {
  constructor() {
    super(Commands.selectTags)
  }

  async execute(): Promise<void> {
    const editor = window.activeTextEditor
    if (!editor) {
      return
    }

    const currentTags = this.getCurrentValues(editor, HexoMetadataKeys.tags)
    const allTags = await HexoMetadataUtils.getTags()

    const items = allTags
      .map((tag) => ({
        label: tag,
        picked: currentTags.includes(tag),
      }))
      .sort((a, b) => Number(b.picked) - Number(a.picked))

    const selected = await window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select tags',
    })

    if (selected) {
      this.updateEditor(
        editor,
        HexoMetadataKeys.tags,
        selected.map((item) => item.label),
      )
    }
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

    const currentCategories = this.getCurrentValues(editor, HexoMetadataKeys.categories)
    const allCategories = await HexoMetadataUtils.getCategories()

    const items = allCategories
      .map((category) => ({
        label: category,
        picked: currentCategories.includes(category),
      }))
      .sort((a, b) => Number(b.picked) - Number(a.picked))

    const selected = await window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select categories',
    })

    if (selected) {
      this.updateEditor(
        editor,
        HexoMetadataKeys.categories,
        selected.map((item) => item.label),
      )
    }
  }
}

@command()
export class ClassifyAdd extends ClassifyCommand {
  constructor() {
    super(Commands.classifyAddTag, Commands.classifyAddCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = this.getType(cmd, item)
    const oldName = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'tag' : 'category'

    let newName = await window.showInputBox({
      prompt: `Add new ${typeLabel} to articles under "${oldName}"`,
    })

    if (!newName) {
      return
    }

    if (type === HexoMetadataKeys.categories) {
      newName = this.normalizeCategory(newName)
    }

    const utils = await HexoMetadataUtils.get()
    const classifies = type === HexoMetadataKeys.tags ? utils.tags : utils.categories
    const classify = classifies.find((c) => c.name === oldName)

    if (!classify) {
      return
    }

    let updatedCount = 0

    for (const metadata of classify.files) {
      const file = metadata.filePath
      const values = type === HexoMetadataKeys.tags ? [...metadata.tags] : [...metadata.categories]

      if (!values.includes(newName)) {
        values.push(newName)
        await this.updateFile(file, type, values)
        updatedCount++
      }
    }

    if (updatedCount > 0) {
      window.showInformationMessage(`Added ${typeLabel} "${newName}" to ${updatedCount} files`)
      commands.executeCommand(Commands.refresh)
    } else {
      window.showInformationMessage(`All files already have ${typeLabel} "${newName}"`)
    }
  }
}

@command()
export class ClassifyRename extends ClassifyCommand {
  constructor() {
    super(Commands.classifyRenameTag, Commands.classifyRenameCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = this.getType(cmd, item)
    const oldName = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'Tag' : 'Category'

    let newName = await window.showInputBox({
      value: oldName,
      prompt: `Rename ${typeLabel}`,
    })

    if (!newName || newName === oldName) {
      return
    }

    if (type === HexoMetadataKeys.categories) {
      newName = this.normalizeCategory(newName)
      if (newName === oldName) {
        return
      }
    }

    const utils = await HexoMetadataUtils.get()
    const classifies = type === HexoMetadataKeys.tags ? utils.tags : utils.categories
    const classify = classifies.find((c) => c.name === oldName)

    if (!classify) {
      return
    }

    for (const metadata of classify.files) {
      const file = metadata.filePath
      const values = type === HexoMetadataKeys.tags ? [...metadata.tags] : [...metadata.categories]
      const index = values.indexOf(oldName)
      if (index !== -1) {
        // If newName already exists, just remove oldName, else replace it
        if (values.includes(newName)) {
          values.splice(index, 1)
        } else {
          values[index] = newName
        }
        await this.updateFile(file, type, values)
      }
    }

    window.showInformationMessage(`Renamed ${oldName} to ${newName} in ${classify.files.length} files`)
    commands.executeCommand(Commands.refresh)
  }
}

@command()
export class ClassifyDelete extends ClassifyCommand {
  constructor() {
    super(Commands.classifyDeleteTag, Commands.classifyDeleteCategory)
  }

  async execute(cmd: ICommandParsed, item: ClassifyItem): Promise<void> {
    if (!(item instanceof ClassifyItem) || !item.label) {
      return
    }

    const type = this.getType(cmd, item)
    const name = typeof item.label === 'string' ? item.label : item.label.label
    const typeLabel = type === HexoMetadataKeys.tags ? 'tag' : 'category'

    const confirm = await window.showWarningMessage(
      `Are you sure you want to delete ${typeLabel} "${name}" from all files?`,
      { modal: true },
      'Delete',
    )

    if (confirm !== 'Delete') {
      return
    }

    const utils = await HexoMetadataUtils.get()
    const classifies = type === HexoMetadataKeys.tags ? utils.tags : utils.categories
    const classify = classifies.find((c) => c.name === name)

    if (!classify) {
      return
    }

    for (const metadata of classify.files) {
      const file = metadata.filePath
      const values = type === HexoMetadataKeys.tags ? [...metadata.tags] : [...metadata.categories]
      const index = values.indexOf(name)
      if (index !== -1) {
        values.splice(index, 1)
        await this.updateFile(file, type, values)
      }
    }

    window.showInformationMessage(`Deleted ${typeLabel} ${name} from ${classify.files.length} files`)
    commands.executeCommand(Commands.refresh)
  }
}
