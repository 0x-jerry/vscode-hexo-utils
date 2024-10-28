import Axios, { AxiosError } from 'axios'
import FormData from 'form-data'
import { warn } from '../utils'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ImgChrOption } from '../configs'

const axios = Axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
    Accept: '*/*',
  },
})

const apiConfig = {
  root: 'https://imgtu.com',
  login: '/login',
  json: '/json',
}

const configPath = path.join(__dirname, 'imgchr.setting.json')

export class ImgChr {
  username: string
  password: string

  token: string
  cookies: Set<string>

  get cookie() {
    return Array.from(this.cookies).join(';')
  }

  constructor(opt: ImgChrOption) {
    this.username = opt.username
    this.password = opt.password
    this.token = ''
    this.cookies = new Set()
  }

  addCookie(cookie: string) {
    for (const n of cookie.split(';')) {
      this.cookies.add(n)
    }
  }

  async _updateConfig() {
    const res = await axios.get(apiConfig.root)
    const matched = /auth_token\s*=\s*"(\w+)"/.exec(res.data)

    this.token = matched?.[1] || ''

    this.addCookie(res.headers['set-cookie']?.[0] || '')
  }

  async _saveConfig() {
    const datastr = JSON.stringify({
      token: this.token,
      cookie: this.cookie,
      ts: new Date().getTime(),
    })

    await fs.writeFile(configPath, datastr)
  }

  /**
   *  Return false if config file is not exist
   */
  async _readConfig(): Promise<boolean> {
    try {
      const raw = await fs.readFile(configPath, { encoding: 'utf-8' })
      const data = JSON.parse(raw)

      // 30 minutes
      const expiredLength = 30 * 60 * 1000

      if (new Date().getTime() - data.ts > expiredLength) {
        return false
      }

      this.addCookie(data.cookie)
      this.token = data.token
    } catch (error) {
      return false
    }

    return true
  }

  async _login() {
    const form = new FormData()

    form.append('login-subject', this.username)
    form.append('password', this.password)
    form.append('auth_token', this.token)

    try {
      await axios.post(apiConfig.root + apiConfig.login, form, {
        // Get correct cookie: https://github.com/0x-jerry/vscode-hexo-utils/issues/33
        maxRedirects: 0,
        headers: {
          ...form.getHeaders(),
          'content-length': form.getLengthSync(),
          cookie: this.cookie,
        },
      })

      warn('Imgchr login failed.', 'Please check username and password')
      throw new Error('Imgchr login failed.')
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 301) {
        const cookie = err.response.headers['set-cookie']?.[0] || ''

        this.addCookie(cookie)

        await this._saveConfig()
      } else {
        warn('Imgchr login failed.', 'Please check username and password')
        throw new Error(String(err))
      }
    }
  }

  async _upload(imgPath: string) {
    const form = new FormData()

    form.append('type', 'file')
    form.append('action', 'upload')
    form.append('auth_token', this.token)
    form.append('timestamp', new Date().getTime())
    form.append('nsfw', 0)

    const p = path.parse(imgPath)
    const imgData = await fs.readFile(imgPath)

    form.append('source', imgData, p.base)

    return axios.post(apiConfig.root + apiConfig.json, form, {
      headers: {
        ...form.getHeaders(),
        'Content-Length': form.getLengthSync(),
        Cookie: this.cookie,
      },
    })
  }

  async upload(imgPath: string): Promise<string> {
    if (!(await this._readConfig())) {
      await this._updateConfig()
      await this._login()
    }

    const res = await this._upload(imgPath)

    return res.data.image.url
  }
}
