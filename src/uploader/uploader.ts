import { getConfig, ConfigProperties } from '../configs';
import { ImgChr, IImgChrOption } from './Imgchr';

enum UploadType {
  imgchr = 'imgchr',
}

export interface Uploader {
  upload(file: string): Promise<string>;
}

export async function upload(filePath: string) {
  if (!getConfig<boolean>(ConfigProperties.upload)) {
    return;
  }

  const type = getConfig<UploadType>(ConfigProperties.uploadType);

  let uploader: Uploader | null = null;

  switch (type) {
    case UploadType.imgchr:
      uploader = new ImgChr(getConfig<IImgChrOption>(ConfigProperties.imgChr)!);
      break;

    default:
      break;
  }

  if (uploader) {
    return await uploader.upload(filePath);
  }
}
