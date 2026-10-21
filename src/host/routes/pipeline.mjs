import { runPipeline } from '../../pipeline.mjs'
import { ok, bad, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/pipeline',
  async handle(req) {
    const body = await readJsonBody(req)
    if (!body?.opportunity) return bad('pipeline requires opportunity')
    return ok({ ...runPipeline(body) })
  },
}