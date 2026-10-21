import { validateCapabilityExtraction } from '../../engines/constellation.mjs'
import { ok, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/validate',
  async handle(req) {
    const { raw } = await readJsonBody(req)
    return ok({ ...validateCapabilityExtraction(raw) })
  },
}