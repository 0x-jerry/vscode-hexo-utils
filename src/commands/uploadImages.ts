import path from 'node:path'
import { window, Range, ProgressLocation } from 'vscode'
import { Command, command, Commands } from './common'
import { upload } from '../uploader/uploader'
import { error, info } from '../utils'
import fs from 'node:fs'

@command()
export class UploadImages extends Command {
  constructor() {
    super(Commands.uploadImages)
  }

  async execute(): Promise<void> {
    const editor = window.activeTextEditor
    if (!editor || editor.document.languageId !== 'markdown') {
      return
    }

    const document = editor.document
    const text = document.getText()

    // Match ![alt](path)
    const mdImageReg = /!\[(.*?)\]\((.*?)\)/g
    // Match <img src="path" ...>
    const htmlImageReg = /<img.*?src="(.*?)".*?>/g

    const matches: { range: Range; localPath: string; fullMatch: string }[] = []

    let match: RegExpExecArray | null

    // Find Markdown images
    while ((match = mdImageReg.exec(text)) !== null) {
      const matchIndex = match.index
      // Skip if the match is inside an HTML comment
      const beforeText = text.slice(0, matchIndex)
      if (beforeText.lastIndexOf('<!--') > beforeText.lastIndexOf('-->')) {
        continue
      }

      let localPath = match[2].trim()
      // Handle ![alt](path "title")
      if (localPath.includes(' ')) {
        localPath = localPath.split(' ')[0]
      }

      if (this.isLocalPath(localPath)) {
        const startPos = document.positionAt(match.index)
        const endPos = document.positionAt(match.index + match[0].length)
        matches.push({
          range: new Range(startPos, endPos),
          localPath,
          fullMatch: match[0],
        })
      }
    }

    // Find HTML images
    while ((match = htmlImageReg.exec(text)) !== null) {
      const matchIndex = match.index
      // Skip if the match is inside an HTML comment
      const beforeText = text.slice(0, matchIndex)
      if (beforeText.lastIndexOf('<!--') > beforeText.lastIndexOf('-->')) {
        continue
      }

      const localPath = match[1]
      if (this.isLocalPath(localPath)) {
        const startPos = document.positionAt(match.index)
        const endPos = document.positionAt(match.index + match[0].length)
        matches.push({
          range: new Range(startPos, endPos),
          localPath,
          fullMatch: match[0],
        })
      }
    }

    if (matches.length === 0) {
      info('No local images found.')
      return
    }

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: `Uploading ${matches.length} images...`,
        cancellable: true,
      },
      async (progress, token) => {
        const results: { range: Range; newText: string }[] = []

        for (let i = 0; i < matches.length; i++) {
          if (token.isCancellationRequested) {
            break
          }

          const m = matches[i]
          progress.report({ message: `Uploading ${i + 1}/${matches.length}: ${m.localPath}`, increment: (1 / matches.length) * 100 })

          try {
            const absolutePath = this.resolvePath(m.localPath, document.uri.fsPath)
            if (fs.existsSync(absolutePath)) {
              const url = await upload(absolutePath, true)
              if (url) {
                let newText = ''
                if (m.fullMatch.startsWith('![')) {
                  // Markdown
                  const alt = m.fullMatch.match(/!\[(.*?)\]/)?.[1] || ''
                  newText = `![${alt}](${url}) <!-- original: ${m.fullMatch} -->`
                } else {
                  // HTML
                  newText = m.fullMatch.replace(m.localPath, url) + ` <!-- original: ${m.fullMatch} -->`
                }
                results.push({ range: m.range, newText })
              }
            } else {
              error(`Image file not found: ${absolutePath}`)
            }
          } catch (err) {
            error(`Failed to upload ${m.localPath}: ${err}`)
          }
        }

        if (results.length > 0) {
          await editor.edit((editBuilder) => {
            // Apply from bottom to top
            for (const res of results.reverse()) {
              editBuilder.replace(res.range, res.newText)
            }
          })
          info(`Successfully uploaded ${results.length} images.`)
        }
      }
    )
  }

  private isLocalPath(p: string): boolean {
    return !/^https?:\/\//.test(p) && !/^data:/.test(p)
  }

  private resolvePath(imagePath: string, docPath: string): string {
    if (path.isAbsolute(imagePath)) {
      return imagePath
    }
    return path.resolve(path.dirname(docPath), imagePath)
  }
}
