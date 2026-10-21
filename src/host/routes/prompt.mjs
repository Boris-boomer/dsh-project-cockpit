import { buildCapabilityPrompt } from '../../engines/constellation.mjs'
import { ok, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/prompt',
  async handle(req) {
    const { project } = await readJsonBody(req)
    return ok({ prompt: buildCapabilityPrompt(project ?? {}) })
  },
}