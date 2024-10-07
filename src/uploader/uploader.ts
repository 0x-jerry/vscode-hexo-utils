import { getConfig, ConfigProperties } from '../configs'
import { ImgChr, type IImgChrOption } from './Imgchr'
import { TencentOSS, type TencentOSSOption } from './TencentOSS'

enum UploadType {
  imgchr = 'imgchr',
  tencentoss = 'tencentoss',
}

export interface Uploader {
  upload(file: string): Promise<string>
}

export async function upload(filePath: string) {
  if (!getConfig<boolean>(ConfigProperties.upload)) {
    return
  }

  const type = getConfig<UploadType>(ConfigProperties.uploadType)

  let uploader: Uploader | null = null

  switch (type) {
    case UploadType.imgchr:
      uploader = new ImgChr(getConfig<IImgChrOption>(ConfigProperties.imgChr))
      break

    case UploadType.tencentoss:
      uploader = new TencentOSS(getConfig<TencentOSSOption>(ConfigProperties.tencentOSS))
      break

    default:
      break
  }

  if (uploader) {
    return await uploader.upload(filePath)
  }
}
