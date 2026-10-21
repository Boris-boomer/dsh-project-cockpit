import { walkDirectory } from '../../engines/constellation.mjs'
import { ok, bad, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/scan',
  async handle(req) {
    const { rootPath } = await readJsonBody(req)
    if (typeof rootPath !== 'string' || !rootPath) return bad('scan requires a rootPath string')
    const files = await walkDirectory(rootPath)
    return ok({ files, count: files.length })
  },
}