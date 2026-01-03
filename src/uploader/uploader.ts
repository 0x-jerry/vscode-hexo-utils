import { ConfigProperties, getConfig, UploadType } from '../configs'
import { outputChannel } from '../utils'
import { CustomUploader } from './Custom'
import { ImgChr } from './Imgchr'
import { TencentOSS } from './TencentOSS'

export interface Uploader {
  upload(file: string): Promise<string>
}

export async function upload(filePath: string, force = false) {
  if (!force && !getConfig(ConfigProperties.upload)) {
    outputChannel.appendLine('[Uploader] Upload is disabled in settings. Skip.')
    return
  }

  const type = getConfig(ConfigProperties.uploadType)
  outputChannel.appendLine(`[Uploader] Start upload, type: ${type}, file: ${filePath}`)

  let uploader: Uploader | null = null

  switch (type) {
    case UploadType.imgchr:
      uploader = new ImgChr(getConfig(ConfigProperties.imgChr))
      break

    case UploadType.tencentoss:
      uploader = new TencentOSS(getConfig(ConfigProperties.tencentOSS))
      break

    case UploadType.custom:
      uploader = new CustomUploader(getConfig(ConfigProperties.customUpload))
      break

    default:
      break
  }

  if (uploader) {
    return await uploader.upload(filePath)
  }
}
