import * as cos from 'cos-nodejs-sdk-v5';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface TencentOSSOption {
  SecretId: string;
  SecretKey: string;
  Region: string;
  Bucket: string;
}

export class TencentOSS {
  SecretId: string;
  SecretKey: string;
  Region: string;
  Bucket: string;

  constructor(opt: TencentOSSOption) {
    this.SecretId = opt.SecretId;
    this.SecretKey = opt.SecretKey;
    this.Region = opt.Region;
    this.Bucket = opt.Bucket;
  }

  async _upload(imgPath: string): Promise<any> {
    const COS = new cos({
      SecretId: this.SecretId,
      SecretKey: this.SecretKey,
    });
    const p = path.parse(imgPath);
    let data = await new Promise((res, rej) => {
      COS.putObject({
        Bucket: this.Bucket,
        Region: this.Region,
        Key: 'media/image/' + p.base,
        Body: fs.createReadStream(imgPath),
      }, function(err: any, data: any) {
        if (err) {
          rej(err);
        } else {
          res(data);
        }
      });
    });

    return data;
  }

  async upload(imgPath: string): Promise<string> {
    const res = await this._upload(imgPath);

    return 'https://' + res.Location;
  }
}


// COS putObject Response
// {
//   Location: 'test-1252075447.cos.ap-beijing.myqcloud.com/test/testimage.png',
//   statusCode: 200,
//   headers: {
//     'content-length': '0',
//     connection: 'keep-alive',
//     date: 'Sun, 26 Apr 2020 12:54:55 GMT',
//     etag: '"06d9fc046d856a444d431a2787449051"',
//     server: 'tencent-cos',
//     'x-cos-hash-crc64ecma': '4896901443367865006',
//     'x-cos-request-id': 'NWVhNTg0OWNfYjRiOTJhMDlfMmZlZWJfZmMzYWM3'
//   },
//   ETag: '"06d9fc046d856a444d431a2787449051"'
// }

