import fs from 'node:fs'
import Axios from 'axios'
import FormData from 'form-data'
import type { CustomUploadOption } from '../configs'
import { outputChannel } from '../utils'

export class CustomUploader {
  constructor(private option: CustomUploadOption) {}

  async upload(filePath: string): Promise<string> {
    const {
      url,
      method = 'POST',
      headers = {},
      extraFormData = {},
      fileKey = 'file',
      responseUrlKey = 'url',
    } = this.option

    const form = new FormData()

    for (const [key, value] of Object.entries(extraFormData)) {
      form.append(key, value)
    }

    form.append(fileKey, fs.createReadStream(filePath))

    try {
      outputChannel.appendLine(`[CustomUploader] Uploading ${filePath} to ${url}`)
      const res = await Axios({
        url,
        method,
        headers: {
          ...headers,
          ...form.getHeaders(),
        },
        data: form,
      })

      const data = res.data
      outputChannel.appendLine(`[CustomUploader] Response: ${JSON.stringify(data)}`)

      // Extract URL from response based on responseUrlKey
      // Simple implementation: if responseUrlKey is 'data.url', it will look for data.url
      const keys = responseUrlKey.split('.')
      let result = data
      for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
          result = result[key]
        } else {
          throw new Error(`Failed to extract URL from response using path: ${responseUrlKey}`)
        }
      }

      if (typeof result !== 'string') {
        throw new Error(`Extracted URL is not a string: ${JSON.stringify(result)}`)
      }

      return result
    } catch (err: any) {
      if (err.response) {
        outputChannel.appendLine(
          `[CustomUploader] Error Response: ${err.response.status} ${JSON.stringify(err.response.data)}`,
        )
      } else {
        outputChannel.appendLine(`[CustomUploader] Error: ${err.message}`)
      }
      throw err
    }
  }
}
