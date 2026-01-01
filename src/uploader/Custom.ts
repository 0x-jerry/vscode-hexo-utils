import Axios from 'axios'
import FormData from 'form-data'
import fs from 'node:fs'
import type { CustomUploadOption } from '../configs'

export class CustomUploader {
  constructor(private option: CustomUploadOption) {}

  async upload(filePath: string): Promise<string> {
    const {
      url,
      method = 'POST',
      headers = {},
      extraFormData = {},
      fileKey = 'file',
      urlPath = 'url',
    } = this.option

    const form = new FormData()

    for (const [key, value] of Object.entries(extraFormData)) {
      form.append(key, value)
    }

    form.append(fileKey, fs.createReadStream(filePath))

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

    // Extract URL from response based on urlPath
    // Simple implementation: if urlPath is 'data.url', it will look for data.url
    const keys = urlPath.split('.')
    let result = data
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key]
      } else {
        throw new Error(`Failed to extract URL from response using path: ${urlPath}`)
      }
    }

    if (typeof result !== 'string') {
      throw new Error(`Extracted URL is not a string: ${JSON.stringify(result)}`)
    }

    return result
  }
}
