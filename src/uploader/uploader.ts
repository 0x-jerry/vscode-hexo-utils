import { getConfig, ConfigProperties, UploadType } from '../configs'
import { ImgChr } from './Imgchr'
import { TencentOSS } from './TencentOSS'
import { CustomUploader } from './Custom'

export interface Uploader {
  upload(file: string): Promise<string>
}

export async function upload(filePath: string) {
  if (!getConfig(ConfigProperties.upload)) {
    return
  }

  const type = getConfig(ConfigProperties.uploadType)

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
