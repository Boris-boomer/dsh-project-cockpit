import { analyze } from '../../engines/cost.mjs'
import { ok, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/cost',
  async handle(req) {
    const opts = await readJsonBody(req)
    const result = analyze(opts)
    return ok({ result })
  },
}