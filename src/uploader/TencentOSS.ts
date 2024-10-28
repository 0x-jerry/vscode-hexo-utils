import cos from 'cos-nodejs-sdk-v5'
import path from 'node:path'
import fs from 'node:fs'
import type { TencentOSSOption } from '../configs'

export class TencentOSS {
  SecretId: string
  SecretKey: string
  Region: string
  Bucket: string

  constructor(opt: TencentOSSOption) {
    this.SecretId = opt.SecretId
    this.SecretKey = opt.SecretKey
    this.Region = opt.Region
    this.Bucket = opt.Bucket
  }

  async _upload(imgPath: string) {
    const COS = new cos({
      SecretId: this.SecretId,
      SecretKey: this.SecretKey,
    })

    const p = path.parse(imgPath)

    const respData = await COS.putObject({
      Bucket: this.Bucket,
      Region: this.Region,
      Key: `media/image/${p.base}`,
      Body: fs.createReadStream(imgPath),
    })

    return respData
  }

  async upload(imgPath: string): Promise<string> {
    const res = await this._upload(imgPath)

    return `https://${res.Location}`
  }
}
