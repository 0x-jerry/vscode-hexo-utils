import Axios from 'axios';
import FormData from 'form-data';
import { warn } from '../utils';
import fs from 'fs-extra';
import path from 'path';

const axios = Axios.create();

axios.defaults.headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
  Accept: '*/*',
};

const apiConfig = {
  root: 'https://imgchr.com',
  login: '/login',
  json: '/json',
};

const configPath = path.join(__dirname, 'imgchr.setting.json');

export interface IImgChrOption {
  username: string;
  password: string;
}

export class ImgChr {
  username: string;
  password: string;

  token: string;
  cookie: string;

  constructor(opt: IImgChrOption) {
    this.username = opt.username;
    this.password = opt.password;
    this.cookie = '';
    this.token = '';
  }

  async _updateConfig() {
    const res = await axios.get(apiConfig.root);
    const matched = /auth_token\s*=\s*"(\w+)"/.exec(res.data)!;

    this.token = matched[1];

    this.cookie = res.headers['set-cookie'][0];
  }

  async _saveConfig() {
    const datastr = JSON.stringify({
      token: this.token,
      cookie: this.cookie,
      ts: new Date().getTime(),
    });

    await fs.writeFile(configPath, datastr);
  }

  /**
   *  Return false if config file is not exist
   */
  async _readConfig(): Promise<boolean> {
    try {
      const raw = await fs.readFile(configPath, { encoding: 'utf-8' });
      const data = JSON.parse(raw);

      // 30 minutes
      const expiredLength = 30 * 60 * 1000;

      if (new Date().getTime() - data.ts > expiredLength) {
        return false;
      }

      this.cookie = data.cookie;
      this.token = data.token;
    } catch (error) {
      return false;
    }

    return true;
  }

  async _login() {
    const form = new FormData();

    form.append('login-subject', this.username);
    form.append('password', this.password);
    form.append('auth_token', this.token);

    try {
      await axios.post(apiConfig.root + apiConfig.login, form, {
        headers: {
          ...form.getHeaders(),
          'content-length': form.getLengthSync(),
          cookie: this.cookie,
        },
      });

      await this._saveConfig();
    } catch (error) {
      warn('Imgchr login failed.', 'Please check username and password');
      throw new Error(error);
    }
  }

  async _upload(imgPath: string) {
    const form = new FormData();

    form.append('type', 'file');
    form.append('action', 'upload');
    form.append('auth_token', this.token);
    form.append('timestamp', new Date().getTime());
    form.append('nsfw', 0);

    const p = path.parse(imgPath);
    const imgData = await fs.readFile(imgPath);

    form.append('source', imgData, p.base);

    return axios.post(apiConfig.root + apiConfig.json, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync(),
        Cookie: this.cookie,
      },
    });
  }

  async upload(imgPath: string): Promise<string> {
    if (!(await this._readConfig())) {
      await this._updateConfig();
      await this._login();
    }

    const res = await this._upload(imgPath);

    return res.data.image.url;
  }
}
